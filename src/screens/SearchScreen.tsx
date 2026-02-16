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
import { type Citizen, db } from "@/lib/db";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CreditCard,
  Edit2,
  Eye,
  Fingerprint,
  Home,
  MapPin,
  Phone,
  Search,
  Trash2,
  User,
  Users,
  QrCode,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CitizenQRCode } from "@/components/CitizenQRCode";
import { CitizenIDCard } from "@/components/CitizenIDCard";

interface SearchScreenProps {
  onBack: () => void;
  onEditCitizen: (citizen: Citizen) => void;
}

export function SearchScreen({ onBack, onEditCitizen }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWardId, setFilterWardId] = useState<string>("all");
  const [filterVillageId, setFilterVillageId] = useState<string>("all");
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Citizen | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);

  // Data queries
  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(
    () =>
      filterWardId !== "all"
        ? db.villages.where("wardId").equals(Number(filterWardId)).toArray()
        : db.villages.toArray(),
    [filterWardId],
  );
  const households = useLiveQuery(() => db.households.toArray());
  const allCitizens = useLiveQuery(() =>
    db.citizens.orderBy("createdAt").reverse().toArray(),
  );

  // Filtered citizens
  const filteredCitizens = useMemo(() => {
    if (!allCitizens) return [];

    return allCitizens.filter((citizen) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          citizen.firstName.toLowerCase().includes(query) ||
          citizen.lastName.toLowerCase().includes(query) ||
          citizen.uniqueId.toLowerCase().includes(query) ||
          citizen.phoneNumber?.includes(query);
        if (!matchesSearch) return false;
      }

      // Ward filter
      if (filterWardId !== "all" && citizen.wardId !== Number(filterWardId)) {
        return false;
      }

      // Village filter
      if (
        filterVillageId !== "all" &&
        citizen.villageId !== Number(filterVillageId)
      ) {
        return false;
      }

      return true;
    });
  }, [allCitizens, searchQuery, filterWardId, filterVillageId]);

  async function deleteCitizen() {
    if (!deleteTarget) return;
    await db.citizens.delete(deleteTarget.id!);
    toast.success("Citizen deleted");
    setDeleteTarget(null);
    setSelectedCitizen(null);
  }

  function getWardName(wardId: number) {
    return wards?.find((w) => w.id === wardId)?.name || "Unknown";
  }

  function getVillageName(villageId: number) {
    return villages?.find((v) => v.id === villageId)?.name || "Unknown";
  }

  function getHouseholdName(householdId: number) {
    return households?.find((h) => h.id === householdId)?.headName || "Unknown";
  }

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
            <h1 className="text-lg font-bold text-slate-800">Search Records</h1>
            <p className="text-xs text-slate-500">
              {filteredCitizens.length} citizens found
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ward</Label>
                <Select
                  value={filterWardId}
                  onValueChange={(v) => {
                    setFilterWardId(v);
                    setFilterVillageId("all");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wards?.map((ward) => (
                      <SelectItem key={ward.id} value={String(ward.id)}>
                        {ward.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Village</Label>
                <Select
                  value={filterVillageId}
                  onValueChange={setFilterVillageId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Villages</SelectItem>
                    {villages?.map((village) => (
                      <SelectItem key={village.id} value={String(village.id)}>
                        {village.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-4">
            {filteredCitizens.length > 0 ? (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3">
                  {filteredCitizens.map((citizen) => (
                    <div
                      key={citizen.id}
                      className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-200 transition-all cursor-pointer"
                      onClick={() => setSelectedCitizen(citizen)}
                    >
                      <div className="flex items-start gap-3">
                        {citizen.photoData ? (
                          <img
                            src={citizen.photoData}
                            alt={`${citizen.firstName} ${citizen.lastName}`}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">
                            {citizen.firstName} {citizen.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {citizen.uniqueId}
                            </Badge>
                            <Badge
                              variant={
                                citizen.sex === "male" ? "secondary" : "default"
                              }
                              className="text-xs"
                            >
                              {citizen.sex === "male" ? "M" : "F"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getVillageName(citizen.villageId)}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No citizens found</p>
                {searchQuery && (
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Citizen Detail Dialog */}
      <Dialog
        open={!!selectedCitizen}
        onOpenChange={() => setSelectedCitizen(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Citizen Details</DialogTitle>
          </DialogHeader>
          {selectedCitizen && (
            <div className="space-y-4">
              {/* Photo & ID */}
              <div className="flex items-center gap-4">
                {selectedCitizen.photoData ? (
                  <img
                    src={selectedCitizen.photoData}
                    alt="Photo"
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-200 flex items-center justify-center">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedCitizen.firstName} {selectedCitizen.lastName}
                  </h3>
                  {selectedCitizen.otherNames && (
                    <p className="text-sm text-slate-500">
                      {selectedCitizen.otherNames}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-1">
                    {selectedCitizen.uniqueId}
                  </Badge>
                </div>
              </div>

              {/* Fingerprint */}
              {selectedCitizen.fingerprintData && (
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium">Fingerprint</span>
                  </div>
                  <img
                    src={selectedCitizen.fingerprintData}
                    alt="Fingerprint"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Sex</p>
                    <p className="font-medium capitalize">
                      {selectedCitizen.sex}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Age / DOB</p>
                    <p className="font-medium">
                      {selectedCitizen.dateOfBirth
                        ? format(selectedCitizen.dateOfBirth, "MMM d, yyyy")
                        : selectedCitizen.age
                          ? `~${selectedCitizen.age} years`
                          : "Not recorded"}
                    </p>
                  </div>
                </div>

                {selectedCitizen.phoneNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium">
                        {selectedCitizen.phoneNumber}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="font-medium">
                      {getWardName(selectedCitizen.wardId)} →{" "}
                      {getVillageName(selectedCitizen.villageId)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Home className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Household</p>
                    <p className="font-medium">
                      {getHouseholdName(selectedCitizen.householdId)}
                    </p>
                  </div>
                </div>

                {selectedCitizen.occupation && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Occupation</p>
                      <p className="font-medium">
                        {selectedCitizen.occupation}
                      </p>
                    </div>
                  </div>
                )}

                {selectedCitizen.disabilityStatus !== "none" && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium">
                      Disability
                    </p>
                    <p className="font-medium text-amber-800 capitalize">
                      {selectedCitizen.disabilityStatus}
                    </p>
                    {selectedCitizen.disabilityNotes && (
                      <p className="text-sm text-amber-700 mt-1">
                        {selectedCitizen.disabilityNotes}
                      </p>
                    )}
                  </div>
                )}

                {selectedCitizen.notes && (
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500">Notes</p>
                    <p className="text-sm mt-1">{selectedCitizen.notes}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-600">
                    Registered:{" "}
                    {format(selectedCitizen.createdAt, "MMM d, yyyy HH:mm")}
                  </p>
                  {selectedCitizen.recorderName && (
                    <p className="text-xs text-emerald-600">
                      By: {selectedCitizen.recorderName}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQRCode(true)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowIDCard(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  ID Card
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCitizen(null);
                    onEditCitizen(selectedCitizen);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteTarget(selectedCitizen)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <CitizenQRCode
        citizen={selectedCitizen}
        open={showQRCode}
        onClose={() => setShowQRCode(false)}
      />

      {/* ID Card Dialog */}
      <CitizenIDCard
        citizen={selectedCitizen}
        open={showIDCard}
        onClose={() => setShowIDCard(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Citizen?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.firstName}{" "}
              {deleteTarget?.lastName}'s record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCitizen}
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
