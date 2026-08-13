/**
 * App.jsx
 * Root app component with bottom navigation.
 *
 * Budget Blossom
 *
 * Navigation behavior:
 *   • Switches between app pages
 *   • Automatically scrolls to the top when changing sections
 */

import { useEffect, useState } from "react";

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

const PAGES = {
  dashboard: Dashboard,
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

  const CurrentPage =
    PAGES[activePage] ?? Dashboard;

  // ─────────────────────────────────────────────
  // Scroll to the top whenever the user changes
  // sections through the bottom navigation.
  // ─────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // Extra reset for browsers that keep the document
    // scroll position during React page changes.
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activePage]);

  return (
    <ThemeProvider>
      <CurrentPage />

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
      />
    </ThemeProvider>
  );
}
