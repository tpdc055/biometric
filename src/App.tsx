import { PinLock } from "@/components/PinLock";
import { SplashScreen } from "@/components/SplashScreen";
import { LanguageProvider } from "@/components/LanguageProvider";
import { type Citizen, db, getAppSetting, setAppSetting } from "@/lib/db";
import { CitizenScreen } from "@/screens/CitizenScreen";
import { Dashboard } from "@/screens/Dashboard";
import { ExportScreen } from "@/screens/ExportScreen";
import { HouseholdScreen } from "@/screens/HouseholdScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { SetupScreen } from "@/screens/SetupScreen";
import { AnalyticsScreen } from "@/screens/AnalyticsScreen";
import { HelpScreen } from "@/screens/HelpScreen";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { initializeSyncService } from "@/lib/sync";

type Screen =
  | "setup"
  | "dashboard"
  | "household"
  | "citizen"
  | "search"
  | "export"
  | "analytics"
  | "help";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if setup is complete
  const wards = useLiveQuery(() => db.wards.toArray().catch(() => []), []);
  const hasSetup = wards && wards.length > 0;

  useEffect(() => {
    checkInitialState();
  }, []);

  useEffect(() => {
    // If no setup done, redirect to setup after unlock
    if (!isLocked && !hasSetup && currentScreen === "dashboard") {
      setCurrentScreen("setup");
    }
  }, [isLocked, hasSetup, currentScreen]);

  async function checkInitialState() {
    try {
      // Ensure database is open
      await db.open();

      // Check if this is first run
      const isFirstRun = await getAppSetting("first_run_complete");
      if (!isFirstRun) {
        await setAppSetting("first_run_complete", "true");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }

    // Initialize sync service for real-time sync
    try {
      await initializeSyncService();
    } catch (error) {
      console.error("Failed to initialize sync service:", error);
    }

    setLoading(false);
  }

  function handleUnlock() {
    setIsLocked(false);
  }

  function handleNavigate(screen: string) {
    setEditingCitizen(null);
    setCurrentScreen(screen as Screen);
  }

  function handleEditCitizen(citizen: Citizen) {
    setEditingCitizen(citizen);
    setCurrentScreen("citizen");
  }

  function handleSetupComplete() {
    setCurrentScreen("dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="animate-pulse text-emerald-500">Loading...</div>
      </div>
    );
  }

  // Wrap everything in LanguageProvider
  return (
    <LanguageProvider>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {!showSplash && isLocked && (
        <>
          <PinLock onUnlock={handleUnlock} />
          <Toaster position="top-center" richColors />
        </>
      )}

      {!showSplash && !isLocked && (
        <>
          {currentScreen === "setup" && (
            <SetupScreen onComplete={handleSetupComplete} />
          )}
          {currentScreen === "dashboard" && (
            <Dashboard onNavigate={handleNavigate} />
          )}
          {currentScreen === "household" && (
            <HouseholdScreen onBack={() => handleNavigate("dashboard")} />
          )}
          {currentScreen === "citizen" && (
            <CitizenScreen
              onBack={() => handleNavigate("dashboard")}
              editingCitizen={editingCitizen}
            />
          )}
          {currentScreen === "search" && (
            <SearchScreen
              onBack={() => handleNavigate("dashboard")}
              onEditCitizen={handleEditCitizen}
            />
          )}
          {currentScreen === "export" && (
            <ExportScreen onBack={() => handleNavigate("dashboard")} />
          )}
          {currentScreen === "analytics" && (
            <AnalyticsScreen onBack={() => handleNavigate("dashboard")} />
          )}
          {currentScreen === "help" && (
            <HelpScreen onBack={() => handleNavigate("dashboard")} />
          )}
          <Toaster position="top-center" richColors />
        </>
      )}
    </LanguageProvider>
  );
}

export default App;
