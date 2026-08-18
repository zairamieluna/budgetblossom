/**
 * Income.jsx
 * Budget Blossom
 *
 * Income + Work Hours
 *
 * Features:
 * - Household income sources
 * - Add / edit / delete jobs
 * - Pay-period configuration
 * - Add work hours
 * - Edit / delete saved shifts
 * - Automatic chronological sorting
 * - Regular / Overtime / Stat Holiday
 * - Holiday multipliers
 * - Night differential
 * - Freezer premium
 * - Payroll estimate
 * - Persistent localStorage
 */

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "budgetBlossom_income_v3";
const OLD_STORAGE_KEYS = [
  "budgetBlossom_income_v2",
  "budgetBlossom_income",
  "incomeData",
];

const DEFAULT_JOBS = [
  {
    id: "zai-aw",
    owner: "Zai",
    employer: "A&W",
    position: "Cashier/Kitchen",
    hourlyRate: 18,
    payFrequency: "biweekly",
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",
    open: false,
    shifts: [],
  },
  {
    id: "zai-loblaws",
    owner: "Zai",
    employer: "Loblaws",
    position: "Employee",
    hourlyRate: 17.6,
    payFrequency: "biweekly",
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",
    open: false,
    shifts: [],
  },
  {
    id: "ariel-witron",
    owner: "Ariel",
    employer: "Witron",
    position: "Equipment Operator",
    hourlyRate: 21,
    payFrequency: "biweekly",
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",
    open: false,
    shifts: [],
  },
];

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function money(value) {
  return Number(value || 0).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  });
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function getHours(start, end, breakMinutes = 0) {
  if (!start || !end) return 0;

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Handles overnight shifts.
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const totalMinutes =
    endMinutes -
    startMinutes -
    numberValue(breakMinutes);

  return Math.max(0, totalMinutes / 60);
}

function sortShifts(shifts = []) {
  return [...shifts].sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    return (a.start || "").localeCompare(b.start || "");
  });
}

/* -------------------------------------------------------
   Holiday helpers
------------------------------------------------------- */

function getCanadianHolidayName(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Fixed-date holidays.
  if (month === 1 && day === 1) {
    return "New Year's Day";
  }

  if (month === 7 && day === 1) {
    return "Canada Day";
  }

  if (month === 11 && day === 11) {
    return "Remembrance Day";
  }

  if (month === 12 && day === 25) {
    return "Christmas Day";
  }

  if (month === 12 && day === 26) {
    return "Boxing Day";
  }

  return "";
}

/* -------------------------------------------------------
   Initial shift
------------------------------------------------------- */

function emptyShift() {
  return {
    id: makeId("shift"),
    date: "",
    start: "",
    end: "",
    breakMinutes: 30,

    payType: "Regular",

    overtimeMultiplier: 1.5,

    holidayName: "",
    holidayMultiplier: 1.5,

    nightDifferential: false,
    nightDifferentialMultiplier: 1.2,

    freezerPremium: false,
    freezerPremiumMultiplier: 1.2,

    notes: "",
  };
}

/* -------------------------------------------------------
   Normalize old saved data
------------------------------------------------------- */

function normalizeShift(shift) {
  const normalized = {
    ...emptyShift(),
    ...shift,
  };

  return {
    ...normalized,
    id: shift.id || makeId("shift"),
    breakMinutes: numberValue(
      shift.breakMinutes,
      30
    ),
    overtimeMultiplier: numberValue(
      shift.overtimeMultiplier,
      1.5
    ),
    holidayMultiplier: numberValue(
      shift.holidayMultiplier,
      1.5
    ),
    nightDifferentialMultiplier: numberValue(
      shift.nightDifferentialMultiplier,
      1.2
    ),
    freezerPremiumMultiplier: numberValue(
      shift.freezerPremiumMultiplier,
      1.2
    ),
  };
}

function normalizeJob(job) {
  return {
    ...job,
    id: job.id || makeId("job"),
    owner: job.owner || "",
    employer: job.employer || "",
    position: job.position || "",
    hourlyRate: numberValue(job.hourlyRate),
    payFrequency: job.payFrequency || "biweekly",
    payPeriodStart: job.payPeriodStart || "",
    payPeriodEnd: job.payPeriodEnd || "",
    payday: job.payday || "",
    open: Boolean(job.open),
    shifts: sortShifts(
      Array.isArray(job.shifts)
        ? job.shifts.map(normalizeShift)
        : []
    ),
  };
}

/* -------------------------------------------------------
   App
------------------------------------------------------- */

