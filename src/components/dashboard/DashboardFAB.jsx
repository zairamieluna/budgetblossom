/**
 * DashboardFAB.jsx
 *
 * Budget Blossom
 *
 * Floating Action Button + Quick Actions
 */

import { useState } from "react";

import FloatingActionButton from "../common/FloatingActionButton";
import QuickActionsMenu from "../common/QuickActionsMenu";

export default function DashboardFAB({
  onAction,
}) {
  const [open, setOpen] = useState(false);

  function handleSelect(action) {
    setOpen(false);

    onAction?.(action);
  }

  return (
    <>
      <FloatingActionButton
        icon="＋"
        label="Quick Actions"
        onClick={() => setOpen(true)}
      />

      <QuickActionsMenu
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
      />
    </>
  );
}
