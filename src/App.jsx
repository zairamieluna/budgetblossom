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

  // Money
  money: Expenses,

  // Goals
  goals: Savings,

  // Scanner
  scan: Scanner,

  // More
  more: Settings,

  // Existing pages — kept available
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