export default function Income() {
  const [jobs, setJobs] = useState(() => {
    try {
      const current = localStorage.getItem(
        STORAGE_KEY
      );

      if (current) {
        const parsed = JSON.parse(current);

        if (Array.isArray(parsed)) {
          return parsed.map(normalizeJob);
        }
      }

      // Try older storage keys so existing information
      // does not disappear after the update.
      for (const key of OLD_STORAGE_KEYS) {
        const old = localStorage.getItem(key);

        if (old) {
          const parsed = JSON.parse(old);

          if (Array.isArray(parsed)) {
            return parsed.map(normalizeJob);
          }
        }
      }
    } catch (error) {
      console.error(
        "Unable to load income data:",
        error
      );
    }

    return DEFAULT_JOBS.map(normalizeJob);
  });

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [showJobModal, setShowJobModal] =
    useState(false);

  const [editingJobId, setEditingJobId] =
    useState(null);

  const [showShiftModal, setShowShiftModal] =
    useState(false);

  const [editingShiftId, setEditingShiftId] =
    useState(null);

  const [shiftForm, setShiftForm] =
    useState(emptyShift());

  const [jobForm, setJobForm] = useState({
    owner: "",
    employer: "",
    position: "",
    hourlyRate: "",
    payFrequency: "biweekly",
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",
  });

  /* -----------------------------------------------------
     Persist every change
  ----------------------------------------------------- */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(jobs)
      );
    } catch (error) {
      console.error(
        "Unable to save income data:",
        error
      );
    }
  }, [jobs]);

  /* -----------------------------------------------------
     Selected job
  ----------------------------------------------------- */

  const selectedJob = useMemo(
    () =>
      jobs.find(
        (job) => job.id === selectedJobId
      ) || null,
    [jobs, selectedJobId]
  );

  /* -----------------------------------------------------
     Update job
  ----------------------------------------------------- */

  function updateJob(jobId, updates) {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? normalizeJob({
              ...job,
              ...updates,
            })
          : job
      )
    );
  }

  /* -----------------------------------------------------
     Open / close job
  ----------------------------------------------------- */

  function toggleJob(jobId) {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              open: !job.open,
            }
          : {
              ...job,
              open: false,
            }
      )
    );

    setSelectedJobId(jobId);
  }

  /* -----------------------------------------------------
     New job
  ----------------------------------------------------- */

  function openNewJob() {
    setEditingJobId(null);

    setJobForm({
      owner: "",
      employer: "",
      position: "",
      hourlyRate: "",
      payFrequency: "biweekly",
      payPeriodStart: "",
      payPeriodEnd: "",
      payday: "",
    });

    setShowJobModal(true);
  }

  function openEditJob(job) {
    setEditingJobId(job.id);

    setJobForm({
      owner: job.owner || "",
      employer: job.employer || "",
      position: job.position || "",
      hourlyRate:
        job.hourlyRate === 0
          ? ""
          : String(job.hourlyRate),
      payFrequency:
        job.payFrequency || "biweekly",
      payPeriodStart:
        job.payPeriodStart || "",
      payPeriodEnd:
        job.payPeriodEnd || "",
      payday: job.payday || "",
    });

    setShowJobModal(true);
  }

  function saveJob() {
    if (
      !jobForm.owner.trim() ||
      !jobForm.employer.trim()
    ) {
      alert(
        "Please enter the owner and employer."
      );
      return;
    }

    const data = {
      owner: jobForm.owner.trim(),
      employer: jobForm.employer.trim(),
      position: jobForm.position.trim(),
      hourlyRate: numberValue(
        jobForm.hourlyRate
      ),
      payFrequency:
        jobForm.payFrequency || "biweekly",
      payPeriodStart:
        jobForm.payPeriodStart || "",
      payPeriodEnd:
        jobForm.payPeriodEnd || "",
      payday: jobForm.payday || "",
    };

    if (editingJobId) {
      updateJob(editingJobId, data);
    } else {
      const newJob = normalizeJob({
        id: makeId("job"),
        ...data,
        open: true,
        shifts: [],
      });

      setJobs((current) => [
        ...current.map((job) => ({
          ...job,
          open: false,
        })),
        newJob,
      ]);

      setSelectedJobId(newJob.id);
    }

    setShowJobModal(false);
  }

  function deleteJob(job) {
    const confirmed = window.confirm(
      `Delete ${job.owner} — ${job.employer}?`
    );

    if (!confirmed) return;

    setJobs((current) =>
      current.filter(
        (item) => item.id !== job.id
      )
    );

    if (selectedJobId === job.id) {
      setSelectedJobId(null);
    }
  }

  /* -----------------------------------------------------
     Shift modal
  ----------------------------------------------------- */

  function openAddShift(job) {
    setSelectedJobId(job.id);
    setEditingShiftId(null);

    setShiftForm({
      ...emptyShift(),
      date:
        job.payPeriodStart || "",
    });

    setShowShiftModal(true);
  }

  function openEditShift(job, shift) {
    setSelectedJobId(job.id);
    setEditingShiftId(shift.id);

    setShiftForm({
      ...emptyShift(),
      ...shift,
    });

    setShowShiftModal(true);
  }

  function saveShift() {
    if (!selectedJob) return;

    if (
      !shiftForm.date ||
      !shiftForm.start ||
      !shiftForm.end
    ) {
      alert(
        "Please enter the date, start time and end time."
      );
      return;
    }

    let finalShift = {
      ...shiftForm,
      id:
        editingShiftId ||
        shiftForm.id ||
        makeId("shift"),
      breakMinutes: numberValue(
        shiftForm.breakMinutes
      ),
      overtimeMultiplier: numberValue(
        shiftForm.overtimeMultiplier,
        1.5
      ),
      holidayMultiplier: numberValue(
        shiftForm.holidayMultiplier,
        1.5
      ),
      nightDifferentialMultiplier:
        numberValue(
          shiftForm.nightDifferentialMultiplier,
          1.2
        ),
      freezerPremiumMultiplier:
        numberValue(
          shiftForm.freezerPremiumMultiplier,
          1.2
        ),
    };

    // Automatically identify a Canadian fixed-date
    // holiday when the user selects Stat Holiday.
    if (
      finalShift.payType === "Stat Holiday" &&
      !finalShift.holidayName
    ) {
      finalShift.holidayName =
        getCanadianHolidayName(
          finalShift.date
        );
    }

    setJobs((current) =>
      current.map((job) => {
        if (job.id !== selectedJob.id) {
          return job;
        }

        let updatedShifts;

        if (editingShiftId) {
          updatedShifts = job.shifts.map(
            (shift) =>
              shift.id === editingShiftId
                ? finalShift
                : shift
          );
        } else {
          updatedShifts = [
            ...job.shifts,
            finalShift,
          ];
        }

        // IMPORTANT:
        // Always sort by date after saving.
        // This means Aug 1 appears before Aug 2,
        // regardless of the order entered.
        updatedShifts =
          sortShifts(updatedShifts);

        return {
          ...job,
          shifts: updatedShifts,
        };
      })
    );

    setShowShiftModal(false);
    setEditingShiftId(null);
    setShiftForm(emptyShift());
  }

  function deleteShift(job, shiftId) {
    const confirmed = window.confirm(
      "Delete this work shift?"
    );

    if (!confirmed) return;

    setJobs((current) =>
      current.map((item) =>
        item.id === job.id
          ? {
              ...item,
              shifts: item.shifts.filter(
                (shift) =>
                  shift.id !== shiftId
              ),
            }
          : item
      )
    );
  }

  /* -----------------------------------------------------
     Shift calculations
  ----------------------------------------------------- */

  function calculateShift(job, shift) {
    const hours = getHours(
      shift.start,
      shift.end,
      shift.breakMinutes
    );

    const baseRate =
      numberValue(job.hourlyRate);

    let multiplier = 1;

    if (shift.payType === "Overtime") {
      multiplier =
        numberValue(
          shift.overtimeMultiplier,
          1.5
        );
    }

    if (shift.payType === "Stat Holiday") {
      multiplier =
        numberValue(
          shift.holidayMultiplier,
          1.5
        );
    }

    let effectiveRate =
      baseRate * multiplier;

    if (shift.nightDifferential) {
      effectiveRate *=
        numberValue(
          shift.nightDifferentialMultiplier,
          1.2
        );
    }

    if (shift.freezerPremium) {
      effectiveRate *=
        numberValue(
          shift.freezerPremiumMultiplier,
          1.2
        );
    }

    const gross = hours * effectiveRate;

    // Simple planning estimate.
    // This is intentionally an estimate, not a tax calculation.
    const estimatedNet = gross * 0.85;

    return {
      hours,
      gross,
      estimatedNet,
      effectiveRate,
    };
  }

  function calculateJob(job) {
    const shifts = sortShifts(
      job.shifts || []
    );

    let regularHours = 0;
    let overtimeHours = 0;
    let holidayHours = 0;

    let regularGross = 0;
    let overtimeGross = 0;
    let holidayGross = 0;

    let gross = 0;

    shifts.forEach((shift) => {
      const result = calculateShift(
        job,
        shift
      );

      gross += result.gross;

      if (shift.payType === "Overtime") {
        overtimeHours += result.hours;
        overtimeGross += result.gross;
      } else if (
        shift.payType === "Stat Holiday"
      ) {
        holidayHours += result.hours;
        holidayGross += result.gross;
      } else {
        regularHours += result.hours;
        regularGross += result.gross;
      }
    });

    return {
      totalHours:
        regularHours +
        overtimeHours +
        holidayHours,

      regularHours,
      overtimeHours,
      holidayHours,

      regularGross,
      overtimeGross,
      holidayGross,

      gross,
      estimatedNet: gross * 0.85,
    };
  }

  /* -----------------------------------------------------
     Household totals
  ----------------------------------------------------- */

  const householdTotals = useMemo(() => {
    return jobs.reduce(
      (total, job) => {
        const result = calculateJob(job);

        return {
          hours:
            total.hours + result.totalHours,
          gross:
            total.gross + result.gross,
          estimatedNet:
            total.estimatedNet +
            result.estimatedNet,
        };
      },
      {
        hours: 0,
        gross: 0,
        estimatedNet: 0,
      }
    );
  }, [jobs]);

  /* -----------------------------------------------------
     Styles
  ----------------------------------------------------- */

  const styles = {
    page: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "32px 18px 110px",
      color: "var(--text-primary, #2d1d2d)",
    },

    eyebrow: {
      fontSize: "14px",
      fontWeight: 800,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#9b6d8e",
      marginBottom: "8px",
    },

    title: {
      margin: 0,
      fontSize: "clamp(38px, 7vw, 58px)",
      lineHeight: 1.05,
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },

    subtitle: {
      marginTop: "14px",
      marginBottom: "26px",
      color: "#9b7391",
      fontSize: "18px",
      lineHeight: 1.5,
    },

    card: {
      background: "#fff",
      border: "2px solid #efd8e4",
      borderRadius: "22px",
      padding: "20px",
      marginBottom: "18px",
      boxShadow:
        "0 8px 25px rgba(80, 40, 65, 0.04)",
    },

    sectionTitle: {
      fontSize: "15px",
      fontWeight: 800,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#966b89",
      marginBottom: "16px",
    },

    button: {
      border: "none",
      borderRadius: "14px",
      padding: "13px 18px",
      fontWeight: 800,
      fontSize: "14px",
      cursor: "pointer",
      background: "#d94782",
      color: "#fff",
    },

    secondaryButton: {
      border: "2px solid #efd8e4",
      borderRadius: "14px",
      padding: "11px 16px",
      fontWeight: 800,
      fontSize: "14px",
      cursor: "pointer",
      background: "#fff",
      color: "#75566b",
    },

    dangerButton: {
      border: "none",
      borderRadius: "14px",
      padding: "11px 16px",
      fontWeight: 800,
      fontSize: "14px",
      cursor: "pointer",
      background: "#fff0f5",
      color: "#c94b70",
    },

    jobHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
      flexWrap: "wrap",
    },

    jobName: {
      margin: 0,
      fontSize: "22px",
      fontWeight: 800,
    },

    jobMeta: {
      marginTop: "5px",
      color: "#9a6e89",
      fontSize: "14px",
    },

    compactGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(3, minmax(0, 1fr))",
      gap: "10px",
      marginTop: "16px",
    },

    stat: {
      background: "#fff5f9",
      borderRadius: "14px",
      padding: "12px",
    },

    statLabel: {
      color: "#a06f91",
      fontSize: "11px",
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    },

    statValue: {
      marginTop: "4px",
      fontSize: "20px",
      fontWeight: 800,
    },

    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "11px 12px",
      border: "2px solid #efd8e4",
      borderRadius: "12px",
      fontSize: "15px",
      color: "#3a2938",
      background: "#fff",
      outline: "none",
    },

    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 800,
      color: "#806174",
      marginBottom: "6px",
    },
  };

  /* -----------------------------------------------------
     Render
  ----------------------------------------------------- */

  return (
    <main style={styles.page}>
      <div style={styles.eyebrow}>
        Salary
      </div>

      <h1 style={styles.title}>
        Income & Work Hours
      </h1>

      <p style={styles.subtitle}>
        Enter work once. Budget Blossom calculates
        the paycheck and keeps expected and actual
        pay separate.
      </p>

      {/* Household income sources */}

      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div style={styles.sectionTitle}>
            Household Income Sources
          </div>

          <button
            type="button"
            style={styles.button}
            onClick={openNewJob}
          >
            + New Job
          </button>
        </div>

        {jobs.map((job) => {
          const calculation =
            calculateJob(job);

          const isOpen =
            job.open &&
            selectedJobId === job.id;

          return (
            <div
              key={job.id}
              style={{
                border:
                  isOpen
                    ? "2px solid #df5b8c"
                    : "2px solid #efd8e4",
                borderRadius: "18px",
                marginBottom: "12px",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {/* Job row */}

              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <h2 style={styles.jobName}>
                    {job.owner} —{" "}
                    {job.employer}
                  </h2>

                  <div style={styles.jobMeta}>
                    {job.position ||
                      "Employee"}{" "}
                    ·{" "}
                    {money(job.hourlyRate)}
                    /hr
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    ...styles.button,
                    minWidth: "110px",
                    background: isOpen
                      ? "#d13d78"
                      : "#fff0f6",
                    color: isOpen
                      ? "#fff"
                      : "#d13d78",
                  }}
                  onClick={() =>
                    toggleJob(job.id)
                  }
                >
                  {isOpen ? "Opened" : "Open"}
                </button>
              </div>

              {/* Expanded job */}

              {isOpen && (
                <div
                  style={{
                    padding:
                      "0 16px 18px",
                  }}
                >
                  <div
                    style={{
                      height: "1px",
                      background:
                        "#efd8e4",
                      marginBottom:
                        "14px",
                    }}
                  />

                  {/* Job buttons */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      style={styles.button}
                      onClick={() =>
                        openAddShift(job)
                      }
                    >
                      + Add Hours
                    </button>

                    <button
                      type="button"
                      style={
                        styles.secondaryButton
                      }
                      onClick={() =>
                        openEditJob(job)
                      }
                    >
                      ✏️ Edit Job
                    </button>

                    <button
                      type="button"
                      style={
                        styles.dangerButton
                      }
                      onClick={() =>
                        deleteJob(job)
                      }
                    >
                      Delete
                    </button>
                  </div>

                  {/* Pay schedule */}

                  <div
                    style={{
                      marginTop: "14px",
                      background:
                        "#fffaf0",
                      border:
                        "2px solid #f3dda7",
                      borderRadius: "16px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        letterSpacing:
                          "0.08em",
                        color: "#94742e",
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Pay Schedule
                    </div>

                    {job.payPeriodStart &&
                    job.payPeriodEnd &&
                    job.payday ? (
                      <div
                        style={{
                          marginTop: "7px",
                          fontSize: "14px",
                          lineHeight: 1.6,
                          color: "#806c48",
                        }}
                      >
                        <div>
                          Pay period:{" "}
                          <strong>
                            {formatDate(
                              job.payPeriodStart
                            )}{" "}
                            —{" "}
                            {formatDate(
                              job.payPeriodEnd
                            )}
                          </strong>
                        </div>

                        <div>
                          Payday:{" "}
                          <strong
                            style={{
                              color:
                                "#d94782",
                            }}
                          >
                            {formatDate(
                              job.payday
                            )}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "7px",
                          fontSize: "14px",
                          color: "#806c48",
                        }}
                      >
                        ⚠️ Pay schedule needs
                        to be configured.
                      </div>
                    )}
                  </div>

                  {/* Summary */}

                  <div
                    style={styles.compactGrid}
                  >
                    <div style={styles.stat}>
                      <div
                        style={
                          styles.statLabel
                        }
                      >
                        Hours
                      </div>
                      <div
                        style={
                          styles.statValue
                        }
                      >
                        {calculation.totalHours.toFixed(
                          2
                        )}
                      </div>
                    </div>

                    <div style={styles.stat}>
                      <div
                        style={
                          styles.statLabel
                        }
                      >
                        Gross
                      </div>
                      <div
                        style={
                          styles.statValue
                        }
                      >
                        {money(
                          calculation.gross
                        )}
                      </div>
                    </div>

                    <div style={styles.stat}>
                      <div
                        style={
                          styles.statLabel
                        }
                      >
                        Est. Net
                      </div>
                      <div
                        style={
                          styles.statValue
                        }
                      >
                        {money(
                          calculation.estimatedNet
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Hours */}

                  <div
                    style={{
                      marginTop: "18px",
                    }}
                  >
                    <div
                      style={styles.sectionTitle}
                    >
                      Work Hours
                    </div>

                    {job.shifts.length ===
                    0 ? (
                      <div
                        style={{
                          background:
                            "#fff5f9",
                          borderRadius:
                            "14px",
                          padding: "16px",
                          textAlign:
                            "center",
                          color:
                            "#a37491",
                          fontSize:
                            "14px",
                        }}
                      >
                        No work hours entered
                        for this pay period
                        yet.
                      </div>
                    ) : (
                      <div>
                        {sortShifts(
                          job.shifts
                        ).map(
                          (shift) => {
                            const result =
                              calculateShift(
                                job,
                                shift
                              );

                            return (
                              <div
                                key={
                                  shift.id
                                }
                                style={{
                                  padding:
                                    "12px 0",
                                  borderBottom:
                                    "1px solid #efd8e4",
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    gap:
                                      "10px",
                                    alignItems:
                                      "flex-start",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontWeight:
                                          800,
                                        fontSize:
                                          "15px",
                                      }}
                                    >
                                      {formatShortDate(
                                        shift.date
                                      )}
                                    </div>

                                    <div
                                      style={{
                                        marginTop:
                                          "4px",
                                        color:
                                          "#956e89",
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      {result.hours.toFixed(
                                        2
                                      )}{" "}
                                      hrs ·{" "}
                                      {
                                        shift.start
                                      }{" "}
                                      —{" "}
                                      {
                                        shift.end
                                      }{" "}
                                      ·{" "}
                                      {
                                        shift.payType
                                      }

                                      {shift.payType ===
                                        "Overtime" &&
                                        ` ${shift.overtimeMultiplier}×`}

                                      {shift.payType ===
                                        "Stat Holiday" &&
                                        ` ${shift.holidayMultiplier}×`}
                                    </div>

                                    {(shift.nightDifferential ||
                                      shift.freezerPremium) && (
                                      <div
                                        style={{
                                          marginTop:
                                            "3px",
                                          color:
                                            "#a37491",
                                          fontSize:
                                            "12px",
                                        }}
                                      >
                                        {shift.nightDifferential &&
                                          "Night differential"}

                                        {shift.nightDifferential &&
                                          shift.freezerPremium &&
                                          " · "}

                                        {shift.freezerPremium &&
                                          "Freezer premium"}
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      gap:
                                        "6px",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={{
                                        ...styles.secondaryButton,
                                        padding:
                                          "7px 11px",
                                        fontSize:
                                          "12px",
                                      }}
                                      onClick={() =>
                                        openEditShift(
                                          job,
                                          shift
                                        )
                                      }
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      style={{
                                        ...styles.dangerButton,
                                        padding:
                                          "7px 11px",
                                        fontSize:
                                          "12px",
                                      }}
                                      onClick={() =>
                                        deleteShift(
                                          job,
                                          shift.id
                                        )
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      "5px",
                                    textAlign:
                                      "right",
                                    fontWeight:
                                      800,
                                    fontSize:
                                      "13px",
                                  }}
                                >
                                  {money(
                                    result.gross
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  {/* Paycheck estimate */}

                  <div
                    style={{
                      marginTop: "18px",
                      background:
                        "#f6fcf8",
                      border:
                        "2px solid #d5eee0",
                      borderRadius:
                        "16px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#4b8765",
                        fontWeight: 800,
                        fontSize: "12px",
                        letterSpacing:
                          "0.08em",
                        textTransform:
                          "uppercase",
                        marginBottom:
                          "10px",
                      }}
                    >
                      Paycheck Estimate
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontSize:
                          "13px",
                        marginBottom:
                          "7px",
                      }}
                    >
                      <span>
                        Regular
                      </span>

                      <strong>
                        {calculation.regularHours.toFixed(
                          2
                        )}{" "}
                        hrs ·{" "}
                        {money(
                          calculation.regularGross
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontSize:
                          "13px",
                        marginBottom:
                          "7px",
                      }}
                    >
                      <span>
                        Overtime
                      </span>

                      <strong>
                        {calculation.overtimeHours.toFixed(
                          2
                        )}{" "}
                        hrs ·{" "}
                        {money(
                          calculation.overtimeGross
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontSize:
                          "13px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <span>
                        Stat Holiday
                      </span>

                      <strong>
                        {calculation.holidayHours.toFixed(
                          2
                        )}{" "}
                        hrs ·{" "}
                        {money(
                          calculation.holidayGross
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        borderTop:
                          "1px solid #d5eee0",
                        paddingTop:
                          "10px",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontWeight:
                          800,
                      }}
                    >
                      <span>
                        Estimated Gross
                      </span>

                      <span>
                        {money(
                          calculation.gross
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "7px",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        fontWeight:
                          900,
                        fontSize:
                          "17px",
                        color:
                          "#43805d",
                      }}
                    >
                      <span>
                        Estimated Net
                      </span>

                      <span>
                        {money(
                          calculation.estimatedNet
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Household summary */}

      <section style={styles.card}>
        <div style={styles.sectionTitle}>
          Current Household Estimated Gross
        </div>

        <div
          style={styles.compactGrid}
        >
          <div style={styles.stat}>
            <div style={styles.statLabel}>
              Total Hours
            </div>
            <div style={styles.statValue}>
              {householdTotals.hours.toFixed(
                2
              )}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>
              Gross
            </div>
            <div style={styles.statValue}>
              {money(
                householdTotals.gross
              )}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>
              Est. Net
            </div>
            <div style={styles.statValue}>
              {money(
                householdTotals.estimatedNet
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------
          JOB MODAL
      ------------------------------------------------- */}

      {showJobModal && (
        <div
          style={modalBackdrop}
          onMouseDown={() =>
            setShowJobModal(false)
          }
        >
          <div
            style={modal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>
                {editingJobId
                  ? "Edit Job"
                  : "New Job"}
              </h2>

              <button
                type="button"
                style={closeButton}
                onClick={() =>
                  setShowJobModal(false)
                }
              >
                ×
              </button>
            </div>

            <div style={formGrid}>
              <Field
                label="Owner"
                value={jobForm.owner}
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    owner: value,
                  }))
                }
                placeholder="Zai / Ariel"
              />

              <Field
                label="Employer"
                value={jobForm.employer}
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    employer: value,
                  }))
                }
                placeholder="A&W / Witron"
              />

              <Field
                label="Position"
                value={jobForm.position}
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    position: value,
                  }))
                }
                placeholder="Position"
              />

              <Field
                label="Hourly Rate"
                type="number"
                step="0.01"
                value={
                  jobForm.hourlyRate
                }
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    hourlyRate: value,
                  }))
                }
                placeholder="21.00"
              />

              <div>
                <label
                  style={modalLabel}
                >
                  Pay Frequency
                </label>

                <select
                  style={modalInput}
                  value={
                    jobForm.payFrequency
                  }
                  onChange={(event) =>
                    setJobForm((form) => ({
                      ...form,
                      payFrequency:
                        event.target
                          .value,
                    }))
                  }
                >
                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="biweekly">
                    Biweekly
                  </option>

                  <option value="semi-monthly">
                    Semi-monthly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>
              </div>

              <div />

              <Field
                label="Pay Period Start"
                type="date"
                value={
                  jobForm.payPeriodStart
                }
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    payPeriodStart:
                      value,
                  }))
                }
              />

              <Field
                label="Pay Period End"
                type="date"
                value={
                  jobForm.payPeriodEnd
                }
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    payPeriodEnd:
                      value,
                  }))
                }
              />

              <Field
                label="Payday"
                type="date"
                value={jobForm.payday}
                onChange={(value) =>
                  setJobForm((form) => ({
                    ...form,
                    payday: value,
                  }))
                }
              />
            </div>

            <div style={modalActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() =>
                  setShowJobModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                style={styles.button}
                onClick={saveJob}
              >
                Save Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------
          SHIFT MODAL
      ------------------------------------------------- */}

      {showShiftModal && selectedJob && (
        <div
          style={modalBackdrop}
          onMouseDown={() =>
            setShowShiftModal(false)
          }
        >
          <div
            style={{
              ...modal,
              maxWidth: "620px",
            }}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  {editingShiftId
                    ? "Edit Work Hours"
                    : "Add Work Hours"}
                </h2>

                <div
                  style={{
                    marginTop:
                      "4px",
                    color:
                      "#9a6e89",
                    fontSize:
                      "13px",
                  }}
                >
                  {selectedJob.owner} —{" "}
                  {
                    selectedJob.employer
                  }
                </div>
              </div>

              <button
                type="button"
                style={closeButton}
                onClick={() =>
                  setShowShiftModal(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div style={formGrid}>
              {/* Date */}

              <Field
                label="Work Date"
                type="date"
                value={shiftForm.date}
                onChange={(value) =>
                  setShiftForm((form) => ({
                    ...form,
                    date: value,
                  }))
                }
              />

              {/* Start */}

              <Field
                label="Start Time"
                type="time"
                value={shiftForm.start}
                onChange={(value) =>
                  setShiftForm((form) => ({
                    ...form,
                    start: value,
                  }))
                }
              />

              {/* End */}

              <Field
                label="End Time"
                type="time"
                value={shiftForm.end}
                onChange={(value) =>
                  setShiftForm((form) => ({
                    ...form,
                    end: value,
                  }))
                }
              />

              {/* Break */}

              <Field
                label="Unpaid Break (minutes)"
                type="number"
                min="0"
                value={
                  shiftForm.breakMinutes
                }
                onChange={(value) =>
                  setShiftForm((form) => ({
                    ...form,
                    breakMinutes:
                      value,
                  }))
                }
              />

              {/* Pay type */}

              <div>
                <label
                  style={modalLabel}
                >
                  Pay Type
                </label>

                <select
                  style={modalInput}
                  value={
                    shiftForm.payType
                  }
                  onChange={(event) =>
                    setShiftForm((form) => ({
                      ...form,
                      payType:
                        event.target
                          .value,
                    }))
                  }
                >
                  <option value="Regular">
                    Regular
                  </option>

                  <option value="Overtime">
                    Overtime
                  </option>

                  <option value="Stat Holiday">
                    Stat Holiday
                  </option>
                </select>
              </div>

              {/* Overtime multiplier */}

              {shiftForm.payType ===
                "Overtime" && (
                <div>
                  <label
                    style={modalLabel}
                  >
                    Overtime Rate
                  </label>

                  <select
                    style={modalInput}
                    value={
                      shiftForm.overtimeMultiplier
                    }
                    onChange={(event) =>
                      setShiftForm(
                        (form) => ({
                          ...form,
                          overtimeMultiplier:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }
                  >
                    <option value="1.5">
                      1.5×
                    </option>

                    <option value="2">
                      2.0×
                    </option>
                  </select>
                </div>
              )}

              {/* Stat holiday */}

              {shiftForm.payType ===
                "Stat Holiday" && (
                <>
                  <div>
                    <label
                      style={
                        modalLabel
                      }
                    >
                      Stat Holiday
                    </label>

                    <input
                      style={
                        modalInput
                      }
                      value={
                        shiftForm.holidayName ||
                        getCanadianHolidayName(
                          shiftForm.date
                        )
                      }
                      onChange={(
                        event
                      ) =>
                        setShiftForm(
                          (form) => ({
                            ...form,
                            holidayName:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Canada Day"
                    />
                  </div>

                  <div>
                    <label
                      style={
                        modalLabel
                      }
                    >
                      Holiday Rate
                    </label>

                    <select
                      style={
                        modalInput
                      }
                      value={
                        shiftForm.holidayMultiplier
                      }
                      onChange={(
                        event
                      ) =>
                        setShiftForm(
                          (form) => ({
                            ...form,
                            holidayMultiplier:
                              Number(
                                event
                                  .target
                                  .value
                              ),
                          })
                        )
                      }
                    >
                      <option value="1">
                        1.0×
                      </option>

                      <option value="1.5">
                        1.5×
                      </option>

                      <option value="2">
                        2.0×
                      </option>
                    </select>
                  </div>
                </>
              )}

              {/* Night differential */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={{
                    ...modalLabel,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    cursor:
                      "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        shiftForm.nightDifferential
                      )
                    }
                    onChange={(event) =>
                      setShiftForm(
                        (form) => ({
                          ...form,
                          nightDifferential:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  Night Differential
                  {" "}
                  {shiftForm.nightDifferential
                    ? "1.2×"
                    : ""}
                </label>
              </div>

              {/* Freezer */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={{
                    ...modalLabel,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    cursor:
                      "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        shiftForm.freezerPremium
                      )
                    }
                    onChange={(event) =>
                      setShiftForm(
                        (form) => ({
                          ...form,
                          freezerPremium:
                            event
                              .target
                              .checked,
                        })
                      )
                    }
                  />

                  Freezer Premium
                  {" "}
                  {shiftForm.freezerPremium
                    ? "1.2×"
                    : ""}
                </label>
              </div>

              {/* Notes */}

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={modalLabel}
                >
                  Notes
                </label>

                <textarea
                  style={{
                    ...modalInput,
                    minHeight:
                      "75px",
                    resize:
                      "vertical",
                  }}
                  value={
                    shiftForm.notes
                  }
                  onChange={(event) =>
                    setShiftForm(
                      (form) => ({
                        ...form,
                        notes:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Live calculation */}

            {shiftForm.start &&
              shiftForm.end && (
                <div
                  style={{
                    marginTop:
                      "16px",
                    background:
                      "#fff5f9",
                    borderRadius:
                      "14px",
                    padding:
                      "13px",
                    fontSize:
                      "14px",
                  }}
                >
                  <strong>
                    Preview:{" "}
                  </strong>

                  {getHours(
                    shiftForm.start,
                    shiftForm.end,
                    shiftForm.breakMinutes
                  ).toFixed(2)}{" "}
                  hours
                </div>
              )}

            <div style={modalActions}>
              <button
                type="button"
                style={
                  styles.secondaryButton
                }
                onClick={() =>
                  setShowShiftModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                style={styles.button}
                onClick={saveShift}
              >
                {editingShiftId
                  ? "Save Changes"
                  : "Save Hours"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------
   Reusable field
------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  min,
  step,
}) {
  return (
    <div>
      <label style={modalLabel}>
        {label}
      </label>

      <input
        style={modalInput}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        step={step}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

/* -------------------------------------------------------
   Modal styles
------------------------------------------------------- */

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(35, 20, 35, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 1000,
};

const modal = {
  width: "100%",
  maxWidth: "720px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "22px",
  padding: "20px",
  boxSizing: "border-box",
  boxShadow:
    "0 25px 70px rgba(40, 20, 40, 0.25)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "20px",
};

const closeButton = {
  border: "none",
  background: "#fff0f5",
  color: "#d94782",
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  fontSize: "24px",
  cursor: "pointer",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "13px",
};

const modalLabel = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  color: "#806174",
  marginBottom: "6px",
};

const modalInput = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "2px solid #efd8e4",
  borderRadius: "12px",
  fontSize: "15px",
  color: "#3a2938",
  background: "#fff",
  outline: "none",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "9px",
  marginTop: "20px",
  paddingTop: "15px",
  borderTop: "1px solid #efd8e4",
};

/* -------------------------------------------------------
   Mobile adjustments
------------------------------------------------------- */

const mobileStyle = document.createElement(
  "style"
);

mobileStyle.textContent = `
  @media (max-width: 600px) {
    input, select, textarea, button {
      font-size: 16px !important;
    }
  }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "budget-blossom-income-mobile"
  )
) {
  mobileStyle.id =
    "budget-blossom-income-mobile";

  document.head.appendChild(
    mobileStyle
  );
}
