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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Village, type Ward, db, getAppSetting, setAppSetting } from "@/lib/db";
import { loadSampleData, clearAllData } from "@/lib/sampleData";
import { useLiveQuery } from "dexie-react-hooks";
import { Building2, ChevronRight, MapPin, Plus, Trash2, Database, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [recorderName, setRecorderName] = useState("");
  const [showWardDialog, setShowWardDialog] = useState(false);
  const [showVillageDialog, setShowVillageDialog] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "ward" | "village";
    id: number;
  } | null>(null);
  const [loadingSampleData, setLoadingSampleData] = useState(false);

  // Form states
  const [wardCode, setWardCode] = useState("");
  const [wardName, setWardName] = useState("");
  const [villageCode, setVillageCode] = useState("");
  const [villageName, setVillageName] = useState("");

  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(
    () =>
      selectedWard
        ? db.villages.where("wardId").equals(selectedWard.id!).toArray()
        : [],
    [selectedWard],
  );

  useEffect(() => {
    loadRecorderName();
  }, []);

  async function loadRecorderName() {
    const name = await getAppSetting("recorder_name");
    if (name) setRecorderName(name);
  }

  async function saveRecorderName() {
    await setAppSetting("recorder_name", recorderName);
    toast.success("Recorder name saved");
  }

  async function handleLoadSampleData() {
    setLoadingSampleData(true);
    try {
      const result = await loadSampleData();
      if (result.success) {
        toast.success(result.message);
        // Reload recorder name
        const name = await getAppSetting("recorder_name");
        if (name) setRecorderName(name);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to load sample data");
    } finally {
      setLoadingSampleData(false);
    }
  }

  async function handleClearData() {
    await clearAllData();
    setSelectedWard(null);
    toast.success("All registration data cleared");
  }

  async function addWard() {
    if (!wardCode.trim() || !wardName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    await db.wards.add({
      code: wardCode.toUpperCase().trim(),
      name: wardName.trim(),
      createdAt: new Date(),
    });

    setWardCode("");
    setWardName("");
    setShowWardDialog(false);
    toast.success("Ward added successfully");
  }

  async function addVillage() {
    if (!selectedWard || !villageCode.trim() || !villageName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    await db.villages.add({
      wardId: selectedWard.id!,
      code: villageCode.toUpperCase().trim(),
      name: villageName.trim(),
      createdAt: new Date(),
    });

    setVillageCode("");
    setVillageName("");
    setShowVillageDialog(false);
    toast.success("Village added successfully");
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "ward") {
      await db.villages.where("wardId").equals(deleteTarget.id).delete();
      await db.wards.delete(deleteTarget.id);
      setSelectedWard(null);
      toast.success("Ward deleted");
    } else {
      await db.villages.delete(deleteTarget.id);
      toast.success("Village deleted");
    }

    setDeleteTarget(null);
  }

  const canContinue =
    wards && wards.length > 0 && recorderName.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center py-4">
          <img
            src="/mpg-logo.png"
            alt="Madang Provincial Government"
            className="w-20 h-20 object-contain mx-auto mb-3"
          />
          <p className="text-xs font-semibold text-slate-600 mb-1">Madang Provincial Government</p>
          <h1 className="text-2xl font-bold text-slate-800">
            Setup Configuration
          </h1>
          <p className="text-slate-500 mt-1">
            Configure wards and villages for registration
          </p>
        </div>

        {/* Recorder Name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recorder Information</CardTitle>
            <CardDescription>
              Your name will be recorded with each registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="recorder">Recorder Name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="recorder"
                  placeholder="Enter your name"
                  value={recorderName}
                  onChange={(e) => setRecorderName(e.target.value)}
                />
                <Button onClick={saveRecorderName} variant="secondary">
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data - Quick Start */}
        {(!wards || wards.length === 0) && (
          <Card className="border-dashed border-2 border-emerald-300 bg-emerald-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                Quick Start with Sample Data
              </CardTitle>
              <CardDescription>
                Load pre-configured wards, villages, households, and sample citizens to test the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleLoadSampleData}
                disabled={loadingSampleData}
                className="w-full"
              >
                {loadingSampleData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Load Sample Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wards */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Wards</CardTitle>
                <CardDescription>Add wards for your area</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowWardDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Ward
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wards && wards.length > 0 ? (
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {wards.map((ward) => (
                    <div
                      key={ward.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedWard?.id === ward.id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedWard(ward)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{ward.code}</Badge>
                        <span className="font-medium">{ward.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: "ward", id: ward.id! });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No wards added yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Villages */}
        {selectedWard && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Villages in {selectedWard.name}
                  </CardTitle>
                  <CardDescription>Add villages for this ward</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowVillageDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Village
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {villages && villages.length > 0 ? (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {villages.map((village) => (
                      <div
                        key={village.id}
                        className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{village.code}</Badge>
                          <span className="font-medium">{village.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setDeleteTarget({
                              type: "village",
                              id: village.id!,
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No villages in this ward</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={onComplete}
          disabled={!canContinue}
        >
          Continue to Dashboard
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>

        {!canContinue && (
          <p className="text-center text-sm text-slate-500">
            Add at least one ward and enter your name to continue
          </p>
        )}
      </div>

      {/* Add Ward Dialog */}
      <Dialog open={showWardDialog} onOpenChange={setShowWardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Ward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wardCode">Ward Code</Label>
              <Input
                id="wardCode"
                placeholder="e.g., W01"
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wardName">Ward Name</Label>
              <Input
                id="wardName"
                placeholder="e.g., Mwanakwerekwe"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addWard}>Add Ward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Village Dialog */}
      <Dialog open={showVillageDialog} onOpenChange={setShowVillageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Village</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="villageCode">Village Code</Label>
              <Input
                id="villageCode"
                placeholder="e.g., V01"
                value={villageCode}
                onChange={(e) => setVillageCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="villageName">Village Name</Label>
              <Input
                id="villageName"
                placeholder="e.g., Kisauni"
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVillageDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={addVillage}>Add Village</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "ward"
                ? "This will delete the ward and all its villages. This action cannot be undone."
                : "This will delete the village. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
