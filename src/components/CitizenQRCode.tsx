import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Download, Share2, QrCode } from 'lucide-react';
import type { Citizen } from '@/lib/db';

interface CitizenQRCodeProps {
  citizen: Citizen | null;
  open: boolean;
  onClose: () => void;
}

export function CitizenQRCode({ citizen, open, onClose }: CitizenQRCodeProps) {
  if (!citizen) return null;

  // QR code contains citizen ID and basic info for verification
  const qrData = JSON.stringify({
    id: citizen.uniqueId,
    name: `${citizen.firstName} ${citizen.lastName}`,
    sex: citizen.sex,
    registered: citizen.createdAt.toISOString().split('T')[0],
  });

  const handleDownload = () => {
    const svg = document.getElementById('citizen-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;

      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(img, 50, 50, 300, 300);

        // Add text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(citizen.uniqueId, canvas.width / 2, 400);

        ctx.font = '16px Inter, sans-serif';
        ctx.fillText(`${citizen.firstName} ${citizen.lastName}`, canvas.width / 2, 430);

        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Citizen Registry', canvas.width / 2, 470);

        // Download
        const link = document.createElement('a');
        link.download = `citizen-${citizen.uniqueId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Citizen ID: ${citizen.uniqueId}`,
          text: `${citizen.firstName} ${citizen.lastName}\nID: ${citizen.uniqueId}`,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Citizen ID Card
          </DialogTitle>
          <DialogDescription>
            Scan this QR code to verify citizen identity
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-lg">
            <QRCodeSVG
              id="citizen-qr-code"
              value={qrData}
              size={200}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          {/* Citizen Info */}
          <div className="mt-4 text-center">
            <p className="text-lg font-bold text-slate-800">
              {citizen.uniqueId}
            </p>
            <p className="text-slate-600">
              {citizen.firstName} {citizen.lastName}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {citizen.sex === 'male' ? 'Male' : 'Female'} |
              {citizen.age ? ` ~${citizen.age} yrs` : citizen.dateOfBirth ? ` DOB: ${citizen.dateOfBirth.toLocaleDateString()}` : ''}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 w-full">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
            {'share' in navigator && (
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 border-t pt-3">
          <p>Registered: {citizen.createdAt.toLocaleDateString()}</p>
          {citizen.recorderName && <p>By: {citizen.recorderName}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
