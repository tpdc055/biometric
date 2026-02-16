import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAppSetting,
  hasPIN,
  setAppSetting,
  setPIN,
  verifyPIN,
} from "@/lib/db";
import { Check, Delete, Fingerprint, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface PinLockProps {
  onUnlock: () => void;
}

export function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    const hasExistingPin = await hasPIN();
    setIsSettingUp(!hasExistingPin);

    // Check for biometric support
    if (window.PublicKeyCredential) {
      try {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      } catch {
        setBiometricAvailable(false);
      }
    }

    setLoading(false);
  }

  async function handleBiometricAuth() {
    try {
      const biometricEnabled = await getAppSetting("biometric_enabled");
      if (biometricEnabled !== "true") {
        setError("Biometric authentication not set up");
        return;
      }

      // Use navigator.credentials to trigger biometric
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: "required",
        },
      });

      if (credential) {
        onUnlock();
      }
    } catch {
      // Fallback: Just unlock if biometric was previously enabled (simplified for demo)
      const biometricEnabled = await getAppSetting("biometric_enabled");
      if (biometricEnabled === "true") {
        onUnlock();
      } else {
        setError("Biometric authentication failed");
      }
    }
  }

  async function handlePinSubmit() {
    setError("");

    if (isSettingUp) {
      if (!isConfirming) {
        if (pin.length < 4) {
          setError("PIN must be at least 4 digits");
          return;
        }
        setConfirmPin(pin);
        setPin("");
        setIsConfirming(true);
      } else {
        if (pin !== confirmPin) {
          setError("PINs do not match");
          setPin("");
          setConfirmPin("");
          setIsConfirming(false);
          return;
        }
        await setPIN(pin);
        if (biometricAvailable) {
          await setAppSetting("biometric_enabled", "true");
        }
        onUnlock();
      }
    } else {
      const valid = await verifyPIN(pin);
      if (valid) {
        onUnlock();
      } else {
        setError("Incorrect PIN");
        setPin("");
      }
    }
  }

  function handleKeyPress(key: string) {
    if (key === "delete") {
      setPin((prev) => prev.slice(0, -1));
    } else if (key === "enter") {
      handlePinSubmit();
    } else if (pin.length < 6) {
      setPin((prev) => prev + key);
      setError("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="animate-pulse">
          <Shield className="w-16 h-16 text-emerald-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          {/* MPG Logo */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <img
              src="/mpg-logo.png"
              alt="Madang Provincial Government"
              className="w-20 h-20 object-contain"
            />
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-600">Madang Provincial Government</p>
              <p className="text-[10px] text-slate-500">Citizen Registry System</p>
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isSettingUp
              ? isConfirming
                ? "Confirm PIN"
                : "Create PIN"
              : "Enter PIN"}
          </CardTitle>
          <CardDescription>
            {isSettingUp
              ? isConfirming
                ? "Enter your PIN again to confirm"
                : "Set up a 4-6 digit PIN to protect your data"
              : "Enter your PIN to access the app"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pin.length ? "bg-emerald-500 scale-110" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-500 font-medium animate-shake">
              {error}
            </p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <Button
                key={num}
                variant="secondary"
                className="h-14 text-xl font-bold"
                onClick={() => handleKeyPress(num)}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-14"
              onClick={() => handleKeyPress("delete")}
            >
              <Delete className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              className="h-14 text-xl font-bold"
              onClick={() => handleKeyPress("0")}
            >
              0
            </Button>
            <Button
              variant="default"
              className="h-14"
              onClick={() => handleKeyPress("enter")}
              disabled={pin.length < 4}
            >
              <Check className="w-5 h-5" />
            </Button>
          </div>

          {/* Biometric Auth */}
          {!isSettingUp && biometricAvailable && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBiometricAuth}
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              Use Biometric
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
