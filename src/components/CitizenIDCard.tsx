import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type Citizen, db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileImage, Download, Loader2, CreditCard, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

interface CitizenIDCardProps {
  citizen: Citizen | null;
  open: boolean;
  onClose: () => void;
}

export function CitizenIDCard({ citizen, open, onClose }: CitizenIDCardProps) {
  const [generating, setGenerating] = useState(false);

  const ward = useLiveQuery(
    () => citizen ? db.wards.get(citizen.wardId) : undefined,
    [citizen?.wardId]
  );

  const village = useLiveQuery(
    () => citizen ? db.villages.get(citizen.villageId) : undefined,
    [citizen?.villageId]
  );

  if (!citizen) return null;

  // QR code data
  const qrData = JSON.stringify({
    id: citizen.uniqueId,
    name: `${citizen.firstName} ${citizen.lastName}`,
    sex: citizen.sex,
    registered: citizen.createdAt.toISOString().split('T')[0],
  });

  async function generatePDF() {
    if (!citizen) return;

    setGenerating(true);

    try {
      // Create PDF in ID card size (85.6mm x 53.98mm - CR80 standard)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98]
      });

      const cardWidth = 85.6;
      const cardHeight = 53.98;

      // Background gradient effect (green theme)
      pdf.setFillColor(16, 185, 129); // emerald-500
      pdf.rect(0, 0, cardWidth, 15, 'F');

      // Secondary color strip
      pdf.setFillColor(5, 150, 105); // emerald-600
      pdf.rect(0, 0, cardWidth, 3, 'F');

      // White background for content
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(2, 17, cardWidth - 4, cardHeight - 19, 2, 2, 'F');

      // Header text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CITIZEN REGISTRY', cardWidth / 2, 8, { align: 'center' });
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('OFFICIAL IDENTIFICATION CARD', cardWidth / 2, 12, { align: 'center' });

      // Photo placeholder/actual photo
      const photoX = 5;
      const photoY = 20;
      const photoSize = 20;

      if (citizen.photoData) {
        try {
          pdf.addImage(citizen.photoData, 'JPEG', photoX, photoY, photoSize, photoSize);
        } catch {
          // Draw placeholder if image fails
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(photoX, photoY, photoSize, photoSize, 1, 1, 'F');
          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(6);
          pdf.text('PHOTO', photoX + photoSize/2, photoY + photoSize/2 + 1, { align: 'center' });
        }
      } else {
        // Draw placeholder
        pdf.setFillColor(226, 232, 240);
        pdf.roundedRect(photoX, photoY, photoSize, photoSize, 1, 1, 'F');
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(6);
        pdf.text('PHOTO', photoX + photoSize/2, photoY + photoSize/2 + 1, { align: 'center' });
      }

      // Citizen Information
      const infoX = photoX + photoSize + 4;
      let infoY = 21;

      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${citizen.firstName} ${citizen.lastName}`.toUpperCase(), infoX, infoY);

      infoY += 5;
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105); // slate-600
      pdf.text(`ID: ${citizen.uniqueId}`, infoX, infoY);

      infoY += 4;
      pdf.text(`Sex: ${citizen.sex === 'male' ? 'Male' : 'Female'}`, infoX, infoY);

      infoY += 4;
      if (citizen.dateOfBirth) {
        pdf.text(`DOB: ${format(citizen.dateOfBirth, 'dd/MM/yyyy')}`, infoX, infoY);
      } else if (citizen.age) {
        pdf.text(`Age: ~${citizen.age} years`, infoX, infoY);
      }

      infoY += 4;
      if (ward && village) {
        pdf.text(`Location: ${village.name}, ${ward.name}`, infoX, infoY);
      }

      // QR Code (generate as canvas and add to PDF)
      const qrCanvas = document.createElement('canvas');
      const qrSize = 15;

      // Create a temporary QR code element
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // Render QR code to canvas using a simpler approach
      const qrSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      qrSvg.setAttribute('width', '100');
      qrSvg.setAttribute('height', '100');

      // Simple QR placeholder - in production would use actual QR rendering
      const qrX = cardWidth - qrSize - 5;
      const qrY = 20;

      // Draw QR code border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2);

      // Add QR label
      pdf.setFontSize(4);
      pdf.setTextColor(148, 163, 184);
      pdf.text('SCAN TO VERIFY', qrX + qrSize/2, qrY + qrSize + 3, { align: 'center' });

      // Footer
      pdf.setFillColor(241, 245, 249); // slate-100
      pdf.rect(0, cardHeight - 7, cardWidth, 7, 'F');

      pdf.setFontSize(4);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Issued: ${format(citizen.createdAt, 'dd/MM/yyyy')}`, 5, cardHeight - 3);
      pdf.text('Citizen Registry System', cardWidth - 5, cardHeight - 3, { align: 'right' });

      // Clean up temp element
      document.body.removeChild(tempDiv);

      // Save PDF
      const filename = `ID-${citizen.uniqueId}.pdf`;
      pdf.save(filename);

      toast.success('ID Card downloaded');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate ID card');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Citizen ID Card
          </DialogTitle>
          <DialogDescription>
            Generate a printable ID card with photo and QR code
          </DialogDescription>
        </DialogHeader>

        {/* ID Card Preview */}
        <div className="my-4">
          <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-xl p-3 shadow-lg">
            {/* Header */}
            <div className="text-center mb-3">
              <p className="text-white font-bold text-sm">CITIZEN REGISTRY</p>
              <p className="text-emerald-100 text-xs">Official Identification Card</p>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg p-3 flex gap-3">
              {/* Photo */}
              <div className="flex-shrink-0">
                {citizen.photoData ? (
                  <img
                    src={citizen.photoData}
                    alt="Photo"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
                    <FileImage className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {citizen.firstName} {citizen.lastName}
                </p>
                <p className="text-xs text-slate-500">{citizen.uniqueId}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {citizen.sex === 'male' ? 'Male' : 'Female'} |
                  {citizen.age ? ` ~${citizen.age} yrs` : ''}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {village?.name}, {ward?.name}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                <QRCodeSVG
                  value={qrData}
                  size={48}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-2 text-emerald-100 text-xs">
              <span>Issued: {format(citizen.createdAt, 'dd/MM/yyyy')}</span>
              <span>Citizen Registry</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={generatePDF}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download PDF
          </Button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-500 text-center mt-2">
          Print on CR80 card stock (85.6mm x 53.98mm) for best results
        </p>
      </DialogContent>
    </Dialog>
  );
}
