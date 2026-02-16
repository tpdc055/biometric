import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Check, Fingerprint, RotateCcw, User, X, Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  mode: "photo" | "fingerprint";
}

export function CameraCapture({
  open,
  onClose,
  onCapture,
  mode,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [showTips, setShowTips] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === "photo" ? "user" : facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Unable to access camera. Please grant camera permissions.");
    }
  }, [facingMode, mode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera();
      setShowTips(true);
    } else {
      stopCamera();
      setCapturedImage(null);
    }

    return () => {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  }, [open]);

  const toggleCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Unable to switch camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {mode === "photo" ? (
              <>
                <User className="w-5 h-5 text-emerald-600" />
                Capture Photo
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                Capture Fingerprint
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tips for fingerprint capture */}
        {mode === "fingerprint" && showTips && !capturedImage && (
          <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">Tips for best results:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Use rear camera for better quality</li>
                  <li>Hold finger 5-10cm from camera</li>
                  <li>Ensure good lighting</li>
                  <li>Keep finger flat and steady</li>
                </ul>
              </div>
            </div>
            <button
              className="mt-2 text-xs text-amber-600 underline"
              onClick={() => setShowTips(false)}
            >
              Hide tips
            </button>
          </div>
        )}

        <div className="relative bg-black aspect-[4/3]">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
              <p>{error}</p>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Photo overlay guide */}
              {mode === "photo" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 border-4 border-white/60 rounded-full shadow-lg">
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1 rounded-full whitespace-nowrap">
                      Position face in oval
                    </div>
                  </div>
                </div>
              )}
              {/* Enhanced fingerprint overlay guide */}
              {mode === "fingerprint" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Animated scanning effect */}
                  <div className="relative">
                    {/* Main fingerprint box */}
                    <div className="w-36 h-48 border-4 border-emerald-400 rounded-2xl flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                      {/* Fingerprint icon with pulse animation */}
                      <div className="relative">
                        <Fingerprint className="w-20 h-20 text-emerald-400" />
                        <div className="absolute inset-0 animate-ping">
                          <Fingerprint className="w-20 h-20 text-emerald-400/30" />
                        </div>
                      </div>

                      {/* Scanning line animation */}
                      <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-xl">
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" />
                      </div>
                    </div>

                    {/* Corner markers */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg" />

                    {/* Instruction text */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-xs bg-emerald-600/90 px-4 py-1.5 rounded-full whitespace-nowrap font-medium">
                      Place finger here
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex justify-center gap-3">
          {capturedImage ? (
            <>
              <Button variant="outline" onClick={retake}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button onClick={confirmCapture}>
                <Check className="w-4 h-4 mr-2" />
                Use {mode === "photo" ? "Photo" : "Fingerprint"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              {mode === "fingerprint" && (
                <Button variant="secondary" onClick={toggleCamera} title="Switch camera">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={capturePhoto} disabled={!!error} className="min-w-[100px]">
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
