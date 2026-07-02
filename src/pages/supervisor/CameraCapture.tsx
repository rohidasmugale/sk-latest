// components/CameraCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Camera, RefreshCw, Check, X, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (photoFile: File) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  continuous?: boolean;
  onAutoCapture?: (photoFile: File) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  open,
  onOpenChange,
  onCapture,
  title = "Take Photo",
  description = "Take a photo for attendance verification",
  actionLabel = "Use Photo",
  continuous = false,
  onAutoCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // ✅ Add capture counter to prevent infinite auto-capture
  const [captureCount, setCaptureCount] = useState(0);
  const MAX_CAPTURES = 10; // Stop after 10 captures

  // Stop all tracks in the stream
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!open) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setIsCameraReady(false);
      
      // Stop any existing stream first
      stopCameraTracks();
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      console.log('Starting camera with facing mode:', facingMode);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing successfully');
                setIsCameraReady(true);
                setIsLoading(false);
                // Reset capture count when camera starts
                setCaptureCount(0);
              })
              .catch((err) => {
                console.error('Error playing video:', err);
                setError('Failed to start video playback');
                setIsLoading(false);
              });
          }
        };
        
        videoRef.current.onerror = () => {
          console.error('Video error');
          setError('Video error occurred');
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);
      setIsCameraReady(false);
      
      // Handle specific errors
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application.');
      } else if (err.name === 'OverconstrainedError') {
        // Try without facing mode constraint
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsCameraReady(true);
              setIsLoading(false);
            };
          }
          setError(null);
        } catch (fallbackErr) {
          setError('Unable to access camera. Please check your camera settings.');
        }
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
    }
  }, [open, facingMode, stopCameraTracks]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    // Camera will restart automatically due to useEffect
  }, [facingMode]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      toast.error('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Wait for valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera is not ready yet. Please wait.');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image as data URL with high quality
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Convert data URL to File
      try {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

        if (continuous) {
          onCapture(file);
          setCapturedImage(null);
          // Ensure camera is still running
          if (!streamRef.current || !isCameraReady) {
            startCamera();
          }
        } else {
          // Standard mode: show preview and wait for user action
          setCapturedImage(imageDataUrl);
          stopCameraTracks();
          setIsCameraReady(false);
        }
      } catch (err) {
        console.error('Error processing photo:', err);
        toast.error('Failed to process photo');
      }
    } else {
      toast.error('Failed to capture photo');
    }
  }, [isCameraReady, continuous, onCapture, startCamera, stopCameraTracks]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    // Restart camera
    startCamera();
  }, [startCamera]);

  // Use captured photo
  const usePhoto = useCallback(async () => {
    if (capturedImage) {
      try {
        // Convert base64 to blob
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `attendance_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      } catch (err) {
        console.error('Error converting photo:', err);
        toast.error('Failed to process photo');
      }
    }
  }, [capturedImage, onCapture]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopCameraTracks();
    setCapturedImage(null);
    setError(null);
    setIsLoading(true);
    setIsCameraReady(false);
    setCaptureCount(0); // ✅ Reset capture count on close
    onOpenChange(false);
  }, [stopCameraTracks, onOpenChange]);

  // Start/stop camera when dialog opens/closes or facing mode changes
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      stopCameraTracks();
      setCapturedImage(null);
      setError(null);
      setIsLoading(true);
      setIsCameraReady(false);
      setCaptureCount(0); // ✅ Reset capture count when closed
    }
    
    return () => {
      stopCameraTracks();
    };
  }, [open, facingMode, startCamera, stopCameraTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  // ✅ Auto-capture effect with max capture limit
  useEffect(() => {
    if (!open || !isCameraReady || !continuous) return;

    console.log('📷 Auto-capture started, max captures:', MAX_CAPTURES);

    const captureInterval = setInterval(() => {
      // ✅ Stop after max captures
      if (captureCount >= MAX_CAPTURES) {
        console.log('📷 Max captures reached, stopping auto-capture');
        clearInterval(captureInterval);
        toast.info(`Auto-capture completed (${MAX_CAPTURES} captures)`);
        return;
      }

      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Brightness check - prevent black photos
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let totalBrightness = 0;
      const step = 16;
      for (let i = 0; i < pixels.length; i += step * 4) {
        totalBrightness += (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
      }
      const avgBrightness = totalBrightness / (pixels.length / (step * 4));
      
      // Skip dark frames
      if (avgBrightness < 8) {
        console.log('📷 Skipping dark frame, brightness:', avgBrightness.toFixed(1));
        return;
      }

      console.log(`📷 Capturing frame ${captureCount + 1}/${MAX_CAPTURES}, brightness:`, avgBrightness.toFixed(1));

      // ✅ FIX: Increase quality to 0.95
      canvas.toBlob((blob) => {
        if (blob && onAutoCapture) {
          const file = new File([blob], `auto_${Date.now()}.jpg`, { type: 'image/jpeg' });
          console.log('📷 Auto-captured frame', { 
            captureNumber: captureCount + 1, 
            size: blob.size, 
            brightness: avgBrightness.toFixed(1) 
          });
          onAutoCapture(file);
          setCaptureCount(prev => prev + 1); // ✅ Increment counter
        }
      }, 'image/jpeg', 0.95);

    }, 2000);

    return () => {
      clearInterval(captureInterval);
      console.log('📷 Auto-capture stopped');
    };
  }, [open, isCameraReady, continuous, onAutoCapture, captureCount]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isLoading && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
          
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              
              {isCameraReady && !error && !isLoading && (
                <>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black shadow-lg"
                    >
                      <Camera className="h-8 w-8" />
                    </Button>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={switchCamera}
                      variant="outline"
                      size="sm"
                      className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Switch
                    </Button>
                  </div>

                  {/* ✅ Show capture count in continuous mode */}
                  {continuous && (
                    <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                      {captureCount}/{MAX_CAPTURES}
                    </div>
                  )}
                </>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-20">
                  <div className="text-center text-white p-6 max-w-sm">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                    <p className="mb-4 font-medium">{error}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button onClick={startCamera} variant="outline" className="text-white border-white">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                      <Button onClick={handleClose} variant="ghost" className="text-white">
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-12 h-12 bg-white hover:bg-gray-100 shadow-lg"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  onClick={usePhoto}
                  size="lg"
                  className="rounded-full w-12 h-12 bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {capturedImage && (
            <Button onClick={usePhoto}>
              <Check className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;