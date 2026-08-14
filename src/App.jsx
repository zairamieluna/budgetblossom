/**
 * App.jsx
 * Budget Blossom
 */

import { useState } from "react";

import "./styles/globals.css";

import { ThemeProvider } from "./context/ThemeContext";

import BottomNav from "./components/common/BottomNav";

import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Cards from "./pages/Cards";
import Savings from "./pages/Savings";
import Forecast from "./pages/Forecast";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";

import SmartScanController from "./components/common/scanner/SmartScanController";

const PAGES = {
  dashboard: Dashboard,

  // Money
  money: Expenses,

  // Goals
  goals: Savings,

  // More
  more: Settings,

  // Other pages remain available
  expenses: Expenses,
  income: Income,
  cards: Cards,
  savings: Savings,
  forecast: Forecast,
  calendar: Calendar,
  settings: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [scannerOpen, setScannerOpen] = useState(false);

  const CurrentPage = PAGES[activePage] ?? Dashboard;

  function handleScan() {
    setScannerOpen(true);
  }

  function handleCloseScanner() {
    setScannerOpen(false);
  }

  return (
    <ThemeProvider>
      <CurrentPage />

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
        onScan={handleScan}
      />

      {/* Smart Scanner lives at the App level */}
      <SmartScanController
        open={scannerOpen}
        onClose={handleCloseScanner}
      />
    </ThemeProvider>
  );
}
