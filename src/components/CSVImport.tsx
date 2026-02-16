import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db, type Citizen, generateCitizenId } from "@/lib/db";
import {
  normalizeCitizenData,
  validateImportBatch,
  type ValidationError,
  type DuplicateMatch,
} from "@/lib/validation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Users,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ImportPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: ValidationError[];
  duplicates: { row: number; matches: DuplicateMatch[] }[];
}

export function CSVImport({ open, onClose, onComplete }: CSVImportProps) {
  const [step, setStep] = useState<"upload" | "configure" | "preview" | "importing" | "complete">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedDuplicates, setExpandedDuplicates] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data queries
  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(() =>
    selectedWardId
      ? db.villages.where("wardId").equals(Number(selectedWardId)).toArray()
      : []
  , [selectedWardId]);
  const households = useLiveQuery(() =>
    selectedVillageId
      ? db.households.where("villageId").equals(Number(selectedVillageId)).toArray()
      : []
  , [selectedVillageId]);

  const selectedWard = wards?.find(w => String(w.id) === selectedWardId);
  const selectedVillage = villages?.find(v => String(v.id) === selectedVillageId);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      preview: 10, // Preview first 10 rows
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        // Count total rows
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (fullResults) => {
            setPreview({
              headers,
              rows,
              totalRows: fullResults.data.length,
            });
            setStep("configure");
          },
        });
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !selectedWardId || !selectedVillageId || !selectedHouseholdId) {
      toast.error("Please select ward, village, and household");
      return;
    }

    setStep("importing");
    setImporting(true);
    setProgress(0);

    try {
      // Parse entire file
      const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      const records = parseResult.data;
      const normalizedRecords = records.map(record => normalizeCitizenData(record));

      // Validate batch
      const { valid, errors, duplicates } = await validateImportBatch(normalizedRecords, {
        skipDuplicateCheck: !skipDuplicates,
      });

      // Import valid records
      let imported = 0;
      let skipped = 0;
      const duplicateRows = new Set(duplicates.map(d => d.row));

      for (let i = 0; i < valid.length; i++) {
        const record = valid[i];
        const rowNumber = i + 1;

        // Skip duplicates if option is enabled
        if (skipDuplicates && duplicateRows.has(rowNumber)) {
          skipped++;
          continue;
        }

        try {
          const uniqueId = await generateCitizenId(
            selectedWard?.code || "WARD",
            selectedVillage?.code || "VLG"
          );

          const citizen: Omit<Citizen, "id"> = {
            uniqueId,
            householdId: Number(selectedHouseholdId),
            villageId: Number(selectedVillageId),
            wardId: Number(selectedWardId),
            firstName: record.firstName || "",
            lastName: record.lastName || "",
            otherNames: record.otherNames,
            sex: record.sex || "male",
            dateOfBirth: record.dateOfBirth,
            age: record.age,
            phoneNumber: record.phoneNumber,
            occupation: record.occupation,
            disabilityStatus: record.disabilityStatus || "none",
            disabilityNotes: record.disabilityNotes,
            notes: record.notes,
            consentGiven: true,
            consentDate: new Date(),
            recorderName: "CSV Import",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.citizens.add(citizen);
          imported++;
        } catch (err) {
          console.error("Failed to import row:", rowNumber, err);
          errors.push({ field: "import", message: `Failed to import row ${rowNumber}`, row: rowNumber });
        }

        setProgress(Math.round(((i + 1) / valid.length) * 100));
      }

      setResult({
        imported,
        skipped,
        errors,
        duplicates,
      });
      setStep("complete");

      if (imported > 0) {
        toast.success(`Successfully imported ${imported} citizens`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import failed");
      setStep("configure");
    } finally {
      setImporting(false);
    }
  }, [file, selectedWardId, selectedVillageId, selectedHouseholdId, selectedWard, selectedVillage, skipDuplicates]);

  const toggleDuplicateExpanded = (row: number) => {
    const newExpanded = new Set(expandedDuplicates);
    if (newExpanded.has(row)) {
      newExpanded.delete(row);
    } else {
      newExpanded.add(row);
    }
    setExpandedDuplicates(newExpanded);
  };

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setSelectedWardId("");
    setSelectedVillageId("");
    setSelectedHouseholdId("");
    setResult(null);
    setProgress(0);
    setExpandedDuplicates(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleComplete = () => {
    resetState();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            Import Citizens from CSV
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with citizen data"}
            {step === "configure" && "Configure import settings"}
            {step === "preview" && "Review data before importing"}
            {step === "importing" && "Importing citizens..."}
            {step === "complete" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                tabIndex={0}
                role="button"
              >
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="font-medium text-slate-700">Click to select CSV file</p>
                <p className="text-sm text-slate-500 mt-1">or drag and drop</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-medium text-slate-700 text-sm mb-2">Expected CSV Format:</h4>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• First Name, Last Name (required)</li>
                  <li>• Sex/Gender (male/female or m/f)</li>
                  <li>• Date of Birth or Age</li>
                  <li>• Phone Number, Occupation</li>
                  <li>• Disability Status, Notes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === "configure" && preview && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-medium text-emerald-800">{file?.name}</p>
                  <p className="text-sm text-emerald-600">{preview.totalRows} rows found</p>
                </div>
                <Button variant="ghost" size="icon" onClick={resetState}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Column preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Detected columns:</p>
                <div className="flex flex-wrap gap-1">
                  {preview.headers.map((header) => (
                    <Badge key={header} variant="secondary" className="text-xs">
                      {header}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Location selection */}
              <div className="space-y-3">
                <div>
                  <Label>Ward *</Label>
                  <Select value={selectedWardId} onValueChange={(v) => {
                    setSelectedWardId(v);
                    setSelectedVillageId("");
                    setSelectedHouseholdId("");
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select ward..." />
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
                  <Label>Village *</Label>
                  <Select
                    value={selectedVillageId}
                    onValueChange={(v) => {
                      setSelectedVillageId(v);
                      setSelectedHouseholdId("");
                    }}
                    disabled={!selectedWardId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select village..." />
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

                <div>
                  <Label>Household *</Label>
                  <Select
                    value={selectedHouseholdId}
                    onValueChange={setSelectedHouseholdId}
                    disabled={!selectedVillageId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select household..." />
                    </SelectTrigger>
                    <SelectContent>
                      {households?.map((household) => (
                        <SelectItem key={household.id} value={String(household.id)}>
                          {household.code} - {household.headName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
                />
                <div>
                  <Label htmlFor="skipDuplicates" className="cursor-pointer text-amber-800">
                    Skip potential duplicates
                  </Label>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Skip records that match existing citizens by name, phone, or date of birth
                  </p>
                </div>
              </div>

              {/* Preview table */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 rows):</p>
                <ScrollArea className="h-32 rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {preview.headers.slice(0, 4).map((header) => (
                          <th key={header} className="px-2 py-1 text-left font-medium text-slate-600">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {preview.headers.slice(0, 4).map((header) => (
                            <td key={header} className="px-2 py-1 text-slate-600 truncate max-w-[100px]">
                              {row[header] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <Button
                className="w-full"
                onClick={handleImport}
                disabled={!selectedWardId || !selectedVillageId || !selectedHouseholdId}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {preview.totalRows} Citizens
              </Button>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-spin" />
              <p className="font-medium text-slate-700">Importing citizens...</p>
              <p className="text-sm text-slate-500 mt-1">{progress}% complete</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700">{result.imported}</p>
                  <p className="text-xs text-emerald-600">Imported</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-700">{result.skipped}</p>
                  <p className="text-xs text-amber-600">Skipped</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <h4 className="font-medium text-red-800 text-sm mb-2">Validation Errors:</h4>
                  <ScrollArea className="h-24">
                    <ul className="text-xs text-red-600 space-y-1">
                      {result.errors.slice(0, 10).map((error, i) => (
                        <li key={i}>
                          Row {error.row}: {error.field} - {error.message}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li className="font-medium">...and {result.errors.length - 10} more</li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {/* Duplicates */}
              {result.duplicates.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <h4 className="font-medium text-amber-800 text-sm mb-2">
                    Potential Duplicates Detected ({result.duplicates.length}):
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {result.duplicates.slice(0, 5).map((dup) => (
                        <div key={dup.row} className="bg-white rounded-lg p-2 border border-amber-200">
                          <button
                            className="w-full flex items-center justify-between text-left"
                            onClick={() => toggleDuplicateExpanded(dup.row)}
                          >
                            <span className="text-xs font-medium text-amber-700">
                              Row {dup.row}: {dup.matches.length} potential match(es)
                            </span>
                            {expandedDuplicates.has(dup.row) ? (
                              <ChevronUp className="w-4 h-4 text-amber-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-amber-600" />
                            )}
                          </button>
                          {expandedDuplicates.has(dup.row) && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              {dup.matches.map((match, i) => (
                                <div key={i} className="text-xs text-amber-600">
                                  <span className="font-medium">
                                    {match.citizen.firstName} {match.citizen.lastName}
                                  </span>
                                  <span className="ml-2 text-amber-500">
                                    ({Math.round(match.matchScore * 100)}% match)
                                  </span>
                                  <ul className="mt-1 ml-2">
                                    {match.matchReasons.map((reason, j) => (
                                      <li key={j}>• {reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Button className="w-full" onClick={handleComplete}>
                <Users className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
