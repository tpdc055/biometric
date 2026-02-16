import { CameraCapture } from "@/components/CameraCapture";
import { DuplicateChecker } from "@/components/DuplicateChecker";
import { SignatureCapture, SignatureDisplay } from "@/components/SignatureCapture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Citizen, db, generateCitizenId, getAppSetting } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Fingerprint,
  Save,
  User,
  X,
  PenLine,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CitizenScreenProps {
  onBack: () => void;
  editingCitizen?: Citizen | null;
}

const DISABILITY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "visual", label: "Visual Impairment" },
  { value: "hearing", label: "Hearing Impairment" },
  { value: "physical", label: "Physical Disability" },
  { value: "intellectual", label: "Intellectual Disability" },
  { value: "multiple", label: "Multiple Disabilities" },
  { value: "other", label: "Other" },
];

const OCCUPATION_OPTIONS = [
  "Farmer",
  "Fisherman",
  "Teacher",
  "Health Worker",
  "Trader/Business",
  "Student",
  "Government Worker",
  "Unemployed",
  "Retired",
  "Other",
];

export function CitizenScreen({ onBack, editingCitizen }: CitizenScreenProps) {
  // Selection states
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [dobType, setDobType] = useState<"exact" | "estimate">("exact");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [disabilityStatus, setDisabilityStatus] = useState("none");
  const [disabilityNotes, setDisabilityNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  // Photo states
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showFingerprintCapture, setShowFingerprintCapture] = useState(false);

  // Signature states
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);

  const [saving, setSaving] = useState(false);
  const [recorderName, setRecorderName] = useState("");

  // Data queries
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

  useEffect(() => {
    loadRecorderName();
    if (editingCitizen) {
      loadEditingData();
    }
  }, [editingCitizen]);

  async function loadRecorderName() {
    const name = await getAppSetting("recorder_name");
    if (name) setRecorderName(name);
  }

  function loadEditingData() {
    if (!editingCitizen) return;

    setSelectedWardId(String(editingCitizen.wardId));
    setSelectedVillageId(String(editingCitizen.villageId));
    setSelectedHouseholdId(String(editingCitizen.householdId));
    setFirstName(editingCitizen.firstName);
    setLastName(editingCitizen.lastName);
    setOtherNames(editingCitizen.otherNames || "");
    setSex(editingCitizen.sex);
    if (editingCitizen.dateOfBirth) {
      setDobType("exact");
      setDateOfBirth(editingCitizen.dateOfBirth.toISOString().split("T")[0]);
    } else if (editingCitizen.age) {
      setDobType("estimate");
      setAge(String(editingCitizen.age));
    }
    setPhoneNumber(editingCitizen.phoneNumber || "");
    setOccupation(editingCitizen.occupation || "");
    setDisabilityStatus(editingCitizen.disabilityStatus);
    setDisabilityNotes(editingCitizen.disabilityNotes || "");
    setNotes(editingCitizen.notes || "");
    setConsentGiven(editingCitizen.consentGiven);
    setPhotoData(editingCitizen.photoData || null);
    setFingerprintData(editingCitizen.fingerprintData || null);
  }

  useEffect(() => {
    if (wards && wards.length > 0 && !selectedWardId && !editingCitizen) {
      setSelectedWardId(String(wards[0].id));
    }
  }, [wards, selectedWardId, editingCitizen]);

  useEffect(() => {
    if (
      villages &&
      villages.length > 0 &&
      !selectedVillageId &&
      !editingCitizen
    ) {
      setSelectedVillageId(String(villages[0].id));
    }
  }, [villages, selectedVillageId, editingCitizen]);

  async function handleSubmit() {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!sex) {
      toast.error("Please select sex");
      return;
    }
    if (!selectedHouseholdId) {
      toast.error("Please select a household");
      return;
    }
    if (!consentGiven) {
      toast.error("Consent must be given to register");
      return;
    }

    setSaving(true);

    try {
      const selectedWard = wards?.find((w) => w.id === Number(selectedWardId));
      const selectedVillage = villages?.find(
        (v) => v.id === Number(selectedVillageId),
      );
      const now = new Date();

      if (editingCitizen) {
        // Update existing
        await db.citizens.update(editingCitizen.id!, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          otherNames: otherNames.trim() || undefined,
          sex: sex as "male" | "female",
          dateOfBirth:
            dobType === "exact" && dateOfBirth
              ? new Date(dateOfBirth)
              : undefined,
          age: dobType === "estimate" && age ? Number(age) : undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          occupation: occupation || undefined,
          disabilityStatus: disabilityStatus as Citizen["disabilityStatus"],
          disabilityNotes: disabilityNotes.trim() || undefined,
          notes: notes.trim() || undefined,
          photoData: photoData || undefined,
          fingerprintData: fingerprintData || undefined,
          consentGiven,
          consentDate: now,
          recorderName,
          updatedAt: now,
        });
        toast.success("Citizen updated successfully");
      } else {
        // Create new
        const uniqueId = await generateCitizenId(
          selectedWard?.code || "W00",
          selectedVillage?.code || "V00",
        );

        await db.citizens.add({
          uniqueId,
          householdId: Number(selectedHouseholdId),
          villageId: Number(selectedVillageId),
          wardId: Number(selectedWardId),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          otherNames: otherNames.trim() || undefined,
          sex: sex as "male" | "female",
          dateOfBirth:
            dobType === "exact" && dateOfBirth
              ? new Date(dateOfBirth)
              : undefined,
          age: dobType === "estimate" && age ? Number(age) : undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          occupation: occupation || undefined,
          disabilityStatus: disabilityStatus as Citizen["disabilityStatus"],
          disabilityNotes: disabilityNotes.trim() || undefined,
          notes: notes.trim() || undefined,
          photoData: photoData || undefined,
          fingerprintData: fingerprintData || undefined,
          consentGiven,
          consentDate: now,
          recorderName,
          createdAt: now,
          updatedAt: now,
        });
        toast.success(`Citizen registered: ${uniqueId}`);
      }

      onBack();
    } catch (error) {
      toast.error("Failed to save citizen");
      console.error(error);
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-lg font-bold text-slate-800">
              {editingCitizen ? "Edit Citizen" : "Register Citizen"}
            </h1>
            <p className="text-xs text-slate-500">
              {editingCitizen
                ? `Editing: ${editingCitizen.uniqueId}`
                : "Fill in citizen details"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Location Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ward</Label>
                <Select
                  value={selectedWardId}
                  onValueChange={(v) => {
                    setSelectedWardId(v);
                    setSelectedVillageId("");
                    setSelectedHouseholdId("");
                  }}
                  disabled={!!editingCitizen}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards?.map((ward) => (
                      <SelectItem key={ward.id} value={String(ward.id)}>
                        {ward.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Village</Label>
                <Select
                  value={selectedVillageId}
                  onValueChange={(v) => {
                    setSelectedVillageId(v);
                    setSelectedHouseholdId("");
                  }}
                  disabled={!villages?.length || !!editingCitizen}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {villages?.map((village) => (
                      <SelectItem key={village.id} value={String(village.id)}>
                        {village.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Household *</Label>
              <Select
                value={selectedHouseholdId}
                onValueChange={setSelectedHouseholdId}
                disabled={!households?.length || !!editingCitizen}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      households?.length ? "Select household" : "No households"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {households?.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.code} - {h.headName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Photo & Fingerprint */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Biometrics</CardTitle>
            <CardDescription>Capture photo and fingerprint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Photo */}
              <div className="text-center">
                <div
                  className="relative w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-emerald-300 transition-all"
                  onClick={() => setShowPhotoCapture(true)}
                >
                  {photoData ? (
                    <>
                      <img
                        src={photoData}
                        alt="Photo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-2 left-1/2 -translate-x-1/2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPhotoCapture(true);
                        }}
                      >
                        Retake
                      </Button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-xs">Tap to capture</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-700">Photo</p>
              </div>

              {/* Fingerprint */}
              <div className="text-center">
                <div
                  className="relative w-full aspect-square rounded-xl border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-emerald-300 transition-all"
                  onClick={() => setShowFingerprintCapture(true)}
                >
                  {fingerprintData ? (
                    <>
                      <img
                        src={fingerprintData}
                        alt="Fingerprint"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-2 left-1/2 -translate-x-1/2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFingerprintCapture(true);
                        }}
                      >
                        Retake
                      </Button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                      <Fingerprint className="w-8 h-8 mb-2" />
                      <span className="text-xs">Tap to capture</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  Fingerprint
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="otherNames">Other Names</Label>
              <Input
                id="otherNames"
                placeholder="Middle names (optional)"
                value={otherNames}
                onChange={(e) => setOtherNames(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sex *</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <Button
                  type="button"
                  variant={sex === "male" ? "default" : "outline"}
                  onClick={() => setSex("male")}
                >
                  Male
                </Button>
                <Button
                  type="button"
                  variant={sex === "female" ? "default" : "outline"}
                  onClick={() => setSex("female")}
                >
                  Female
                </Button>
              </div>
            </div>
            <div>
              <Label>Date of Birth / Age</Label>
              <div className="grid grid-cols-2 gap-3 mt-1 mb-2">
                <Button
                  type="button"
                  variant={dobType === "exact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDobType("exact")}
                >
                  Exact Date
                </Button>
                <Button
                  type="button"
                  variant={dobType === "estimate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDobType("estimate")}
                >
                  Estimate Age
                </Button>
              </div>
              {dobType === "exact" ? (
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              ) : (
                <Input
                  type="number"
                  placeholder="Enter estimated age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={0}
                  max={150}
                />
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Optional"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Duplicate Detection */}
        {!editingCitizen && firstName && lastName && (
          <DuplicateChecker
            citizenData={{
              firstName,
              lastName,
              otherNames: otherNames || undefined,
              phoneNumber: phoneNumber || undefined,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
              householdId: selectedHouseholdId ? Number(selectedHouseholdId) : undefined,
              villageId: selectedVillageId ? Number(selectedVillageId) : undefined,
            }}
          />
        )}

        {/* Classification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Occupation</Label>
              <Select value={occupation} onValueChange={setOccupation}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select occupation" />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATION_OPTIONS.map((occ) => (
                    <SelectItem key={occ} value={occ}>
                      {occ}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disability Status</Label>
              <Select
                value={disabilityStatus}
                onValueChange={setDisabilityStatus}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {disabilityStatus !== "none" && (
              <div>
                <Label htmlFor="disabilityNotes">Disability Notes</Label>
                <Textarea
                  id="disabilityNotes"
                  placeholder="Additional details about the disability"
                  value={disabilityNotes}
                  onChange={(e) => setDisabilityNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any other relevant information"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Consent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consent</CardTitle>
            <CardDescription>Consent and signature for data collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="consent" className="cursor-pointer">
                  I confirm that consent has been given by the citizen (or
                  guardian) for data collection and storage.
                </Label>
                {recorderName && (
                  <p className="mt-2 text-sm text-slate-500">
                    Recorded by: <strong>{recorderName}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Digital Signature */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Digital Signature (Optional)
              </Label>
              {signatureData ? (
                <SignatureDisplay
                  signatureData={signatureData}
                  signerName={`${firstName} ${lastName}`.trim() || undefined}
                  timestamp={new Date()}
                  onClear={() => setSignatureData(null)}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed border-2 hover:border-emerald-300"
                  onClick={() => setShowSignatureCapture(true)}
                >
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <PenLine className="w-6 h-6" />
                    <span className="text-xs">Tap to capture signature</span>
                  </div>
                </Button>
              )}
            </div>

            {!consentGiven && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>Consent is required to save this registration</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={saving || !consentGiven}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : editingCitizen ? "Update" : "Register"}
          </Button>
        </div>
      </div>

      {/* Camera Dialogs */}
      <CameraCapture
        open={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onCapture={setPhotoData}
        mode="photo"
      />
      <CameraCapture
        open={showFingerprintCapture}
        onClose={() => setShowFingerprintCapture(false)}
        onCapture={setFingerprintData}
        mode="fingerprint"
      />
      <SignatureCapture
        open={showSignatureCapture}
        onClose={() => setShowSignatureCapture(false)}
        onCapture={setSignatureData}
        signerName={`${firstName} ${lastName}`.trim() || undefined}
      />
    </div>
  );
}
