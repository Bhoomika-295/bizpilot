import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import DashboardV2 from "./pages/DashboardV2";
import DataManagement from "./pages/DataManagement";
import CsvImport from "./pages/CsvImport";
import UserProfile from "./pages/UserProfile";
import CustomersV2 from "./pages/CustomersV2";
import CompetitorsPage from "./pages/CompetitorsPage";
import ActionsPage from "./pages/ActionsPage";
import MemoryPage from "./pages/MemoryPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/auth"} component={Auth} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/profile"} component={UserProfile} />
      <Route path={"/dashboard/:businessId"} component={DashboardV2} />
      <Route path={"/actions/:businessId"} component={ActionsPage} />
      <Route path={"/memory/:businessId"} component={MemoryPage} />
      <Route path={"/competitors/:businessId"} component={CompetitorsPage} />
      <Route path={"/customers/:businessId"} component={CustomersV2} />
      <Route path={"/data/:businessId"} component={DataManagement} />
      <Route path={"/import/:businessId"} component={CsvImport} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
