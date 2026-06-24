/**
 * App.jsx
 * Root app component with bottom-nav page routing.
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

  const PageComponent = PAGES[activePage] || Dashboard;

  return (
    <ThemeProvider>
      <PageComponent />
      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
      />
    </ThemeProvider>
  );
}
