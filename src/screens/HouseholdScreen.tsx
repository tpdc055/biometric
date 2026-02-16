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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Household, Village, Ward, db } from "@/lib/db";
import { LocationPicker, type Location } from "@/components/LocationPicker";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Edit2,
  Home,
  MapPin,
  Plus,
  Trash2,
  Users,
  Navigation,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface HouseholdScreenProps {
  onBack: () => void;
}

export function HouseholdScreen({ onBack }: HouseholdScreenProps) {
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Form states
  const [headName, setHeadName] = useState("");
  const [householdCode, setHouseholdCode] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [location, setLocation] = useState<Location | null>(null);

  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(
    () =>
      selectedWardId
        ? db.villages.where("wardId").equals(Number(selectedWardId)).toArray()
        : [],
    [selectedWardId],
  );
  const households = useLiveQuery(
    () =>
      selectedVillageId
        ? db.households
            .where("villageId")
            .equals(Number(selectedVillageId))
            .toArray()
        : [],
    [selectedVillageId],
  );

  // Get member counts for each household
  const householdCounts = useLiveQuery(async () => {
    if (!households) return {};
    const counts: Record<number, number> = {};
    for (const h of households) {
      counts[h.id!] = await db.citizens
        .where("householdId")
        .equals(h.id!)
        .count();
    }
    return counts;
  }, [households]);

  useEffect(() => {
    if (wards && wards.length > 0 && !selectedWardId) {
      setSelectedWardId(String(wards[0].id));
    }
  }, [wards, selectedWardId]);

  useEffect(() => {
    if (villages && villages.length > 0 && !selectedVillageId) {
      setSelectedVillageId(String(villages[0].id));
    } else if (!villages || villages.length === 0) {
      setSelectedVillageId("");
    }
  }, [villages, selectedVillageId]);

  function openAddDialog() {
    setEditingHousehold(null);
    setHeadName("");
    setHouseholdCode("");
    setLocationDescription("");
    setLocation(null);
    setShowDialog(true);
  }

  function openEditDialog(household: Household) {
    setEditingHousehold(household);
    setHeadName(household.headName);
    setHouseholdCode(household.code);
    setLocationDescription(household.locationDescription || "");
    setLocation(
      household.latitude && household.longitude
        ? { lat: household.latitude, lng: household.longitude }
        : null
    );
    setShowDialog(true);
  }

  async function saveHousehold() {
    if (!headName.trim() || !householdCode.trim() || !selectedVillageId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const now = new Date();

    if (editingHousehold) {
      await db.households.update(editingHousehold.id!, {
        headName: headName.trim(),
        code: householdCode.toUpperCase().trim(),
        locationDescription: locationDescription.trim() || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
        updatedAt: now,
      });
      toast.success("Household updated");
    } else {
      await db.households.add({
        villageId: Number(selectedVillageId),
        code: householdCode.toUpperCase().trim(),
        headName: headName.trim(),
        locationDescription: locationDescription.trim() || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
        createdAt: now,
        updatedAt: now,
      });
      toast.success("Household registered");
    }

    setShowDialog(false);
  }

  async function deleteHousehold() {
    if (!deleteTarget) return;

    // Check if household has members
    const memberCount = await db.citizens
      .where("householdId")
      .equals(deleteTarget)
      .count();
    if (memberCount > 0) {
      toast.error(`Cannot delete: ${memberCount} members in this household`);
      setDeleteTarget(null);
      return;
    }

    await db.households.delete(deleteTarget);
    toast.success("Household deleted");
    setDeleteTarget(null);
  }

  const selectedVillage = villages?.find(
    (v) => v.id === Number(selectedVillageId),
  );
  const selectedWard = wards?.find((w) => w.id === Number(selectedWardId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src="/mpg-logo.png"
            alt="MPG"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-800">Households</h1>
            <p className="text-xs text-slate-500">
              Register and manage households
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Location Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Ward</Label>
              <Select
                value={selectedWardId}
                onValueChange={(v) => {
                  setSelectedWardId(v);
                  setSelectedVillageId("");
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards?.map((ward) => (
                    <SelectItem key={ward.id} value={String(ward.id)}>
                      {ward.code} - {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Village</Label>
              <Select
                value={selectedVillageId}
                onValueChange={setSelectedVillageId}
                disabled={!villages || villages.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      villages?.length
                        ? "Select village"
                        : "No villages in ward"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {villages?.map((village) => (
                    <SelectItem key={village.id} value={String(village.id)}>
                      {village.code} - {village.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Households List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Households{" "}
                  {selectedVillage ? `in ${selectedVillage.name}` : ""}
                </CardTitle>
                <CardDescription>
                  {households?.length ?? 0} households registered
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={openAddDialog}
                disabled={!selectedVillageId}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {households && households.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {households.map((household) => (
                    <div
                      key={household.id}
                      className="p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Home className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {household.headName}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {household.code}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(household)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(household.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {household.locationDescription && (
                        <p className="mt-2 text-sm text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {household.locationDescription}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                        <Users className="w-3 h-3" />
                        {householdCounts?.[household.id!] ?? 0} members
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : selectedVillageId ? (
              <div className="text-center py-8 text-slate-400">
                <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No households in this village</p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a village to view households</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHousehold ? "Edit Household" : "Register Household"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="householdCode">Household Code *</Label>
              <Input
                id="householdCode"
                placeholder="e.g., H001"
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="headName">Head of Household *</Label>
              <Input
                id="headName"
                placeholder="Full name of household head"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">Location Description</Label>
              <Textarea
                id="location"
                placeholder="Optional: Describe the household location"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>GPS Location</Label>
              <div className="mt-1">
                {location ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLocationPicker(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowLocationPicker(true)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Pin Location on Map
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveHousehold}>
              {editingHousehold ? "Update" : "Register"}
            </Button>
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
            <AlertDialogTitle>Delete Household?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Make sure no citizens are registered
              under this household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteHousehold}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Location Picker */}
      <LocationPicker
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(loc) => setLocation(loc)}
        initialLocation={location}
      />
    </div>
  );
}
