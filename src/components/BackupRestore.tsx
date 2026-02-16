import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { db } from '@/lib/db';
import {
  Download,
  Upload,
  Cloud,
  HardDrive,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BackupRestoreProps {
  open: boolean;
  onClose: () => void;
}

interface BackupData {
  version: string;
  createdAt: string;
  data: {
    wards: unknown[];
    villages: unknown[];
    households: unknown[];
    citizens: unknown[];
    settings: unknown[];
  };
}

export function BackupRestore({ open, onClose }: BackupRestoreProps) {
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createBackup(): Promise<BackupData> {
    const [wards, villages, households, citizens, settings] = await Promise.all([
      db.wards.toArray(),
      db.villages.toArray(),
      db.households.toArray(),
      db.citizens.toArray(),
      db.settings.toArray(),
    ]);

    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        wards,
        villages,
        households,
        citizens,
        settings,
      },
    };
  }

  async function handleBackup() {
    setBacking(true);
    try {
      const backup = await createBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `citizen-registry-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;

      // Download file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setBacking(false);
    }
  }

  async function handleShare() {
    setBacking(true);
    try {
      const backup = await createBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `citizen-registry-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
      const file = new File([blob], filename, { type: 'application/json' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Citizen Registry Backup',
          text: 'Backup of citizen registration data',
          files: [file],
        });
        toast.success('Backup shared successfully');
      } else {
        // Fallback to download
        await handleBackup();
      }
    } catch (error) {
      console.error('Share error:', error);
      // User might have cancelled share, just download instead
      await handleBackup();
    } finally {
      setBacking(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowRestoreConfirm(true);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function performRestore() {
    if (!pendingFile) return;

    setRestoring(true);
    setShowRestoreConfirm(false);

    try {
      const text = await pendingFile.text();
      const backup: BackupData = JSON.parse(text);

      // Validate backup structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      // Clear existing data
      await Promise.all([
        db.citizens.clear(),
        db.households.clear(),
        db.villages.clear(),
        db.wards.clear(),
        db.settings.clear(),
      ]);

      // Restore data in order (respect foreign keys)
      if (backup.data.wards?.length) {
        await db.wards.bulkAdd(backup.data.wards as any[]);
      }
      if (backup.data.villages?.length) {
        await db.villages.bulkAdd(backup.data.villages as any[]);
      }
      if (backup.data.households?.length) {
        await db.households.bulkAdd(backup.data.households as any[]);
      }
      if (backup.data.citizens?.length) {
        await db.citizens.bulkAdd(backup.data.citizens as any[]);
      }
      if (backup.data.settings?.length) {
        await db.settings.bulkAdd(backup.data.settings as any[]);
      }

      toast.success(`Restored ${backup.data.citizens?.length || 0} citizens from backup`);
      onClose();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore backup. Make sure the file is valid.');
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              Backup & Restore
            </DialogTitle>
            <DialogDescription>
              Create backups of your data or restore from a previous backup
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Backup Section */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-800">Create Backup</h3>
                  <p className="text-sm text-emerald-600 mt-1">
                    Download all your data as a JSON file. You can upload this to Google Drive, Dropbox, or any cloud storage.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleBackup}
                      disabled={backing}
                    >
                      {backing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <HardDrive className="w-4 h-4 mr-2" />
                      )}
                      Download
                    </Button>
                    {'share' in navigator && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShare}
                        disabled={backing}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Restore Section */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800">Restore from Backup</h3>
                  <p className="text-sm text-amber-600 mt-1">
                    Load data from a previous backup file. This will replace all current data.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={restoring}
                  >
                    {restoring ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileJson className="w-4 h-4 mr-2" />
                    )}
                    Select Backup File
                  </Button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-medium text-slate-700 text-sm mb-2">Tips:</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
                  Create backups regularly to avoid data loss
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
                  Upload backup files to Google Drive for cloud storage
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                  Restoring will replace all existing data
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace ALL current data with the backup data. This action cannot be undone.
              Make sure you have a backup of your current data if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performRestore} className="bg-amber-500 hover:bg-amber-600">
              Yes, Restore Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
