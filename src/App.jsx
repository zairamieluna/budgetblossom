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

const PAGES = {
  dashboard: Dashboard,

  // Money section
  money: Expenses,

  // Goals section
  goals: Savings,

  // More section
  more: Settings,

  // Existing pages
  expenses: Expenses,
  income: Income,
  cards: Cards,
  savings: Savings,
  forecast: Forecast,
  calendar: Calendar,

  // Smart Scanner
  scan: Scanner,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  function handleNavigate(page) {
    setActivePage(page);
  }

  function handleScan() {
    setActivePage("scan");
  }

  const CurrentPage = PAGES[activePage] || Dashboard;

  return (
    <ThemeProvider>
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          position: "relative",
        }}
      >
        <CurrentPage />

        <BottomNav
          activePage={activePage}
          onNavigate={handleNavigate}
          onScan={handleScan}
        />
      </div>
    </ThemeProvider>
  );
}
