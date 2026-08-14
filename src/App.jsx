/**
 * App.jsx
 * Root app component with bottom navigation.
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

const PAGES = {
  dashboard: Dashboard,

  // Money section
  money: Expenses,

  // Goals section
  goals: Savings,

  // More section
  more: Settings,

  // Existing pages — keep these available
  expenses: Expenses,
  income: Income,
  cards: Cards,
  savings: Savings,
  forecast: Forecast,
  calendar: Calendar,
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
