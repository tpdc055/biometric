import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  PenLine,
  RotateCcw,
  Check,
  X,
  Smartphone,
} from "lucide-react";

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (signatureData: string) => void;
  signerName?: string;
}

interface Point {
  x: number;
  y: number;
}

export function SignatureCapture({ open, onClose, onCapture, signerName }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    // Set canvas size based on container
    const rect = container.getBoundingClientRect();
    const width = rect.width - 32; // padding
    const height = Math.min(200, window.innerHeight * 0.25);

    setCanvasSize({ width, height });
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw signature line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, height - 40);
      ctx.lineTo(width - 20, height - 40);
      ctx.stroke();

      // Reset stroke style for signature
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
    }

    setHasSignature(false);
  }, [open]);

  // Get point from event
  const getPoint = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Draw line between points
  const drawLine = useCallback((from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  // Start drawing
  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    setIsDrawing(true);
    setLastPoint(point);
    setHasSignature(true);
  }, [getPoint]);

  // Continue drawing
  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !lastPoint) return;
    e.preventDefault();

    const point = getPoint(e);
    drawLine(lastPoint, point);
    setLastPoint(point);
  }, [isDrawing, lastPoint, getPoint, drawLine]);

  // Stop drawing
  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const width = canvasSize.width;
    const height = canvasSize.height;

    // Clear and redraw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Redraw signature line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();

    // Reset stroke style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;

    setHasSignature(false);
  }, [canvasSize]);

  // Save signature
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a trimmed version
    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
    onClose();
  }, [onCapture, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-emerald-600" />
            Capture Signature
          </DialogTitle>
          <DialogDescription>
            {signerName ? (
              <>Signature of <strong>{signerName}</strong></>
            ) : (
              "Sign in the box below to confirm consent"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Instructions */}
          <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
            <Smartphone className="w-4 h-4" />
            <span>Use your finger or stylus to sign</span>
          </div>

          {/* Canvas container */}
          <div className="relative rounded-xl border-2 border-slate-200 bg-white p-4 touch-none">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair touch-none"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />

            {/* Signature label */}
            <div className="absolute bottom-6 left-8 text-xs text-slate-400 pointer-events-none">
              Sign above the line
            </div>

            {/* Status badge */}
            {hasSignature && (
              <Badge
                variant="outline"
                className="absolute top-2 right-2 bg-white text-emerald-600 border-emerald-200"
              >
                <Check className="w-3 h-3 mr-1" />
                Signed
              </Badge>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-slate-500 mt-2 text-center">
            {new Date().toLocaleString()}
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={clearCanvas}
            disabled={!hasSignature}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasSignature}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Signature display component
interface SignatureDisplayProps {
  signatureData: string;
  signerName?: string;
  timestamp?: Date;
  onClear?: () => void;
  compact?: boolean;
}

export function SignatureDisplay({
  signatureData,
  signerName,
  timestamp,
  onClear,
  compact = false
}: SignatureDisplayProps) {
  if (!signatureData) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
        <img
          src={signatureData}
          alt="Signature"
          className="h-8 object-contain"
        />
        <Check className="w-4 h-4 text-emerald-600" />
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-auto"
            onClick={onClear}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-200">
            <Check className="w-3 h-3 mr-1" />
            Signature Captured
          </Badge>
        </div>
        {onClear && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg p-3 border border-emerald-200">
        <img
          src={signatureData}
          alt="Signature"
          className="max-h-24 mx-auto object-contain"
        />
      </div>

      <div className="mt-2 text-xs text-emerald-700 text-center">
        {signerName && <span className="font-medium">{signerName}</span>}
        {signerName && timestamp && " • "}
        {timestamp && <span>{timestamp.toLocaleString()}</span>}
      </div>
    </div>
  );
}
