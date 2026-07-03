// src/pages/supervisor/FaceRegisterButton.tsx
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, RefreshCw, Check, Loader2, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface FaceRegisterButtonProps {
  employeeId: string;
  employeeName: string;
  currentEmbeddingDim?: number;
}

export const FaceRegisterButton = ({ employeeId, employeeName, currentEmbeddingDim }: FaceRegisterButtonProps) => {
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsCameraReady(false);
      setCapturedImage(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraReady(true);
            setIsLoading(false);
          });
        };
      }
    } catch (err: any) {
      toast.error("Camera error: " + err.message);
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsCameraReady(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera();
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0) {
      toast.error("Camera not ready");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let brightness = 0;
    for (let i = 0; i < imageData.data.length; i += 16) {
      brightness += (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
    }
    brightness = brightness / (imageData.data.length / 16);

    if (brightness < 20) {
      toast.error("Photo too dark. Improve lighting and try again.");
      return;
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [isCameraReady, stopCamera, facingMode]);

  const handleRegister = async () => {
    if (!capturedImage) return;
    setIsRegistering(true);

    try {
      const blob = await fetch(capturedImage).then(r => r.blob());
      const file = new File([blob], `face_${employeeId}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('photo', file);

      const res = await axios.post(
        `${API_URL}/attendance/register-face/${employeeId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.data.success) {
        toast.success(`✅ Face registered for ${employeeName}`);
        setOpen(false);
        setCapturedImage(null);
      } else {
        toast.error(res.data.message || "Registration failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(startCamera, 200);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setOpen(false);
  };

  const isAlreadyNew = currentEmbeddingDim === 512;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="flex items-center gap-1 h-7 px-2 text-xs border-blue-200 hover:bg-blue-50 text-blue-700"
        title={isAlreadyNew ? "Re-register face" : "Old embedding — re-register required"}
      >
        <Camera className="h-3 w-3 flex-shrink-0" />
        <span className="whitespace-nowrap">
          {isAlreadyNew ? "Update Face" : "Register Face"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Face — {employeeName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}

              {!capturedImage && isCameraReady && (
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    onClick={switchCamera}
                    variant="outline"
                    size="sm"
                    className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!capturedImage && isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-56 border-2 border-green-400 rounded-full opacity-60" />
                </div>
              )}

              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  {capturedImage
                    ? "✅ Photo captured"
                    : isCameraReady
                    ? "👤 Position face in circle"
                    : "Starting camera..."}
                </span>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">📸 Tips for best results:</p>
              <p>• Good lighting — face should be clearly visible</p>
              <p>• Look directly at camera</p>
              <p>• No sunglasses or mask</p>
              <p>• Plain background preferred</p>
            </div>

            <div className="flex gap-2">
              {!capturedImage ? (
                <>
                  <Button
                    onClick={capturePhoto}
                    disabled={!isCameraReady || isLoading}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isCameraReady ? "Capture" : "Starting..."}
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isRegistering
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
                      : <><Check className="h-4 w-4 mr-2" /> Save Face</>
                    }
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setCapturedImage(null); startCamera(); }}
                    disabled={isRegistering}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Retake
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};