/**
 * App.jsx
 * Budget Blossom
 */

import { useState, useEffect } from "react";

import "./styles/globals.css";
import { ThemeProvider } from "./context/ThemeContext";

import BottomNav from "./components/common/BottomNav";

import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Savings from "./pages/Savings";
import Settings from "./pages/Settings";
import ScannerModal from "./components/common/ScannerModal";

const PAGES = {
  dashboard: Dashboard,
  money: Expenses,
  income: Income,
  goals: Savings,
  settings: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Always start each page at the top
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [activePage]);

  function handleNavigate(page) {
    if (page === "scan") {
      setScannerOpen(true);
      return;
    }

    setActivePage(page);
  }

  const CurrentPage = PAGES[activePage] ?? Dashboard;

  return (
    <ThemeProvider>
      <CurrentPage />

      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onFileSelected={(file) => {
          console.log("Selected file:", file);
          setScannerOpen(false);
        }}
      />
    </ThemeProvider>
  );
}
