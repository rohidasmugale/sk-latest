import os
import io
import tempfile
import time
import hashlib
import asyncio
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import faiss
import pymongo
from bson import ObjectId
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime
import cv2
import insightface
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------- Thread Pool for Parallel Processing ----------
executor = ThreadPoolExecutor(max_workers=4)

# ---------- Cache for Faster Duplicate Matches ----------
match_cache = {}
CACHE_TTL = 60  # 60 seconds

# ---------- InsightFace Setup (Faster & More Accurate) ----------
logger.info("🔄 Loading InsightFace model...")
face_app = FaceAnalysis(
    name="buffalo_l",           # Best accuracy model
    providers=["CPUExecutionProvider"]
)
face_app.prepare(ctx_id=0, det_size=(640, 640))  # 640x640 for better accuracy
logger.info("✅ InsightFace loaded")

# ---------- MongoDB ----------
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://pts_db_user:Admin%4012345@cluster0.w0ns4qg.mongodb.net/mydatabase?retryWrites=true&w=majority")
try:
    client = pymongo.MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        tls=True,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True
    )
    client.admin.command("ping")
    db = client["mydatabase"]
    employees_collection = db["employees"]
    logger.info("✅ MongoDB connected")
except Exception as e:
    logger.error(f"❌ MongoDB: {e}")
    db = None
    employees_collection = None


# Index B: DeepFace/Facenet 128-dim (existing - no re-registration needed!)
face_index_512 = None
face_index_128 = None
employee_ids_512 = []
employee_ids_128 = []

def l2_normalize(v: np.ndarray) -> np.ndarray:
    return v / (np.linalg.norm(v) + 1e-6)

def decode_image(content: bytes) -> np.ndarray:
    nparr = np.frombuffer(content, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def get_insightface_embedding(img_bgr: np.ndarray):
    """Return 512-dim L2-normalised embedding or None."""
    faces = face_app.get(img_bgr)
    if not faces:
        return None
    # Use largest face
    largest = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
    emb = largest.embedding.astype(np.float32)
    return l2_normalize(emb)

def load_embeddings():
    global face_index_512, face_index_128
    global employee_ids_512, employee_ids_128

    if employees_collection is None:
        logger.error("❌ No database connection")
        return

    logger.info("🔄 Loading embeddings from MongoDB...")
    embs_512, ids_512 = [], []
    embs_128, ids_128 = [], []

    try:
        for emp in employees_collection.find(
            {"faceEmbeddings": {"$exists": True, "$ne": []}}
        ):
            emp_id = str(emp["_id"])
            emp_name = emp.get("name", "Unknown")
            
            for emb_raw in emp.get("faceEmbeddings", []):
                emb = np.array(emb_raw, dtype=np.float32)
                dim = emb.shape[0]

                if dim == 512:
                    embs_512.append(l2_normalize(emb))
                    ids_512.append(emp_id)
                    logger.debug(f"📸 {emp_name}: 512-dim embedding loaded")
                elif dim == 128:
                    # Legacy DeepFace embeddings - still work!
                    embs_128.append(l2_normalize(emb))
                    ids_128.append(emp_id)
                    logger.debug(f"📸 {emp_name}: 128-dim legacy embedding loaded")
                else:
                    logger.warning(f"⚠️ Unknown embedding dim {dim} for {emp_name}")

        # Build 512 index (InsightFace)
        if embs_512:
            matrix = np.vstack(embs_512).astype(np.float32)
            idx = faiss.IndexFlatIP(512)  # Inner Product = Cosine (L2-normalized)
            idx.add(matrix)
            face_index_512 = idx
            employee_ids_512 = ids_512
            logger.info(f"✅ 512-dim index: {len(ids_512)} embeddings (InsightFace)")
        else:
            face_index_512 = None
            employee_ids_512 = []

        # Build 128 index (DeepFace legacy)
        if embs_128:
            matrix = np.vstack(embs_128).astype(np.float32)
            idx = faiss.IndexFlatIP(128)
            idx.add(matrix)
            face_index_128 = idx
            employee_ids_128 = ids_128
            logger.info(f"✅ 128-dim index: {len(ids_128)} embeddings (DeepFace legacy)")
        else:
            face_index_128 = None
            employee_ids_128 = []

    except Exception as e:
        logger.error(f"❌ load_embeddings error: {e}")
        face_index_512 = None
        face_index_128 = None

load_embeddings()

# ---------- Health Endpoint ----------
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "insightface_embeddings": len(employee_ids_512),
        "legacy_deepface_embeddings": len(employee_ids_128),
        "mongodb_connected": db is not None,
        "timestamp": datetime.now().isoformat()
    }

