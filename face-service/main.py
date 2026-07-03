import os
import time
import hashlib
import numpy as np
import faiss
import pymongo
import cv2
import logging
from bson import ObjectId
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---------- Set model cache to /tmp for Render ----------
os.environ["INSIGHTFACE_HOME"] = "/tmp/.insightface"

# ---------- InsightFace — lightweight ONNX only ----------
try:
    from insightface.app import FaceAnalysis
    
    logger.info("🔄 Loading InsightFace model (buffalo_sc = fast/small)...")
    face_app = FaceAnalysis(
        name="buffalo_sc",
        root="/tmp/.insightface",
        providers=["CPUExecutionProvider"]
    )
    face_app.prepare(ctx_id=0, det_size=(320, 320))
    
    # Lower detection threshold for better face detection
    if hasattr(face_app, 'det_model'):
        face_app.det_model.set('det_thresh', 0.3)
    
    logger.info("✅ InsightFace ready")
    INSIGHTFACE_AVAILABLE = True
except Exception as e:
    logger.error(f"❌ InsightFace failed to load: {e}")
    INSIGHTFACE_AVAILABLE = False
    face_app = None

# ---------- MongoDB ----------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    mongo_client = pymongo.MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        tls=True,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True
    )
    mongo_client.admin.command("ping")
    db = mongo_client["mydatabase"]
    employees_collection = db["employees"]
    logger.info("✅ MongoDB connected")
except Exception as e:
    logger.error(f"❌ MongoDB: {e}")
    db = None
    employees_collection = None
    INSIGHTFACE_AVAILABLE = False

# ---------- FAISS Indexes ----------
# Supports BOTH 512-dim (InsightFace) AND 128-dim (legacy DeepFace)
face_index_512 = None
face_index_128 = None
employee_ids_512 = []
employee_ids_128 = []

def l2_normalize(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v)
    return v / (norm + 1e-6)

def decode_image(content: bytes):
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def get_embedding(img_bgr: np.ndarray):
    """Returns 512-dim normalised embedding or None."""
    if not INSIGHTFACE_AVAILABLE or face_app is None:
        return None
    
    try:
        faces = face_app.get(img_bgr)
        if not faces:
            return None
        
        # Pick largest face
        largest = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
        )
        emb = largest.embedding.astype(np.float32)
        return l2_normalize(emb)
    except Exception as e:
        logger.error(f"get_embedding error: {e}")
        return None

def load_embeddings():
    global face_index_512, face_index_128
    global employee_ids_512, employee_ids_128

    if employees_collection is None:
        logger.error("❌ No DB connection")
        return

    logger.info("🔄 Loading embeddings from MongoDB...")
    embs_512, ids_512 = [], []
    embs_128, ids_128 = [], []

    try:
        cursor = employees_collection.find(
            {"faceEmbeddings": {"$exists": True, "$ne": []}}
        )
        for emp in cursor:
            emp_id = str(emp["_id"])
            emp_name = emp.get("name", "Unknown")
            
            for emb_raw in emp.get("faceEmbeddings", []):
                try:
                    emb = np.array(emb_raw, dtype=np.float32)
                    dim = emb.shape[0]
                    
                    if dim == 512:
                        embs_512.append(l2_normalize(emb))
                        ids_512.append(emp_id)
                        logger.debug(f"📸 {emp_name}: 512-dim loaded")
                    elif dim == 128:
                        embs_128.append(l2_normalize(emb))
                        ids_128.append(emp_id)
                        logger.debug(f"📸 {emp_name}: 128-dim legacy loaded")
                    else:
                        logger.warning(f"⚠️ Unknown dim {dim} for {emp_name}")
                except Exception as e:
                    logger.warning(f"Bad embedding: {e}")

        # Build 512 index
        if embs_512:
            matrix = np.vstack(embs_512).astype(np.float32)
            idx = faiss.IndexFlatIP(512)
            idx.add(matrix)
            face_index_512 = idx
            employee_ids_512 = ids_512
            logger.info(f"✅ InsightFace index: {len(ids_512)} embeddings")
        else:
            face_index_512 = None
            employee_ids_512 = []
            logger.info("ℹ️ No 512-dim embeddings yet")

        # Build 128 index (legacy)
        if embs_128:
            matrix = np.vstack(embs_128).astype(np.float32)
            idx = faiss.IndexFlatIP(128)
            idx.add(matrix)
            face_index_128 = idx
            employee_ids_128 = ids_128
            logger.info(f"✅ Legacy index: {len(ids_128)} embeddings (DeepFace)")
        else:
            face_index_128 = None
            employee_ids_128 = []

    except Exception as e:
        logger.error(f"load_embeddings error: {e}")

