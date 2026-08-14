/**
 * App.jsx
 * Root app component with bottom navigation.
 */

import { useState } from "react";

import "./styles/globals.css";

import { ThemeProvider } from "./context/ThemeContext";

import BottomNav from "./components/common/BottomNav";
import ScannerModal from "./components/common/scanner/ScannerModal";

import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Cards from "./pages/Cards";
import Savings from "./pages/Savings";
import Forecast from "./pages/Forecast";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";

const PAGES = {
  dashboard: Dashboard,

  // Bottom navigation
  money: Expenses,
  goals: Savings,
  more: Settings,

  // Existing pages
  expenses: Expenses,
  income: Income,
  cards: Cards,
  savings: Savings,
  forecast: Forecast,
  calendar: Calendar,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);

  const CurrentPage = PAGES[activePage] ?? Dashboard;

  function handleScan() {
    setScannerOpen(true);
  }

  function handleFileSelected(file) {
    console.log("Selected file:", file);

    // Keep the modal open for now.
    // We can connect the actual AI/Supabase scanning next.
  }

  return (
    <ThemeProvider>
      <CurrentPage />

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        onScan={handleScan}
      />

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onFileSelected={handleFileSelected}
      />
    </ThemeProvider>
  );
}
