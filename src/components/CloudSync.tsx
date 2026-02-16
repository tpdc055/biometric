import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db, getAppSetting, setAppSetting } from "@/lib/db";
import localforage from "localforage";
import { format } from "date-fns";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  X,
  Clock,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Server,
  Smartphone,
  AlertTriangle,
  Loader2,
  Link2,
  Copy,
  Share2,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

interface CloudSyncProps {
  open: boolean;
  onClose: () => void;
}

interface SyncState {
  lastSync: Date | null;
  pendingChanges: number;
  isOnline: boolean;
  syncEnabled: boolean;
  deviceId: string;
}

interface BackupData {
  version: string;
  createdAt: string;
  deviceId: string;
  data: {
    wards: unknown[];
    villages: unknown[];
    households: unknown[];
    citizens: unknown[];
    settings: unknown[];
  };
}

// Initialize localforage for sync metadata
const syncStore = localforage.createInstance({
  name: "citizen-registry-sync",
  storeName: "sync_metadata",
});

export function CloudSync({ open, onClose }: CloudSyncProps) {
  const [syncState, setSyncState] = useState<SyncState>({
    lastSync: null,
    pendingChanges: 0,
    isOnline: navigator.onLine,
    syncEnabled: false,
    deviceId: "",
  });
  const [syncing, setSyncing] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [pendingMergeData, setPendingMergeData] = useState<BackupData | null>(null);
  const [syncCode, setSyncCode] = useState("");
  const [inputSyncCode, setInputSyncCode] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [stats, setStats] = useState({ citizens: 0, households: 0, villages: 0, wards: 0 });

  // Generate or retrieve device ID
  useEffect(() => {
    async function initSync() {
      let deviceId = await getAppSetting("device_id");
      if (!deviceId) {
        deviceId = `DEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await setAppSetting("device_id", deviceId);
      }

      const lastSyncStr = await syncStore.getItem<string>("last_sync");
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;

      const autoSyncEnabled = await getAppSetting("auto_sync") === "true";
      setAutoSync(autoSyncEnabled);

      // Count changes since last sync
      const citizens = await db.citizens.count();
      const households = await db.households.count();
      const villages = await db.villages.count();
      const wards = await db.wards.count();

      setStats({ citizens, households, villages, wards });

      setSyncState(prev => ({
        ...prev,
        deviceId,
        lastSync,
        syncEnabled: true,
      }));
    }

    if (open) {
      initSync();
    }
  }, [open]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setSyncState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Generate sync code (base64 encoded backup)
  const generateSyncCode = useCallback(async () => {
    setSyncing(true);
    try {
      const [wards, villages, households, citizens, settings] = await Promise.all([
        db.wards.toArray(),
        db.villages.toArray(),
        db.households.toArray(),
        db.citizens.toArray(),
        db.settings.toArray(),
      ]);

      const backup: BackupData = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        deviceId: syncState.deviceId,
        data: {
          wards,
          villages,
          households,
          citizens,
          settings,
        },
      };

      // Compress and encode
      const json = JSON.stringify(backup);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      setSyncCode(encoded);

      // Copy to clipboard
      await navigator.clipboard.writeText(encoded);
      toast.success("Sync code copied to clipboard!");
    } catch (error) {
      console.error("Generate sync code error:", error);
      toast.error("Failed to generate sync code");
    } finally {
      setSyncing(false);
    }
  }, [syncState.deviceId]);

  // Import from sync code
  const importFromSyncCode = useCallback(async () => {
    if (!inputSyncCode.trim()) {
      toast.error("Please enter a sync code");
      return;
    }

    setSyncing(true);
    try {
      // Decode and parse
      const json = decodeURIComponent(escape(atob(inputSyncCode.trim())));
      const backup: BackupData = JSON.parse(json);

      if (!backup.version || !backup.data) {
        throw new Error("Invalid sync code format");
      }

      // Check if it's from the same device
      if (backup.deviceId === syncState.deviceId) {
        toast.info("This is your own sync code");
        return;
      }

      // Show merge confirmation
      setPendingMergeData(backup);
      setShowMergeConfirm(true);
    } catch (error) {
      console.error("Import sync code error:", error);
      toast.error("Invalid sync code. Please check and try again.");
    } finally {
      setSyncing(false);
    }
  }, [inputSyncCode, syncState.deviceId]);

  // Merge data from another device
  const mergeData = useCallback(async () => {
    if (!pendingMergeData) return;

    setSyncing(true);
    setShowMergeConfirm(false);

    try {
      const backup = pendingMergeData;
      let importedCount = 0;

      // Merge wards (add new ones)
      const existingWards = await db.wards.toArray();
      const existingWardCodes = new Set(existingWards.map(w => w.code));
      for (const ward of backup.data.wards as { code: string; name: string; createdAt: string }[]) {
        if (!existingWardCodes.has(ward.code)) {
          await db.wards.add({
            code: ward.code,
            name: ward.name,
            createdAt: new Date(ward.createdAt),
          });
          importedCount++;
        }
      }

      // Merge villages
      const existingVillages = await db.villages.toArray();
      const existingVillageCodes = new Set(existingVillages.map(v => v.code));
      for (const village of backup.data.villages as { wardId: number; code: string; name: string; createdAt: string }[]) {
        if (!existingVillageCodes.has(village.code)) {
          // Find matching ward
          const ward = await db.wards.where("code").equals(
            (backup.data.wards as { id: number; code: string }[]).find(w => w.id === village.wardId)?.code || ""
          ).first();
          if (ward?.id) {
            await db.villages.add({
              wardId: ward.id,
              code: village.code,
              name: village.name,
              createdAt: new Date(village.createdAt),
            });
            importedCount++;
          }
        }
      }

      // Merge households
      const existingHouseholds = await db.households.toArray();
      const existingHouseholdCodes = new Set(existingHouseholds.map(h => h.code));
      for (const household of backup.data.households as { villageId: number; code: string; headName: string; createdAt: string; updatedAt: string; locationDescription?: string; latitude?: number; longitude?: number }[]) {
        if (!existingHouseholdCodes.has(household.code)) {
          // Find matching village
          const village = await db.villages.where("code").equals(
            (backup.data.villages as { id: number; code: string }[]).find(v => v.id === household.villageId)?.code || ""
          ).first();
          if (village?.id) {
            await db.households.add({
              villageId: village.id,
              code: household.code,
              headName: household.headName,
              locationDescription: household.locationDescription,
              latitude: household.latitude,
              longitude: household.longitude,
              createdAt: new Date(household.createdAt),
              updatedAt: new Date(household.updatedAt),
            });
            importedCount++;
          }
        }
      }

      // Merge citizens (by uniqueId)
      const existingCitizens = await db.citizens.toArray();
      const existingCitizenIds = new Set(existingCitizens.map(c => c.uniqueId));
      for (const citizen of backup.data.citizens as { uniqueId: string; [key: string]: unknown }[]) {
        if (!existingCitizenIds.has(citizen.uniqueId)) {
          // Find matching household, village, ward
          const household = await db.households.where("code").equals(
            (backup.data.households as { id: number; code: string }[]).find(h => h.id === citizen.householdId)?.code || ""
          ).first();
          const village = await db.villages.where("code").equals(
            (backup.data.villages as { id: number; code: string }[]).find(v => v.id === citizen.villageId)?.code || ""
          ).first();
          const ward = await db.wards.where("code").equals(
            (backup.data.wards as { id: number; code: string }[]).find(w => w.id === citizen.wardId)?.code || ""
          ).first();

          if (household?.id && village?.id && ward?.id) {
            await db.citizens.add({
              uniqueId: citizen.uniqueId,
              householdId: household.id,
              villageId: village.id,
              wardId: ward.id,
              firstName: citizen.firstName as string,
              lastName: citizen.lastName as string,
              otherNames: citizen.otherNames as string | undefined,
              sex: citizen.sex as "male" | "female",
              dateOfBirth: citizen.dateOfBirth ? new Date(citizen.dateOfBirth as string) : undefined,
              age: citizen.age as number | undefined,
              phoneNumber: citizen.phoneNumber as string | undefined,
              occupation: citizen.occupation as string | undefined,
              disabilityStatus: citizen.disabilityStatus as "none" | "visual" | "hearing" | "physical" | "intellectual" | "multiple" | "other",
              disabilityNotes: citizen.disabilityNotes as string | undefined,
              photoData: citizen.photoData as string | undefined,
              fingerprintData: citizen.fingerprintData as string | undefined,
              notes: citizen.notes as string | undefined,
              consentGiven: citizen.consentGiven as boolean,
              consentDate: citizen.consentDate ? new Date(citizen.consentDate as string) : undefined,
              recorderName: citizen.recorderName as string | undefined,
              createdAt: new Date(citizen.createdAt as string),
              updatedAt: new Date(citizen.updatedAt as string),
            });
            importedCount++;
          }
        }
      }

      // Update sync state
      await syncStore.setItem("last_sync", new Date().toISOString());
      setSyncState(prev => ({ ...prev, lastSync: new Date() }));

      // Refresh stats
      const citizens = await db.citizens.count();
      const households = await db.households.count();
      const villages = await db.villages.count();
      const wards = await db.wards.count();
      setStats({ citizens, households, villages, wards });

      toast.success(`Synced ${importedCount} new records from another device`);
      setInputSyncCode("");
      setPendingMergeData(null);
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge data");
    } finally {
      setSyncing(false);
    }
  }, [pendingMergeData]);

  // Share via Web Share API
  const shareBackup = useCallback(async () => {
    setSyncing(true);
    try {
      const [wards, villages, households, citizens, settings] = await Promise.all([
        db.wards.toArray(),
        db.villages.toArray(),
        db.households.toArray(),
        db.citizens.toArray(),
        db.settings.toArray(),
      ]);

      const backup: BackupData = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        deviceId: syncState.deviceId,
        data: { wards, villages, households, citizens, settings },
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const filename = `citizen-registry-sync-${format(new Date(), "yyyyMMdd-HHmmss")}.json`;
      const file = new File([blob], filename, { type: "application/json" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Citizen Registry Sync Data",
          text: `Sync data from device ${syncState.deviceId}`,
          files: [file],
        });
        toast.success("Shared successfully");
      } else {
        // Fallback - download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success("File downloaded");
      }
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setSyncing(false);
    }
  }, [syncState.deviceId]);

  // Toggle auto-sync
  const toggleAutoSync = useCallback(async () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    await setAppSetting("auto_sync", newValue.toString());
    toast.success(newValue ? "Auto-sync enabled" : "Auto-sync disabled");
  }, [autoSync]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              Cloud Sync
            </DialogTitle>
            <DialogDescription>
              Sync your data across devices or share with team members
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                syncState.isOnline
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                {syncState.isOnline ? (
                  <Wifi className="w-5 h-5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-slate-400" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${syncState.isOnline ? "text-emerald-800" : "text-slate-600"}`}>
                    {syncState.isOnline ? "Online" : "Offline"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Device: {syncState.deviceId}
                  </p>
                </div>
                {syncState.lastSync && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {format(syncState.lastSync, "MMM d, HH:mm")}
                  </Badge>
                )}
              </div>

              {/* Data Summary */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-medium text-slate-700 text-sm mb-2">Local Data:</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-700">{stats.wards}</p>
                    <p className="text-xs text-slate-500">Wards</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{stats.villages}</p>
                    <p className="text-xs text-slate-500">Villages</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{stats.households}</p>
                    <p className="text-xs text-slate-500">Households</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{stats.citizens}</p>
                    <p className="text-xs text-slate-500">Citizens</p>
                  </div>
                </div>
              </div>

              {/* Generate Sync Code */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-800">Share Your Data</h3>
                    <p className="text-sm text-emerald-600 mt-1">
                      Generate a sync code to share with another device
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={generateSyncCode}
                        disabled={syncing}
                      >
                        {syncing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={shareBackup}
                        disabled={syncing}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share File
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receive from Another Device */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800">Receive Data</h3>
                    <p className="text-sm text-blue-600 mt-1">
                      Paste a sync code from another device to merge data
                    </p>
                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="Paste sync code here..."
                        value={inputSyncCode}
                        onChange={(e) => setInputSyncCode(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={importFromSyncCode}
                        disabled={syncing || !inputSyncCode.trim()}
                      >
                        {syncing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Merge Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-sync Option */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <Checkbox
                  id="autoSync"
                  checked={autoSync}
                  onCheckedChange={toggleAutoSync}
                />
                <div>
                  <Label htmlFor="autoSync" className="cursor-pointer font-medium text-slate-700">
                    Enable auto-sync reminders
                  </Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Get reminded to sync your data periodically
                  </p>
                </div>
              </div>

              {/* Sync Tips */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <h4 className="font-medium text-amber-800 text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Sync Tips
                </h4>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Sync codes contain your full database - keep them secure
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Merging adds new records but won't overwrite existing ones
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Use Share File to send via WhatsApp, email, or cloud storage
                  </li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation */}
      <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Merge Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMergeData && (
                <div className="space-y-2 mt-2">
                  <p>You're about to merge data from another device:</p>
                  <div className="p-3 rounded-lg bg-slate-50 text-sm">
                    <p><strong>Device:</strong> {pendingMergeData.deviceId}</p>
                    <p><strong>Created:</strong> {format(new Date(pendingMergeData.createdAt), "PPp")}</p>
                    <p><strong>Citizens:</strong> {(pendingMergeData.data.citizens as unknown[]).length}</p>
                  </div>
                  <p className="text-amber-600">
                    This will add new records to your database. Existing records will not be modified.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMergeData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={mergeData}>
              Yes, Merge Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
