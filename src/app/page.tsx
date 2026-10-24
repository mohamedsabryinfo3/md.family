"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { ThemeProvider } from "@/components/mdfamily/ThemeProvider";
import { ToastViewport } from "@/components/mdfamily/ToastViewport";
import { ConfirmDialog } from "@/components/mdfamily/ConfirmDialog";
import { BottomNav } from "@/components/mdfamily/BottomNav";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { ChildrenScreen } from "@/components/screens/ChildrenScreen";
import { AddChildScreen } from "@/components/screens/AddChildScreen";
import { ChildProfileScreen } from "@/components/screens/ChildProfileScreen";
import { PairingScreen } from "@/components/screens/PairingScreen";
import { ScreenTimeScreen } from "@/components/screens/ScreenTimeScreen";
import { AppPoliciesScreen } from "@/components/screens/AppPoliciesScreen";
import { WebFilteringScreen } from "@/components/screens/WebFilteringScreen";
import { LocationScreen } from "@/components/screens/LocationScreen";
import { SafetyAlertsScreen } from "@/components/screens/SafetyAlertsScreen";
import { MotherPermissionsScreen } from "@/components/screens/MotherPermissionsScreen";
import { ContactsScreen } from "@/components/screens/ContactsScreen";
import { SchoolsScreen } from "@/components/screens/SchoolsScreen";
import { BackupScreen } from "@/components/screens/BackupScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { LiveSessionScreen } from "@/components/screens/LiveSessionScreen";

function CurrentScreen() {
  const authed = useStore((s) => s.authed);
  const screen = useStore((s) => s.screen);

  // On first mount, try to bootstrap from saved JWT
  useEffect(() => {
    apiActions.bootstrap();
  }, []);

  // Unauthed flow: splash -> login
  if (!authed) {
    if (screen === "login") return <LoginScreen />;
    return <SplashScreen />;
  }

  // Authenticated routing
  switch (screen) {
    case "splash":
    case "login":
      return <DashboardScreen />;
    case "dashboard":
      return <DashboardScreen />;
    case "children":
      return <ChildrenScreen />;
    case "addChild":
      return <AddChildScreen />;
    case "childProfile":
      return <ChildProfileScreen />;
    case "pairing":
      return <PairingScreen />;
    case "screenTime":
      return <ScreenTimeScreen />;
    case "appPolicies":
      return <AppPoliciesScreen />;
    case "webFiltering":
      return <WebFilteringScreen />;
    case "location":
      return <LocationScreen />;
    case "safetyAlerts":
      return <SafetyAlertsScreen />;
    case "motherPermissions":
      return <MotherPermissionsScreen />;
    case "contacts":
      return <ContactsScreen />;
    case "schools":
      return <SchoolsScreen />;
    case "backup":
      return <BackupScreen />;
    case "settings":
      return <SettingsScreen />;
    case "liveSession":
      return <LiveSessionScreen />;
    default:
      return <DashboardScreen />;
  }
}

const SHOW_BOTTOM_NAV_SCREENS = new Set([
  "dashboard",
  "screenTime",
  "location",
  "settings",
]);

export default function Home() {
  const screen = useStore((s) => s.screen);
  const authed = useStore((s) => s.authed);

  // Auto-advance from splash to login after the splash interacts (handled in splash via "Get started")
  // We don't auto-advance; user must tap.

  const showBottomNav = authed && SHOW_BOTTOM_NAV_SCREENS.has(screen);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className={showBottomNav ? "pb-20" : ""}>
          <CurrentScreen />
        </main>
        {showBottomNav && <BottomNav />}
        <ToastViewport />
        <ConfirmDialog />
      </div>
    </ThemeProvider>
  );
}