# ---------- Register New Employee (InsightFace 512-dim) ----------
@app.post("/embedding")
async def get_face_embedding(file: UploadFile = File(...)):
    """Registration endpoint - generates InsightFace 512-dim embedding."""
    try:
        content = await file.read()
        if not content:
            return JSONResponse(status_code=400, content={"success": False, "message": "Empty file"})

        img = decode_image(content)
        if img is None:
            return JSONResponse(status_code=400, content={"success": False, "message": "Cannot decode image"})

        emb = get_insightface_embedding(img)
        if emb is None:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "No face detected. Use good lighting and face the camera directly."}
            )

        logger.info(f"✅ New embedding generated — dim: {len(emb)}")
        return {"success": True, "embedding": emb.tolist()}

    except Exception as e:
        logger.error(f"❌ /embedding error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})

# ---------- Reload Embeddings ----------
@app.post("/reload")
async def reload():
    load_embeddings()
    return {
        "success": True,
        "insightface": len(employee_ids_512),
        "legacy": len(employee_ids_128),
        "message": f"Loaded {len(employee_ids_512) + len(employee_ids_128)} total embeddings"
    }

# ---------- OPTIMIZED Instant Match for Attendance ----------
@app.post("/match")
async def match_face(
    file: UploadFile = File(...),
    siteName: str = Form(None)
):
    """
    OPTIMIZED match endpoint with:
    - Image caching (prevents duplicate processing)
    - Parallel embedding generation
    - Dual-index support (512-dim InsightFace + 128-dim legacy)
    - Brightness check
    """
    start_time = time.time()
    
    try:
        # Read file once
        content = await file.read()
        if not content:
            return JSONResponse(
                status_code=400, 
                content={"success": False, "message": "Empty file"}
            )

        # Generate cache key from image hash (prevents duplicate processing)
        img_hash = hashlib.md5(content).hexdigest()
        cache_key = f"{img_hash}_{siteName}"
        
        # Check cache first
        if cache_key in match_cache:
            cached_result, timestamp = match_cache[cache_key]
            if time.time() - timestamp < CACHE_TTL:
                logger.info(f"✅ Cache hit for {cache_key} (took {(time.time() - start_time)*1000:.0f}ms)")
                return cached_result

        # Decode image
        img = decode_image(content)
        if img is None:
            return JSONResponse(
                status_code=400, 
                content={"success": False, "message": "Cannot decode image"}
            )

        # Quick brightness check (fast using numpy)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray)
        if avg_brightness < 15:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Photo too dark. Improve lighting."}
            )

        has_512 = face_index_512 is not None and len(employee_ids_512) > 0
        has_128 = face_index_128 is not None and len(employee_ids_128) > 0

        if not has_512 and not has_128:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "No registered faces in database"}
            )

        matched_id = None
        best_score = 0.0
        THRESHOLD = 0.4  # InsightFace cosine similarity threshold

        # ---- PARALLEL: Run embedding generation in thread pool ----
        loop = asyncio.get_event_loop()
        
        # Run InsightFace embedding in thread pool (non-blocking)
        emb_512 = await loop.run_in_executor(
            executor, 
            get_insightface_embedding, 
            img
        )

        # ---- TRY 1: InsightFace (Fast & Accurate) ----
        if has_512 and emb_512 is not None:
            q = emb_512.reshape(1, -1).astype(np.float32)
            scores, indices = face_index_512.search(q, k=1)
            score = float(scores[0][0])
            logger.info(f"🔍 InsightFace similarity: {score:.4f}")
            
            if score >= THRESHOLD:
                matched_id = employee_ids_512[int(indices[0][0])]
                best_score = score
                logger.info(f"✅ Matched via InsightFace: {matched_id} (score: {score:.4f})")

        # ---- TRY 2: DeepFace Legacy (if InsightFace didn't match) ----
        if matched_id is None and has_128:
            logger.info("🔄 Trying legacy DeepFace embeddings...")
            try:
                from deepface import DeepFace
                import os as _os
                
                # Save to temp file for DeepFace (run in thread pool)
                async def run_deepface_async():
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                        tmp.write(content)
                        tmp_path = tmp.name
                    
                    try:
                        result = DeepFace.represent(
                            img_path=tmp_path,
                            model_name="Facenet",
                            enforce_detection=False,
                            detector_backend="opencv"
                        )
                        return result, tmp_path
                    except Exception as e:
                        logger.warning(f"DeepFace processing error: {e}")
                        return None, tmp_path
                
                result, tmp_path = await loop.run_in_executor(executor, run_deepface_async)
                
                # Clean up temp file
                try:
                    _os.unlink(tmp_path)
                except:
                    pass
                
                if result:
                    emb_128 = np.array(result[0]["embedding"], dtype=np.float32)
                    emb_128 = l2_normalize(emb_128)
                    
                    q = emb_128.reshape(1, -1).astype(np.float32)
                    scores, indices = face_index_128.search(q, k=1)
                    score = float(scores[0][0])
                    logger.info(f"🔍 DeepFace legacy similarity: {score:.4f}")
                    
                    if score >= 0.6:  # Higher threshold for legacy
                        matched_id = employee_ids_128[int(indices[0][0])]
                        best_score = score
                        logger.info(f"✅ Matched via DeepFace: {matched_id} (score: {score:.4f})")
                        
            except ImportError:
                logger.warning("⚠️ DeepFace not installed - skipping legacy fallback")
            except Exception as e:
                logger.warning(f"⚠️ DeepFace fallback failed: {e}")

        # No match found
        if not matched_id:
            elapsed = (time.time() - start_time) * 1000
            return {
                "success": False,
                "message": f"Face not matched (best score: {best_score:.3f})",
                "processing_ms": round(elapsed, 1)
            }

        # Fetch employee details (with projection for speed)
        try:
            obj_id = ObjectId(matched_id)
        except Exception:
            obj_id = matched_id

        # Check site assignment if provided
        if siteName:
            emp_check = employees_collection.find_one(
                {"_id": obj_id, "siteName": siteName},
                {"_id": 1}  # Only check existence
            )
            if not emp_check:
                return {
                    "success": False,
                    "message": f"Employee not assigned to site: {siteName}"
                }

        # Fetch only needed fields
        employee = employees_collection.find_one(
            {"_id": obj_id},
            {"name": 1, "employeeId": 1}  # Only fetch what we need
        )
        
        if not employee:
            return {"success": False, "message": "Employee not found in database"}

        # ✅ Instant success!
        result = {
            "success": True,
            "data": {
                "employeeId": matched_id,
                "employeeName": employee.get("name", "Unknown"),
                "confidence": round(best_score, 3)
            }
        }
        
        # Cache the result
        match_cache[cache_key] = (result, time.time())
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"✅ Match completed in {elapsed:.0f}ms")
        
        return result

    except Exception as e:
        logger.error(f"❌ /match error: {e}")
        return JSONResponse(
            status_code=500, 
            content={"success": False, "message": str(e)}
        )

@app.get("/")
async def root():
    return {
        "service": "Face Recognition — InsightFace + DeepFace Legacy",
        "insightface_embeddings": len(employee_ids_512),
        "legacy_deepface_embeddings": len(employee_ids_128),
        "total_embeddings": len(employee_ids_512) + len(employee_ids_128),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))