import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { syncToSupabase, restoreFromSupabase, getSyncStatus, checkSupabaseConnection } from '@/lib/supabaseSync';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  Database,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SupabaseSyncProps {
  open: boolean;
  onClose: () => void;
}

export function SupabaseSync({ open, onClose }: SupabaseSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseReachable, setSupabaseReachable] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    uploaded: { wards: number; villages: number; households: number; citizens: number };
    downloaded: { wards: number; villages: number; households: number; citizens: number };
    errors: string[];
  } | null>(null);

  // Get data counts
  const localData = useLiveQuery(async () => {
    const [wards, villages, households, citizens] = await Promise.all([
      db.wards.count(),
      db.villages.count(),
      db.households.count(),
      db.citizens.count(),
    ]);
    return { wards, villages, households, citizens };
  });

  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function checkStatus() {
    const status = await getSyncStatus();
    setLastSync(status.lastSync);

    // Check Supabase connection
    const reachable = await checkSupabaseConnection();
    setSupabaseReachable(reachable);
  }

  async function handleSync() {
    if (!isOnline) {
      toast.error('No internet connection');
      return;
    }

    if (!supabaseReachable) {
      toast.error('Cannot connect to Supabase');
      return;
    }

    setSyncing(true);
    setSyncProgress(0);
    setSyncResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await syncToSupabase();

      clearInterval(progressInterval);
      setSyncProgress(100);
      setSyncResult(result);

      if (result.success) {
        const totalUploaded = result.uploaded.wards + result.uploaded.villages +
                             result.uploaded.households + result.uploaded.citizens;
        toast.success(`Successfully synced ${totalUploaded} records to Supabase`);
        setLastSync(new Date());
      } else {
        toast.error(`Sync completed with ${result.errors.length} errors`);
      }
    } catch (error) {
      toast.error('Sync failed: ' + String(error));
      setSyncResult({
        success: false,
        uploaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
        downloaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
        errors: [String(error)],
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleRestore() {
    if (!isOnline) {
      toast.error('No internet connection');
      return;
    }

    if (!supabaseReachable) {
      toast.error('Cannot connect to Supabase');
      return;
    }

    // Confirm with user
    if (!confirm('This will download all data from Supabase and merge it with your local data. Continue?')) {
      return;
    }

    setRestoring(true);
    setSyncProgress(0);
    setSyncResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await restoreFromSupabase();

      clearInterval(progressInterval);
      setSyncProgress(100);
      setSyncResult(result);

      if (result.success) {
        const totalDownloaded = result.downloaded.wards + result.downloaded.villages +
                               result.downloaded.households + result.downloaded.citizens;
        toast.success(`Successfully restored ${totalDownloaded} records from Supabase`);
        setLastSync(new Date());
      } else {
        toast.error(`Restore completed with ${result.errors.length} errors`);
      }
    } catch (error) {
      toast.error('Restore failed: ' + String(error));
      setSyncResult({
        success: false,
        uploaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
        downloaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
        errors: [String(error)],
      });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-600" />
            Supabase Cloud Sync
          </DialogTitle>
          <DialogDescription>
            Backup your data to Supabase cloud database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Status */}
          <Card className={isOnline && supabaseReachable ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                {isOnline && supabaseReachable ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {isOnline ? (supabaseReachable ? 'Connected to Supabase' : 'Supabase Unreachable') : 'Offline'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lastSync ? `Last synced: ${format(lastSync, 'PPp')}` : 'Never synced'}
                  </p>
                </div>
                <Badge variant={isOnline && supabaseReachable ? 'default' : 'secondary'}>
                  {isOnline && supabaseReachable ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Local Data Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Local Data to Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-xs text-purple-600">Wards</p>
                  <p className="text-lg font-bold text-purple-700">{localData?.wards ?? 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600">Villages</p>
                  <p className="text-lg font-bold text-blue-700">{localData?.villages ?? 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-600">Households</p>
                  <p className="text-lg font-bold text-amber-700">{localData?.households ?? 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-600">Citizens</p>
                  <p className="text-lg font-bold text-emerald-700">{localData?.citizens ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync/Restore Progress */}
          {(syncing || restoring) && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <p className="font-medium text-sm text-emerald-800">
                    {syncing ? 'Uploading to cloud...' : 'Downloading from cloud...'}
                  </p>
                </div>
                <Progress value={syncProgress} className="h-2" />
                <p className="text-xs text-emerald-600 mt-2">{syncProgress}% complete</p>
              </CardContent>
            </Card>
          )}

          {/* Sync Results */}
          {syncResult && (
            <Card className={syncResult.success ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  Sync Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(syncResult.uploaded.wards + syncResult.uploaded.villages + syncResult.uploaded.households + syncResult.uploaded.citizens > 0) && (
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-2">Uploaded to Cloud:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Upload className="w-3 h-3 text-purple-600" />
                        <span>{syncResult.uploaded.wards} wards</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Upload className="w-3 h-3 text-blue-600" />
                        <span>{syncResult.uploaded.villages} villages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Upload className="w-3 h-3 text-amber-600" />
                        <span>{syncResult.uploaded.households} households</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Upload className="w-3 h-3 text-emerald-600" />
                        <span>{syncResult.uploaded.citizens} citizens</span>
                      </div>
                    </div>
                  </div>
                )}

                {(syncResult.downloaded.wards + syncResult.downloaded.villages + syncResult.downloaded.households + syncResult.downloaded.citizens > 0) && (
                  <div>
                    <p className="text-xs font-medium text-slate-700 mb-2">Downloaded from Cloud:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Download className="w-3 h-3 text-purple-600" />
                        <span>{syncResult.downloaded.wards} wards</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="w-3 h-3 text-blue-600" />
                        <span>{syncResult.downloaded.villages} villages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="w-3 h-3 text-amber-600" />
                        <span>{syncResult.downloaded.households} households</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>{syncResult.downloaded.citizens} citizens</span>
                      </div>
                    </div>
                  </div>
                )}

                {syncResult.errors.length > 0 && (
                  <div className="p-2 rounded-lg bg-amber-100 border border-amber-300">
                    <p className="text-xs font-medium text-amber-800 mb-1">
                      {syncResult.errors.length} errors occurred:
                    </p>
                    <ScrollArea className="h-20">
                      <ul className="text-xs text-amber-700 space-y-1">
                        {syncResult.errors.map((error, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleSync}
              disabled={syncing || restoring || !isOnline || !supabaseReachable || (localData?.citizens ?? 0) === 0}
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleRestore}
              disabled={syncing || restoring || !isOnline || !supabaseReachable}
            >
              {restoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-600">
              <strong className="text-slate-700">Upload:</strong> Sends your local data to Supabase cloud. Existing records will be updated, new records will be created.<br />
              <strong className="text-slate-700 mt-1 inline-block">Download:</strong> Fetches all data from Supabase and merges it with your local database. Includes photos and fingerprints.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact Sync Button Component for Dashboard
export function SyncButton() {
  const [showSync, setShowSync] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSync(true)}
        className={isOnline ? 'border-emerald-300 text-emerald-700' : 'border-slate-300'}
      >
        {isOnline ? (
          <Cloud className="w-4 h-4 mr-2" />
        ) : (
          <CloudOff className="w-4 h-4 mr-2" />
        )}
        {isOnline ? 'Cloud Sync' : 'Offline'}
      </Button>

      <SupabaseSync open={showSync} onClose={() => setShowSync(false)} />
    </>
  );
}
