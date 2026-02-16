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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { BackupRestore } from "@/components/BackupRestore";
import { CSVImport } from "@/components/CSVImport";
import { CloudSync } from "@/components/CloudSync";
import { MapView } from "@/components/MapView";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Cloud,
  Download,
  FileSpreadsheet,
  Home,
  MapPin,
  Users,
  Upload,
  RefreshCw,
  Map,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportScreenProps {
  onBack: () => void;
}

export function ExportScreen({ onBack }: ExportScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<
    "citizens" | "households" | "all"
  >("citizens");
  const [filterWardId, setFilterWardId] = useState<string>("all");
  const [includePhotos, setIncludePhotos] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Data queries
  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(() => db.villages.toArray());
  const households = useLiveQuery(() => db.households.toArray());
  const citizens = useLiveQuery(() => db.citizens.toArray());

  const stats = {
    wards: wards?.length ?? 0,
    villages: villages?.length ?? 0,
    households: households?.length ?? 0,
    citizens: citizens?.length ?? 0,
  };

  async function exportToCSV() {
    setExporting(true);

    try {
      const allWards = await db.wards.toArray();
      const allVillages = await db.villages.toArray();
      const allHouseholds = await db.households.toArray();
      const allCitizens = await db.citizens.toArray();

      // Filter by ward if selected
      const filteredCitizens =
        filterWardId === "all"
          ? allCitizens
          : allCitizens.filter((c) => c.wardId === Number(filterWardId));

      const filteredHouseholds =
        filterWardId === "all"
          ? allHouseholds
          : allHouseholds.filter((h) => {
              const village = allVillages.find((v) => v.id === h.villageId);
              return village && village.wardId === Number(filterWardId);
            });

      if (exportType === "citizens" || exportType === "all") {
        // Citizens CSV
        const citizenHeaders = [
          "Citizen ID",
          "First Name",
          "Last Name",
          "Other Names",
          "Sex",
          "Date of Birth",
          "Age",
          "Phone Number",
          "Occupation",
          "Disability Status",
          "Disability Notes",
          "Ward",
          "Village",
          "Household",
          "Consent Given",
          "Consent Date",
          "Recorder",
          "Notes",
          "Created At",
          ...(includePhotos ? ["Photo (Base64)", "Fingerprint (Base64)"] : []),
        ];

        const citizenRows = filteredCitizens.map((citizen) => {
          const ward = allWards.find((w) => w.id === citizen.wardId);
          const village = allVillages.find((v) => v.id === citizen.villageId);
          const household = allHouseholds.find(
            (h) => h.id === citizen.householdId,
          );

          return [
            citizen.uniqueId,
            citizen.firstName,
            citizen.lastName,
            citizen.otherNames || "",
            citizen.sex,
            citizen.dateOfBirth
              ? format(citizen.dateOfBirth, "yyyy-MM-dd")
              : "",
            citizen.age?.toString() || "",
            citizen.phoneNumber || "",
            citizen.occupation || "",
            citizen.disabilityStatus,
            citizen.disabilityNotes || "",
            ward?.name || "",
            village?.name || "",
            household?.headName || "",
            citizen.consentGiven ? "Yes" : "No",
            citizen.consentDate
              ? format(citizen.consentDate, "yyyy-MM-dd HH:mm")
              : "",
            citizen.recorderName || "",
            citizen.notes || "",
            format(citizen.createdAt, "yyyy-MM-dd HH:mm"),
            ...(includePhotos
              ? [citizen.photoData || "", citizen.fingerprintData || ""]
              : []),
          ];
        });

        const citizenCSV = [
          citizenHeaders.join(","),
          ...citizenRows.map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        downloadCSV(
          citizenCSV,
          `citizens_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`,
        );
      }

      if (exportType === "households" || exportType === "all") {
        // Households CSV
        const householdHeaders = [
          "Household Code",
          "Head of Household",
          "Ward",
          "Village",
          "Location Description",
          "Member Count",
          "Created At",
        ];

        const householdRows = filteredHouseholds.map((household) => {
          const village = allVillages.find((v) => v.id === household.villageId);
          const ward = village
            ? allWards.find((w) => w.id === village.wardId)
            : null;
          const memberCount = allCitizens.filter(
            (c) => c.householdId === household.id,
          ).length;

          return [
            household.code,
            household.headName,
            ward?.name || "",
            village?.name || "",
            household.locationDescription || "",
            memberCount.toString(),
            format(household.createdAt, "yyyy-MM-dd HH:mm"),
          ];
        });

        const householdCSV = [
          householdHeaders.join(","),
          ...householdRows.map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        downloadCSV(
          householdCSV,
          `households_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`,
        );
      }

      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
            <h1 className="text-lg font-bold text-slate-800">Export Data</h1>
            <p className="text-xs text-slate-500">
              Download records as CSV files
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Summary Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Data Summary</CardTitle>
            <CardDescription>Current records in database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                <Building2 className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-lg font-bold text-purple-700">
                    {stats.wards}
                  </p>
                  <p className="text-xs text-purple-600">Wards</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-700">
                    {stats.villages}
                  </p>
                  <p className="text-xs text-blue-600">Villages</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                <Home className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-lg font-bold text-amber-700">
                    {stats.households}
                  </p>
                  <p className="text-xs text-amber-600">Households</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-lg font-bold text-emerald-700">
                    {stats.citizens}
                  </p>
                  <p className="text-xs text-emerald-600">Citizens</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Export Type</Label>
              <Select
                value={exportType}
                onValueChange={(v: "citizens" | "households" | "all") =>
                  setExportType(v)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizens">Citizens Only</SelectItem>
                  <SelectItem value="households">Households Only</SelectItem>
                  <SelectItem value="all">Both (Separate Files)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Filter by Ward</Label>
              <Select value={filterWardId} onValueChange={setFilterWardId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {wards?.map((ward) => (
                    <SelectItem key={ward.id} value={String(ward.id)}>
                      {ward.code} - {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(exportType === "citizens" || exportType === "all") && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                <Checkbox
                  id="includePhotos"
                  checked={includePhotos}
                  onCheckedChange={(checked) =>
                    setIncludePhotos(checked === true)
                  }
                />
                <div>
                  <Label htmlFor="includePhotos" className="cursor-pointer">
                    Include photo data
                  </Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Exports photos as Base64 (increases file size significantly)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(exportType === "citizens" || exportType === "all") && (
                <div className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">citizens_export.csv</p>
                      <p className="text-xs text-slate-500">
                        {filterWardId === "all"
                          ? `${stats.citizens} records`
                          : "Filtered by ward"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                </div>
              )}

              {(exportType === "households" || exportType === "all") && (
                <div className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">households_export.csv</p>
                      <p className="text-xs text-slate-500">
                        {filterWardId === "all"
                          ? `${stats.households} records`
                          : "Filtered by ward"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                </div>
              )}
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              onClick={exportToCSV}
              disabled={exporting || stats.citizens === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export to CSV"}
            </Button>

            {stats.citizens === 0 && (
              <p className="text-center text-sm text-slate-500 mt-2">
                No data to export. Register some citizens first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Import/Export Tools */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Import Citizens
            </CardTitle>
            <CardDescription>
              Bulk import citizens from CSV files with validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from CSV
            </Button>
          </CardContent>
        </Card>

        {/* Cloud Sync */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Cloud Sync
            </CardTitle>
            <CardDescription>
              Sync data across devices or share with team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => setShowCloudSync(true)}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Open Cloud Sync
            </Button>
          </CardContent>
        </Card>

        {/* Map View */}
        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="w-5 h-5 text-teal-600" />
              Location Map
            </CardTitle>
            <CardDescription>
              View households on an interactive map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-teal-300 text-teal-700 hover:bg-teal-100"
              onClick={() => setShowMap(true)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Open Map View
            </Button>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="w-5 h-5 text-amber-600" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Create full backups or restore from previous backups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setShowBackup(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Open Backup Manager
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              How to Use Exported Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="font-bold text-emerald-600">1.</span>
                Tap "Export to CSV" to download the file
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-600">2.</span>
                Open with Excel, Google Sheets, or any spreadsheet app
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-600">3.</span>
                Review and analyze your registration data
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-emerald-600">4.</span>
                Share via email, WhatsApp, or cloud storage
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Backup/Restore Dialog */}
      <BackupRestore
        open={showBackup}
        onClose={() => setShowBackup(false)}
      />

      {/* CSV Import Dialog */}
      <CSVImport
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() => {
          setShowImport(false);
          toast.success("Import completed");
        }}
      />

      {/* Cloud Sync Dialog */}
      <CloudSync
        open={showCloudSync}
        onClose={() => setShowCloudSync(false)}
      />

      {/* Map View Dialog */}
      <MapView
        open={showMap}
        onClose={() => setShowMap(false)}
      />
    </div>
  );
}
