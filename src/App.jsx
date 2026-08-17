/**
 * App.jsx
 * Budget Blossom
 *
 * Main application shell and navigation.
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
import Debts from "./pages/Debts";
import Jars from "./pages/Jars";

const PAGES = {
  dashboard: Dashboard,

  // Money
  money: Expenses,

  // Goals
  goals: Savings,

  // More
  more: Settings,

  // Existing pages
  expenses: Expenses,
  income: Income,
  cards: Cards,
  savings: Savings,
  forecast: Forecast,
  calendar: Calendar,
  settings: Settings,
  debts: Debts,
  jars: Jars,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const CurrentPage = PAGES[activePage] || Dashboard;

  return (
    <ThemeProvider>
      <div className="app-shell">
        <CurrentPage />

        <BottomNav
          activePage={activePage}
          onNavigate={setActivePage}
        />
      </div>
    </ThemeProvider>
  );
}
