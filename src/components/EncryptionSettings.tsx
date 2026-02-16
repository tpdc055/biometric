import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getAppSetting, setAppSetting } from "@/lib/db";
import {
  isEncryptionSupported,
  hashValue,
  SENSITIVE_FIELDS,
} from "@/lib/encryption";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface EncryptionSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function EncryptionSettings({ open, onClose }: EncryptionSettingsProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(SENSITIVE_FIELDS)
  );

  // Check encryption status on mount
  useEffect(() => {
    if (open) {
      checkEncryptionStatus();
    }
  }, [open]);

  async function checkEncryptionStatus() {
    setIsSupported(isEncryptionSupported());

    const enabled = await getAppSetting("encryption_enabled");
    setIsEnabled(enabled === "true");

    const passwordHash = await getAppSetting("encryption_password_hash");
    setHasPassword(!!passwordHash);

    const fieldsStr = await getAppSetting("encrypted_fields");
    if (fieldsStr) {
      try {
        setSelectedFields(new Set(JSON.parse(fieldsStr)));
      } catch {
        setSelectedFields(new Set(SENSITIVE_FIELDS));
      }
    }
  }

  const handleEnableEncryption = useCallback(async () => {
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Hash and store password
      const hash = await hashValue(password);
      await setAppSetting("encryption_password_hash", hash);
      await setAppSetting("encryption_enabled", "true");
      await setAppSetting("encrypted_fields", JSON.stringify([...selectedFields]));

      setIsEnabled(true);
      setHasPassword(true);
      setPassword("");
      setConfirmPassword("");

      toast.success("Encryption enabled successfully");
    } catch (error) {
      console.error("Failed to enable encryption:", error);
      toast.error("Failed to enable encryption");
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword, selectedFields]);

  const handleDisableEncryption = useCallback(async () => {
    setLoading(true);
    try {
      await setAppSetting("encryption_enabled", "false");
      // Note: We keep the password hash in case they want to re-enable

      setIsEnabled(false);
      setShowDisableConfirm(false);

      toast.success("Encryption disabled");
    } catch (error) {
      console.error("Failed to disable encryption:", error);
      toast.error("Failed to disable encryption");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleField = (field: string) => {
    const newFields = new Set(selectedFields);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    setSelectedFields(newFields);
  };

  const fieldLabels: Record<string, string> = {
    photoData: "Photos",
    fingerprintData: "Fingerprints",
    phoneNumber: "Phone Numbers",
    notes: "Notes",
    disabilityNotes: "Disability Notes",
    locationDescription: "Location Descriptions",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Data Encryption
            </DialogTitle>
            <DialogDescription>
              Protect sensitive citizen data with encryption at rest
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Support Check */}
            {!isSupported && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Encryption not supported</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Your browser does not support the Web Crypto API required for encryption.
                </p>
              </div>
            )}

            {/* Current Status */}
            <div className={`p-4 rounded-xl border ${
              isEnabled
                ? "bg-emerald-50 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-3">
                {isEnabled ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-600" />
                ) : (
                  <ShieldOff className="w-8 h-8 text-slate-400" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${isEnabled ? "text-emerald-800" : "text-slate-600"}`}>
                    {isEnabled ? "Encryption Enabled" : "Encryption Disabled"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isEnabled
                      ? "Sensitive data is encrypted before storage"
                      : "Data is stored without encryption"
                    }
                  </p>
                </div>
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {/* Enable Encryption Form */}
            {!isEnabled && isSupported && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="encPassword">Encryption Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="encPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Minimum 6 characters. Keep this password safe!
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Field Selection */}
                <div>
                  <Label>Fields to Encrypt</Label>
                  <div className="mt-2 space-y-2">
                    {SENSITIVE_FIELDS.map((field) => (
                      <div key={field} className="flex items-center gap-3">
                        <Checkbox
                          id={`field-${field}`}
                          checked={selectedFields.has(field)}
                          onCheckedChange={() => toggleField(field)}
                        />
                        <Label
                          htmlFor={`field-${field}`}
                          className="text-sm text-slate-700 cursor-pointer"
                        >
                          {fieldLabels[field] || field}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleEnableEncryption}
                  disabled={loading || !password || password !== confirmPassword}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Enable Encryption
                </Button>
              </div>
            )}

            {/* Disable Encryption Option */}
            {isEnabled && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium mb-2">
                    Currently encrypting:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[...selectedFields].map((field) => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {fieldLabels[field] || field}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDisableConfirm(true)}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Disable Encryption
                </Button>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium">Important:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• If you forget your password, encrypted data cannot be recovered</li>
                    <li>• Encryption applies to new data only</li>
                    <li>• Backup your data before enabling encryption</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation */}
      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Disable Encryption?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Disabling encryption will store new data without encryption.
              Previously encrypted data will remain encrypted until it's updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableEncryption}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="w-4 h-4 mr-2" />
              )}
              Disable Encryption
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