load_embeddings()

# ---------- Health Endpoint ----------
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "insightface_available": INSIGHTFACE_AVAILABLE,
        "insightface_embeddings": len(employee_ids_512),
        "legacy_embeddings": len(employee_ids_128),
        "mongodb_connected": db is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    return {
        "service": "Face Recognition — InsightFace ONNX",
        "insightface_available": INSIGHTFACE_AVAILABLE,
        "insightface_embeddings": len(employee_ids_512),
        "legacy_embeddings": len(employee_ids_128),
        "timestamp": datetime.now().isoformat()
    }

# ---------- Register Employee ----------
@app.post("/embedding")
async def register_embedding(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Empty file"}
            )

        img = decode_image(content)
        if img is None:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Cannot decode image"}
            )

        emb = get_embedding(img)
        if emb is None:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "No face detected. Ensure good lighting and face the camera."
                }
            )

        return {"success": True, "embedding": emb.tolist()}

    except Exception as e:
        logger.error(f"/embedding error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )

# ---------- Reload ----------
@app.post("/reload")
async def reload():
    load_embeddings()
    return {
        "success": True,
        "insightface": len(employee_ids_512),
        "legacy": len(employee_ids_128)
    }

# ---------- Match ----------
@app.post("/match")
async def match_face(
    file: UploadFile = File(...),
    siteName: str = Form(None)
):
    try:
        has_512 = face_index_512 is not None and len(employee_ids_512) > 0
        has_128 = face_index_128 is not None and len(employee_ids_128) > 0

        if not has_512 and not has_128:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "No registered faces in database"}
            )

        content = await file.read()
        if not content:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Empty file"}
            )

        img = decode_image(content)
        if img is None:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Cannot decode image"}
            )

        # Brightness check
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray)
        if avg_brightness < 15:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Photo too dark. Improve lighting."}
            )

        matched_id = None
        best_score = 0.0

        # ── Try InsightFace 512-dim ──
        if has_512:
            emb = get_embedding(img)
            if emb is not None:
                q = emb.reshape(1, -1).astype(np.float32)
                scores, indices = face_index_512.search(q, k=1)
                score = float(scores[0][0])
                logger.info(f"🔍 InsightFace score: {score:.4f}")

                if score >= 0.35:
                    matched_id = employee_ids_512[int(indices[0][0])]
                    best_score = score
                    logger.info(f"✅ Matched via InsightFace: {matched_id}")

        # ── Fallback to legacy 128-dim ──
        if matched_id is None and has_128:
            logger.info("⚠️ Trying legacy 128-dim index...")
            emb = get_embedding(img)
            if emb is not None:
                emb_128 = l2_normalize(emb[:128])
                q = emb_128.reshape(1, -1).astype(np.float32)
                scores, indices = face_index_128.search(q, k=1)
                score = float(scores[0][0])
                logger.info(f"🔍 Legacy score: {score:.4f}")

                if score >= 0.55:
                    matched_id = employee_ids_128[int(indices[0][0])]
                    best_score = score
                    logger.info(f"✅ Matched via legacy: {matched_id}")

        if not matched_id:
            return {
                "success": False,
                "message": f"Face not recognised (score: {best_score:.3f})"
            }

        # Fetch employee
        try:
            obj_id = ObjectId(matched_id)
        except Exception:
            obj_id = matched_id

        if siteName:
            emp_check = employees_collection.find_one(
                {"_id": obj_id, "siteName": siteName}
            )
            if not emp_check:
                return {
                    "success": False,
                    "message": f"Employee not assigned to site: {siteName}"
                }

        employee = employees_collection.find_one({"_id": obj_id})
        if not employee:
            return {"success": False, "message": "Employee not found"}

        return {
            "success": True,
            "data": {
                "employeeId": matched_id,
                "employeeName": employee.get("name", "Unknown"),
                "confidence": round(best_score, 3)
            }
        }

    except Exception as e:
        logger.error(f"/match error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000))
    )