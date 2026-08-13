/**
 * App.jsx
 * Budget Blossom
 *
 * Root app component with bottom navigation.
 *
 * Navigation:
 *   Home  → Dashboard
 *   Money → Expenses
 *   Goals → Savings
 *   Scan  → Scanner / Expenses
 *   More  → Settings
 */

import { useEffect, useState } from "react";

import "./styles/globals.css";

import { ThemeProvider } from "./context/ThemeContext";

import BottomNav from "./components/common/BottomNav";

import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Savings from "./pages/Savings";
import Settings from "./pages/Settings";

const PAGES = {
  dashboard: Dashboard,

  // Bottom navigation → actual page
  money: Expenses,
  goals: Savings,

  // Scan currently uses the Expenses area until
  // the dedicated Scanner page is connected.
  scan: Expenses,

  // More currently opens Settings.
  more: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const CurrentPage = PAGES[activePage] ?? Dashboard;

  function handleNavigate(page) {
    setActivePage(page);
  }

  /*
   * Reset scrolling every time the user changes
   * sections.
   *
   * We reset both the browser window and the
   * document/body because different browsers
   * handle mobile-style layouts differently.
   */
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      /*
       * Reset common app containers if the app's
       * CSS makes one of them scrollable.
       */
      const scrollContainers = document.querySelectorAll(
        "main, .bb-dashboard, .bb-page, .bb-content, .bb-app-content"
      );

      scrollContainers.forEach((element) => {
        if (element) {
          element.scrollTop = 0;
        }
      });
    };

    // Run after React renders the new page.
    requestAnimationFrame(resetScroll);

    // Run once more after layout/paint.
    const timer = setTimeout(resetScroll, 50);

    return () => clearTimeout(timer);
  }, [activePage]);

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
