/**
 * App.jsx
 * Budget Blossom
 *
 * Root application with bottom navigation.
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
import Scanner from "./pages/Scanner";

/*
 * Main navigation pages.
 *
 * The bottom navigation uses:
 * Home  → Dashboard
 * Money → Expenses
 * Goals → Savings
 * Scan  → Scanner
 * More  → Settings
 */
const PAGES = {
  dashboard: Dashboard,

  // Money section
  money: Expenses,

  // Goals section
  goals: Savings,

  // Scanner
  scan: Scanner,

  // More section
  more: Settings,

  // Keep these available for existing navigation
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

  const CurrentPage = PAGES[activePage] ?? Dashboard;

  function handleNavigate(page) {
    console.log("Navigating to:", page);
    setActivePage(page);
  }

  return (
    <ThemeProvider>
      <CurrentPage />

      <BottomNav
        activePage={activePage}
        onNavigate={handleNavigate}
      />
    </ThemeProvider>
  );
}
