/**
 * App.jsx
 * Root app component with bottom-nav page routing.
 */

import { useState } from "react";
import "./styles/globals.css";

import BottomNav  from "./components/common/BottomNav";
import Dashboard  from "./pages/Dashboard";
import Expenses   from "./pages/Expenses";
import Debts      from "./pages/Debts";
import Jars       from "./pages/Jars";
import Calendar   from "./pages/Calendar";
import Income     from "./pages/Income";
import Settings   from "./pages/Settings";

const PAGES = {
  dashboard: Dashboard,
  expenses:  Expenses,
  debts:     Debts,
  jars:      Jars,
  calendar:  Calendar,
  income:    Income,
  settings:  Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const PageComponent = PAGES[activePage] || Dashboard;

  return (
    <>
      <PageComponent />
      <BottomNav activePage={activePage} onNavigate={setActivePage} />
    </>
  );
}
