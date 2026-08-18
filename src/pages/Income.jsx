/**
 * Income.jsx
 * Budget Blossom
 *
 * Income + Work Hours
 *
 * Features:
 * - Household jobs
 * - Open / close job
 * - Add / edit work hours
 * - Chronological work dates
 * - Persistent localStorage
 * - Pay period / payday
 * - Payroll estimate
 * - Edit job
 * - Delete job
 */

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY =
  "budgetBlossom_income_v2";

/* =========================================================
   DEFAULT JOBS
========================================================= */

const DEFAULT_JOBS = [
  {
    id: "zai-aw",
    owner: "Zai",
    employer: "A&W",
    position: "Cashier/Kitchen",
    rate: 18,
    type: "Hourly",
    payPeriodStart: "2026-08-01",
    payPeriodEnd: "2026-08-15",
    payday: "2026-08-21",
    open: false,
    hours: [],
  },
  {
    id: "zai-loblaws",
    owner: "Zai",
    employer: "Loblaws",
    position: "Employee",
    rate: 17.6,
    type: "Hourly",
    payPeriodStart: "2026-08-01",
    payPeriodEnd: "2026-08-15",
    payday: "2026-08-21",
    open: false,
    hours: [],
  },
  {
    id: "ariel-witron",
    owner: "Ariel",
    employer: "Witron",
    position: "Equipment Operator",
    rate: 21,
    type: "Hourly",
    payPeriodStart: "2026-08-01",
    payPeriodEnd: "2026-08-15",
    payday: "2026-08-21",
    open: false,
    hours: [],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  const number = Number(value) || 0;

  return number.toLocaleString(
    "en-CA",
    {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }
  );
}

function number(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(
    `${value}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(
    `${value}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function todayString() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createId(prefix = "id") {
  return (
    prefix +
    "-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

/* =========================================================
   SORT HOURS
========================================================= */

function sortHours(hours) {
  return [...hours].sort(
    (a, b) => {
      const dateA =
        new Date(
          `${a.date}T12:00:00`
        ).getTime();

      const dateB =
        new Date(
          `${b.date}T12:00:00`
        ).getTime();

      return dateA - dateB;
    }
  );
}

/* =========================================================
   NORMALIZE OLD DATA
========================================================= */

function normalizeJob(job) {
  return {
    id:
      job.id ||
      createId("job"),

    owner:
      job.owner ||
      "Zai",

    employer:
      job.employer ||
      job.company ||
      "New Job",

    position:
      job.position ||
      job.role ||
      "",

    rate:
      number(
        job.rate ??
        job.hourlyRate ??
        0
      ),

    type:
      job.type ||
      "Hourly",

    payPeriodStart:
      job.payPeriodStart ||
      "",

    payPeriodEnd:
      job.payPeriodEnd ||
      "",

    payday:
      job.payday ||
      "",

    open:
      Boolean(job.open),

    hours:
      sortHours(
        Array.isArray(job.hours)
          ? job.hours.map(
              (entry) => ({
                id:
                  entry.id ||
                  createId("hour"),

                date:
                  entry.date ||
                  todayString(),

                start:
                  entry.start ||
                  "",

                end:
                  entry.end ||
                  "",

                breakMinutes:
                  number(
                    entry.breakMinutes
                  ),

                regularHours:
                  number(
                    entry.regularHours ??
                    entry.hours ??
                    0
                  ),

                overtimeHours:
                  number(
                    entry.overtimeHours ??
                    entry.otHours ??
                    0
                  ),

                holidayHours:
                  number(
                    entry.holidayHours ??
                    0
                  ),

                notes:
                  entry.notes ||
                  "",
              })
            )
          : []
      ),
  };
}

/* =========================================================
   LOAD
========================================================= */

function loadIncomeData() {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {
      return DEFAULT_JOBS;
    }

    const parsed =
      JSON.parse(saved);

    if (
      Array.isArray(parsed) &&
      parsed.length
    ) {
      return parsed.map(
        normalizeJob
      );
    }

    if (
      parsed &&
      Array.isArray(
        parsed.jobs
      )
    ) {
      return parsed.jobs.map(
        normalizeJob
      );
    }

    return DEFAULT_JOBS;
  } catch (error) {
    console.error(
      "Unable to load income data:",
      error
    );

    return DEFAULT_JOBS;
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Income({
  onNavigate,
}) {
  const [jobs, setJobs] =
    useState(loadIncomeData);

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [showJobModal, setShowJobModal] =
    useState(false);

  const [showHoursModal, setShowHoursModal] =
    useState(false);

  const [editingJob, setEditingJob] =
    useState(null);

  const [editingHours, setEditingHours] =
    useState(null);

  /* -------------------------------------------------------
     SAVE
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     SELECTED JOB
  ------------------------------------------------------- */

  const selectedJob =
    jobs.find(
      (job) =>
        job.id === selectedJobId
    ) || null;

  /* -------------------------------------------------------
     TOTAL HOUSEHOLD GROSS
  ------------------------------------------------------- */

  const householdGross =
    useMemo(() => {
      return jobs.reduce(
        (total, job) => {
          const gross =
            job.hours.reduce(
              (
                subtotal,
                entry
              ) => {
                const regular =
                  number(
                    entry.regularHours
                  ) *
                  number(job.rate);

                const overtime =
                  number(
                    entry.overtimeHours
                  ) *
                  number(job.rate) *
                  1.5;

                const holiday =
                  number(
                    entry.holidayHours
                  ) *
                  number(job.rate) *
                  2;

                return (
                  subtotal +
                  regular +
                  overtime +
                  holiday
                );
              },
              0
            );

          return total + gross;
        },
        0
      );
    }, [jobs]);

  /* =========================================================
     JOB ACTIONS
  ========================================================= */

  function handleOpenJob(jobId) {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              open: !job.open,
            }
          : job
      )
    );

    setSelectedJobId(jobId);
  }

  function handleEditJob(job) {
    setEditingJob({
      ...job,
    });

    setShowJobModal(true);
  }

  function handleDeleteJob(jobId) {
    const job =
      jobs.find(
        (item) =>
          item.id === jobId
      );

    if (!job) return;

    const confirmed =
      window.confirm(
        `Delete ${job.owner} — ${job.employer}?`
      );

    if (!confirmed) return;

    setJobs((current) =>
      current.filter(
        (item) =>
          item.id !== jobId
      )
    );

    if (
      selectedJobId === jobId
    ) {
      setSelectedJobId(null);
    }
  }

  /* =========================================================
     SAVE JOB
  ========================================================= */

  function handleSaveJob(event) {
    event.preventDefault();

    if (!editingJob) return;

    const cleanedJob = {
      ...editingJob,

      rate: number(
        editingJob.rate
      ),

      hours: sortHours(
        editingJob.hours || []
      ),
    };

    const exists =
      jobs.some(
        (job) =>
          job.id ===
          cleanedJob.id
      );

    if (exists) {
      setJobs((current) =>
        current.map((job) =>
          job.id ===
          cleanedJob.id
            ? cleanedJob
            : job
        )
      );
    } else {
      setJobs((current) => [
        ...current,
        cleanedJob,
      ]);
    }

    setShowJobModal(false);
    setEditingJob(null);
  }

  /* =========================================================
     NEW JOB
  ========================================================= */

  function handleNewJob() {
    setEditingJob({
      id: createId("job"),
      owner: "Zai",
      employer: "",
      position: "",
      rate: "",
      type: "Hourly",
      payPeriodStart: "",
      payPeriodEnd: "",
      payday: "",
      open: true,
      hours: [],
    });

    setShowJobModal(true);
  }

  /* =========================================================
     ADD HOURS
  ========================================================= */

  function handleAddHours(job) {
    setSelectedJobId(job.id);

    setEditingHours({
      id: createId("hour"),
      jobId: job.id,

      date:
        job.hours.length > 0
          ? getNextWorkDate(
              job.hours
            )
          : job.payPeriodStart ||
            todayString(),

      start: "",
      end: "",
      breakMinutes: 30,

      regularHours: "",
      overtimeHours: "",
      holidayHours: "",

      notes: "",
    });

    setShowHoursModal(true);
  }

  /* =========================================================
     EDIT HOURS
  ========================================================= */

  function handleEditHours(
    job,
    entry
  ) {
    setSelectedJobId(job.id);

    setEditingHours({
      ...entry,
      jobId: job.id,
    });

    setShowHoursModal(true);
  }

  /* =========================================================
     DELETE HOURS
  ========================================================= */

  function handleDeleteHours(
    job,
    hourId
  ) {
    const confirmed =
      window.confirm(
        "Delete this work entry?"
      );

    if (!confirmed) return;

    setJobs((current) =>
      current.map((item) =>
        item.id === job.id
          ? {
              ...item,
              hours:
                item.hours.filter(
                  (hour) =>
                    hour.id !==
                    hourId
                ),
            }
          : item
      )
    );
  }

  /* =========================================================
     SAVE HOURS
  ========================================================= */

  function handleSaveHours(event) {
    event.preventDefault();

    if (!editingHours) return;

    const job =
      jobs.find(
        (item) =>
          item.id ===
          editingHours.jobId
      );

    if (!job) return;

    const date =
      editingHours.date;

    if (!date) {
      window.alert(
        "Please select a work date."
      );

      return;
    }

    /* Prevent two entries on same date
       unless editing that exact entry. */

    const duplicateDate =
      job.hours.some(
        (entry) =>
          entry.date === date &&
          entry.id !==
            editingHours.id
      );

    if (duplicateDate) {
      window.alert(
        "You already have work hours entered for this date. Please edit the existing entry instead."
      );

      return;
    }

    const updatedEntry = {
      ...editingHours,

      regularHours:
        number(
          editingHours.regularHours
        ),

      overtimeHours:
        number(
          editingHours.overtimeHours
        ),

      holidayHours:
        number(
          editingHours.holidayHours
        ),

      breakMinutes:
        number(
          editingHours.breakMinutes
        ),
    };

    setJobs((current) =>
      current.map((item) => {
        if (
          item.id !==
          editingHours.jobId
        ) {
          return item;
        }

        const exists =
          item.hours.some(
            (entry) =>
              entry.id ===
              updatedEntry.id
          );

        const updatedHours =
          exists
            ? item.hours.map(
                (entry) =>
                  entry.id ===
                  updatedEntry.id
                    ? updatedEntry
                    : entry
              )
            : [
                ...item.hours,
                updatedEntry,
              ];

        return {
          ...item,
          hours:
            sortHours(
              updatedHours
            ),
        };
      })
    );

    setShowHoursModal(false);
    setEditingHours(null);
  }

  /* =========================================================
     GET NEXT WORK DATE
  ========================================================= */

  function getNextWorkDate(
    hours
  ) {
    if (!hours.length) {
      return todayString();
    }

    const sorted =
      sortHours(hours);

    const last =
      sorted[
        sorted.length - 1
      ];

    if (!last?.date) {
      return todayString();
    }

    const date =
      new Date(
        `${last.date}T12:00:00`
      );

    date.setDate(
      date.getDate() + 1
    );

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* =========================================================
     CALCULATE JOB PAY
  ========================================================= */

  function calculateJob(job) {
    const regularHours =
      job.hours.reduce(
        (total, entry) =>
          total +
          number(
            entry.regularHours
          ),
        0
      );

    const overtimeHours =
      job.hours.reduce(
        (total, entry) =>
          total +
          number(
            entry.overtimeHours
          ),
        0
      );

    const holidayHours =
      job.hours.reduce(
        (total, entry) =>
          total +
          number(
            entry.holidayHours
          ),
        0
      );

    const regularPay =
      regularHours *
      number(job.rate);

    const overtimePay =
      overtimeHours *
      number(job.rate) *
      1.5;

    const holidayPay =
      holidayHours *
      number(job.rate) *
      2;

    const gross =
      regularPay +
      overtimePay +
      holidayPay;

    /*
      We intentionally keep estimated net conservative.
      The actual payroll/tax calculation can be connected
      to the payroll logic later.
    */

    const estimatedNet =
      gross * 0.85;

    return {
      regularHours,
      overtimeHours,
      holidayHours,
      gross,
      estimatedNet,
    };
  }

  /* =========================================================
     STYLES
  ========================================================= */

  const styles = {
    page: {
      minHeight:
        "100vh",
      background:
        "var(--page-bg, #fff8fb)",
      padding:
        "28px 16px 120px",
      boxSizing:
        "border-box",
      overflowX:
        "hidden",
    },

    container: {
      width:
        "100%",
      maxWidth:
        "900px",
      margin:
        "0 auto",
    },

    eyebrow: {
      margin: "0 0 8px",
      fontSize:
        "13px",
      fontWeight: 800,
      letterSpacing:
        "0.18em",
      color:
        "var(--primary, #9c6687)",
      textTransform:
        "uppercase",
    },

    title: {
      margin: "0",
      fontSize:
        "clamp(36px, 8vw, 58px)",
      lineHeight:
        "1.02",
      fontWeight: 800,
      letterSpacing:
        "-0.04em",
      color:
        "#251a29",
    },

    subtitle: {
      margin:
        "12px 0 24px",
      fontSize:
        "16px",
      lineHeight:
        "1.5",
      color:
        "#9c718d",
      maxWidth:
        "700px",
    },

    sectionCard: {
      background:
        "#ffffff",
      border:
        "1.5px solid #efd5e2",
      borderRadius:
        "22px",
      padding:
        "18px",
      marginBottom:
        "16px",
      boxSizing:
        "border-box",
    },

    sectionHeader: {
      display:
        "flex",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: "12px",
      marginBottom:
        "14px",
    },

    sectionTitle: {
      margin: 0,
      fontSize:
        "15px",
      lineHeight:
        "1.3",
      fontWeight: 800,
      letterSpacing:
        "0.08em",
      textTransform:
        "uppercase",
      color:
        "#986b87",
    },

    primaryButton: {
      border: "none",
      borderRadius:
        "14px",
      background:
        "#d9467e",
      color:
        "#ffffff",
      fontSize:
        "14px",
      fontWeight: 800,
      padding:
        "12px 16px",
      minHeight:
        "44px",
      cursor:
        "pointer",
      touchAction:
        "manipulation",
    },

    secondaryButton: {
      border:
        "1.5px solid #eed5e1",
      borderRadius:
        "14px",
      background:
        "#ffffff",
      color:
        "#76576b",
      fontSize:
        "14px",
      fontWeight: 800,
      padding:
        "11px 15px",
      minHeight:
        "44px",
      cursor:
        "pointer",
      touchAction:
        "manipulation",
    },

    dangerButton: {
      border:
        "none",
      borderRadius:
        "14px",
      background:
        "#fff0f5",
      color:
        "#c94c73",
      fontSize:
        "14px",
      fontWeight: 800,
      padding:
        "11px 15px",
      minHeight:
        "44px",
      cursor:
        "pointer",
      touchAction:
        "manipulation",
    },

    jobCard: {
      border:
        "1.5px solid #efd8e3",
      borderRadius:
        "18px",
      background:
        "#ffffff",
      marginBottom:
        "10px",
      overflow:
        "hidden",
    },

    jobCardOpen: {
      border:
        "2px solid #dc5a8c",
    },

    jobSummary: {
      padding:
        "14px",
    },

    jobTop: {
      display:
        "flex",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: "10px",
    },

    jobInfo: {
      minWidth:
        "0",
      flex: 1,
    },

    jobName: {
      margin: 0,
      fontSize:
        "19px",
      lineHeight:
        "1.2",
      fontWeight: 800,
      color:
        "#261a2b",
      overflow:
        "hidden",
      textOverflow:
        "ellipsis",
      whiteSpace:
        "nowrap",
    },

    jobMeta: {
      margin:
        "4px 0 0",
      fontSize:
        "13px",
      lineHeight:
        "1.4",
      color:
        "#936d84",
    },

    openButton: {
      flex:
        "0 0 auto",
      border:
        "none",
      borderRadius:
        "13px",
      background:
        "#d94d83",
      color:
        "#ffffff",
      fontSize:
        "13px",
      fontWeight:
        800,
      padding:
        "11px 18px",
      minWidth:
        "88px",
      minHeight:
        "42px",
      cursor:
        "pointer",
    },

    closedOpenButton: {
      background:
        "#fff1f6",
      color:
        "#d13e77",
    },

    jobActions: {
      display:
        "grid",
      gridTemplateColumns:
        "1fr 1fr 1fr",
      gap: "8px",
      marginTop:
        "12px",
    },

    smallButton: {
      width:
        "100%",
      border:
        "1.5px solid #eed5e1",
      borderRadius:
        "12px",
      background:
        "#ffffff",
      color:
        "#76576b",
      fontSize:
        "12px",
      fontWeight:
        800,
      padding:
        "10px 8px",
      minHeight:
        "40px",
      cursor:
        "pointer",
    },

    smallPrimary: {
      background:
        "#d94d83",
      color:
        "#ffffff",
      border:
        "1.5px solid #d94d83",
    },

    smallDanger: {
      background:
        "#fff1f5",
      color:
        "#c94c73",
      border:
        "1.5px solid transparent",
    },

    details: {
      borderTop:
        "1px solid #f0dce5",
      padding:
        "14px",
      background:
        "#fffafd",
    },

    scheduleBox: {
      background:
        "#fffaf0",
      border:
        "1.5px solid #f4dda8",
      borderRadius:
        "14px",
      padding:
        "12px",
      marginBottom:
        "12px",
    },

    scheduleTitle: {
      margin:
        "0 0 7px",
      fontSize:
        "12px",
      fontWeight:
        800,
      letterSpacing:
        "0.08em",
      textTransform:
        "uppercase",
      color:
        "#9b742b",
    },

    scheduleText: {
      margin: 0,
      fontSize:
        "13px",
      lineHeight:
        "1.55",
      color:
        "#806846",
    },

    statGrid: {
      display:
        "grid",
      gridTemplateColumns:
        "repeat(3, minmax(0, 1fr))",
      gap: "8px",
      marginBottom:
        "14px",
    },

    stat: {
      background:
        "#fff3f8",
      borderRadius:
        "13px",
      padding:
        "11px 8px",
      minWidth:
        "0",
    },

    statLabel: {
      margin: 0,
      fontSize:
        "10px",
      fontWeight:
        700,
      color:
        "#a27091",
      textTransform:
        "uppercase",
      letterSpacing:
        "0.05em",
    },

    statValue: {
      margin:
        "4px 0 0",
      fontSize:
        "17px",
      lineHeight:
        "1.1",
      fontWeight:
        800,
      color:
        "#2c1c2c",
      overflow:
        "hidden",
      textOverflow:
        "ellipsis",
    },

    hoursTitle: {
      margin:
        "0 0 8px",
      fontSize:
        "13px",
      fontWeight:
        800,
      letterSpacing:
        "0.07em",
      color:
        "#986b87",
      textTransform:
        "uppercase",
    },

    hourRow: {
      display:
        "grid",
      gridTemplateColumns:
        "1fr auto",
      gap: "10px",
      alignItems:
        "center",
      padding:
        "10px 0",
      borderBottom:
        "1px solid #f1dfe7",
    },

    hourDate: {
      margin: 0,
      fontSize:
        "14px",
      fontWeight:
        800,
      color:
        "#30202f",
    },

    hourMeta: {
      margin:
        "3px 0 0",
      fontSize:
        "12px",
      color:
        "#9a708c",
    },

    hourActions: {
      display:
        "flex",
      gap:
        "6px",
    },

    tinyButton: {
      border:
        "1px solid #ead2df",
      borderRadius:
        "9px",
      background:
        "#ffffff",
      color:
        "#76576b",
      padding:
        "7px 9px",
      fontSize:
        "11px",
      fontWeight:
        800,
      cursor:
        "pointer",
    },

    estimateBox: {
      marginTop:
        "14px",
      background:
        "#f7fcf9",
      border:
        "1.5px solid #d4ecdf",
      borderRadius:
        "14px",
      padding:
        "13px",
    },

    estimateTitle: {
      margin:
        "0 0 10px",
      fontSize:
        "12px",
      fontWeight:
        800,
      color:
        "#4e8868",
      textTransform:
        "uppercase",
      letterSpacing:
        "0.07em",
    },

    estimateRow: {
      display:
        "flex",
      justifyContent:
        "space-between",
      gap: "12px",
      padding:
        "4px 0",
      fontSize:
        "13px",
      color:
        "#3b2c36",
    },

    estimateTotal: {
      borderTop:
        "1px solid #d8eade",
      marginTop:
        "6px",
      paddingTop:
        "9px",
      display:
        "flex",
      justifyContent:
        "space-between",
      fontSize:
        "15px",
      fontWeight:
        800,
      color:
        "#3d7859",
    },

    modalOverlay: {
      position:
        "fixed",
      inset: 0,
      zIndex: 1000,
      background:
        "rgba(32, 20, 34, 0.45)",
      display:
        "flex",
      alignItems:
        "flex-end",
      justifyContent:
        "center",
      padding:
        "12px",
      boxSizing:
        "border-box",
    },

    modal: {
      width:
        "100%",
      maxWidth:
        "620px",
      maxHeight:
        "90vh",
      overflowY:
        "auto",
      background:
        "#ffffff",
      borderRadius:
        "24px",
      padding:
        "20px",
      boxSizing:
        "border-box",
      boxShadow:
        "0 20px 60px rgba(30,20,30,.25)",
    },

    modalTitle: {
      margin:
        "0 0 16px",
      fontSize:
        "22px",
      fontWeight:
        800,
      color:
        "#2b1c2b",
    },

    formGrid: {
      display:
        "grid",
      gridTemplateColumns:
        "1fr 1fr",
      gap:
        "12px",
    },

    field: {
      display:
        "flex",
      flexDirection:
        "column",
      gap:
        "6px",
    },

    fieldFull: {
      gridColumn:
        "1 / -1",
    },

    label: {
      fontSize:
        "12px",
      fontWeight:
        800,
      color:
        "#7e5b70",
    },

    input: {
      width:
        "100%",
      boxSizing:
        "border-box",
      border:
        "1.5px solid #ead2df",
      borderRadius:
        "12px",
      padding:
        "11px 12px",
      fontSize:
        "15px",
      background:
        "#fffafd",
      color:
        "#2c1d2c",
      outline:
        "none",
    },

    modalActions: {
      display:
        "flex",
      gap:
        "8px",
      marginTop:
        "18px",
    },

    modalActionButton: {
      flex: 1,
      minHeight:
        "46px",
    },

    empty: {
      textAlign:
        "center",
      padding:
        "24px 12px",
      color:
        "#a07591",
      fontSize:
        "14px",
    },
  };

  /* =========================================================
     RENDER JOB
  ========================================================= */

  function renderJob(job) {
    const payroll =
      calculateJob(job);

    const isOpen =
      job.open;

    const sortedHours =
      sortHours(job.hours);

    return (
      <div
        key={job.id}
        style={{
          ...styles.jobCard,
          ...(isOpen
            ? styles.jobCardOpen
            : {}),
        }}
      >
        <div
          style={
            styles.jobSummary
          }
        >
          <div
            style={
              styles.jobTop
            }
          >
            <div
              style={
                styles.jobInfo
              }
            >
              <h3
                style={
                  styles.jobName
                }
              >
                {job.owner} —{" "}
                {job.employer ||
                  "New Job"}
              </h3>

              <p
                style={
                  styles.jobMeta
                }
              >
                {job.position
                  ? `${job.position} · `
                  : ""}
                {money(job.rate)}
                /hr
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                handleOpenJob(
                  job.id
                )
              }
              style={{
                ...styles.openButton,
                ...(isOpen
                  ? {}
                  : styles.closedOpenButton),
              }}
            >
              {isOpen
                ? "Opened"
                : "Open"}
            </button>
          </div>

          {isOpen && (
            <>
              <div
                style={
                  styles.jobActions
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    handleAddHours(
                      job
                    )
                  }
                  style={{
                    ...styles.smallButton,
                    ...styles.smallPrimary,
                  }}
                >
                  + Add Hours
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleEditJob(
                      job
                    )
                  }
                  style={
                    styles.smallButton
                  }
                >
                  ✏️ Edit Job
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteJob(
                      job.id
                    )
                  }
                  style={{
                    ...styles.smallButton,
                    ...styles.smallDanger,
                  }}
                >
                  Delete
                </button>
              </div>

              <div
                style={
                  styles.details
                }
              >
                <div
                  style={
                    styles.scheduleBox
                  }
                >
                  <p
                    style={
                      styles.scheduleTitle
                    }
                  >
                    Pay Schedule
                  </p>

                  <p
                    style={
                      styles.scheduleText
                    }
                  >
                    Pay period:{" "}
                    <strong>
                      {formatDate(
                        job.payPeriodStart
                      )}{" "}
                      –{" "}
                      {formatDate(
                        job.payPeriodEnd
                      )}
                    </strong>
                    <br />

                    Payday:{" "}
                    <strong
                      style={{
                        color:
                          "#d43d78",
                      }}
                    >
                      {formatDate(
                        job.payday
                      )}
                    </strong>
                  </p>
                </div>

                <div
                  style={
                    styles.statGrid
                  }
                >
                  <div
                    style={
                      styles.stat
                    }
                  >
                    <p
                      style={
                        styles.statLabel
                      }
                    >
                      Hours
                    </p>

                    <p
                      style={
                        styles.statValue
                      }
                    >
                      {(
                        payroll.regularHours +
                        payroll.overtimeHours +
                        payroll.holidayHours
                      ).toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={
                      styles.stat
                    }
                  >
                    <p
                      style={
                        styles.statLabel
                      }
                    >
                      Gross
                    </p>

                    <p
                      style={
                        styles.statValue
                      }
                    >
                      {money(
                        payroll.gross
                      )}
                    </p>
                  </div>

                  <div
                    style={
                      styles.stat
                    }
                  >
                    <p
                      style={
                        styles.statLabel
                      }
                    >
                      Est. Net
                    </p>

                    <p
                      style={
                        styles.statValue
                      }
                    >
                      {money(
                        payroll.estimatedNet
                      )}
                    </p>
                  </div>
                </div>

                <h4
                  style={
                    styles.hoursTitle
                  }
                >
                  Work Hours
                </h4>

                {sortedHours.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    No work hours
                    entered for this
                    pay period yet.
                  </div>
                ) : (
                  sortedHours.map(
                    (entry) => {
                      const total =
                        number(
                          entry.regularHours
                        ) +
                        number(
                          entry.overtimeHours
                        ) +
                        number(
                          entry.holidayHours
                        );

                      return (
                        <div
                          key={
                            entry.id
                          }
                          style={
                            styles.hourRow
                          }
                        >
                          <div>
                            <p
                              style={
                                styles.hourDate
                              }
                            >
                              {formatShortDate(
                                entry.date
                              )}
                            </p>

                            <p
                              style={
                                styles.hourMeta
                              }
                            >
                              {total.toFixed(
                                2
                              )}{" "}
                              hrs

                              {entry.start &&
                              entry.end
                                ? ` · ${entry.start}–${entry.end}`
                                : ""}

                              {number(
                                entry.overtimeHours
                              ) >
                              0
                                ? ` · OT ${number(
                                    entry.overtimeHours
                                  ).toFixed(2)}`
                                : ""}

                              {number(
                                entry.holidayHours
                              ) >
                              0
                                ? ` · Holiday ${number(
                                    entry.holidayHours
                                  ).toFixed(2)}`
                                : ""}
                            </p>
                          </div>

                          <div
                            style={
                              styles.hourActions
                            }
                          >
                            <button
                              type="button"
                              style={
                                styles.tinyButton
                              }
                              onClick={() =>
                                handleEditHours(
                                  job,
                                  entry
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              style={
                                styles.tinyButton
                              }
                              onClick={() =>
                                handleDeleteHours(
                                  job,
                                  entry.id
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  style={
                    styles.estimateBox
                  }
                >
                  <p
                    style={
                      styles.estimateTitle
                    }
                  >
                    Paycheck Estimate
                  </p>

                  <div
                    style={
                      styles.estimateRow
                    }
                  >
                    <span>
                      Regular
                    </span>

                    <strong>
                      {payroll.regularHours.toFixed(
                        2
                      )}{" "}
                      hrs ·{" "}
                      {money(
                        payroll.regularHours *
                          job.rate
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.estimateRow
                    }
                  >
                    <span>
                      Overtime
                    </span>

                    <strong>
                      {payroll.overtimeHours.toFixed(
                        2
                      )}{" "}
                      hrs ·{" "}
                      {money(
                        payroll.overtimeHours *
                          job.rate *
                          1.5
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.estimateRow
                    }
                  >
                    <span>
                      Holiday
                    </span>

                    <strong>
                      {money(
                        payroll.holidayHours *
                          job.rate *
                          2
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.estimateTotal
                    }
                  >
                    <span>
                      Estimated Gross
                    </span>

                    <span>
                      {money(
                        payroll.gross
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      ...styles.estimateTotal,
                      borderTop:
                        "none",
                      marginTop:
                        "0",
                      paddingTop:
                        "5px",
                    }}
                  >
                    <span>
                      Estimated Net
                    </span>

                    <span>
                      {money(
                        payroll.estimatedNet
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main
      style={styles.page}
    >
      <div
        style={styles.container}
      >
        <p
          style={
            styles.eyebrow
          }
        >
          Salary
        </p>

        <h1
          style={
            styles.title
          }
        >
          Income & Work Hours
        </h1>

        <p
          style={
            styles.subtitle
          }
        >
          Enter work once. Budget
          Blossom calculates the
          paycheck and keeps expected
          and actual pay separate.
        </p>

        {/* HOUSEHOLD INCOME */}

        <section
          style={
            styles.sectionCard
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <h2
              style={
                styles.sectionTitle
              }
            >
              Household Income Sources
            </h2>

            <button
              type="button"
              onClick={
                handleNewJob
              }
              style={
                styles.primaryButton
              }
            >
              + New Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div
              style={
                styles.empty
              }
            >
              No income sources
              yet.
            </div>
          ) : (
            jobs.map(renderJob)
          )}
        </section>

        {/* HOUSEHOLD TOTAL */}

        <section
          style={
            styles.sectionCard
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <h2
              style={
                styles.sectionTitle
              }
            >
              Current Household
              Estimated Gross
            </h2>
          </div>

          <div
            style={{
              fontSize:
                "28px",
              fontWeight:
                800,
              color:
                "#2b1c2b",
            }}
          >
            {money(
              householdGross
            )}
          </div>

          <p
            style={{
              margin:
                "5px 0 0",
              fontSize:
                "12px",
              color:
                "#9b718c",
            }}
          >
            Based on saved work
            hours.
          </p>
        </section>
      </div>

      {/* =====================================================
          JOB MODAL
      ===================================================== */}

      {showJobModal &&
        editingJob && (
          <div
            style={
              styles.modalOverlay
            }
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowJobModal(
                  false
                );
              }
            }}
          >
            <form
              style={
                styles.modal
              }
              onSubmit={
                handleSaveJob
              }
            >
              <h2
                style={
                  styles.modalTitle
                }
              >
                {editingJob.employer
                  ? "Edit Job"
                  : "New Job"}
              </h2>

              <div
                style={
                  styles.formGrid
                }
              >
                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Owner
                  </span>

                  <select
                    value={
                      editingJob.owner
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          owner:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  >
                    <option>
                      Zai
                    </option>

                    <option>
                      Ariel
                    </option>
                  </select>
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Employer
                  </span>

                  <input
                    required
                    value={
                      editingJob.employer
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          employer:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="Employer"
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Position
                  </span>

                  <input
                    value={
                      editingJob.position
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          position:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="Position"
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Hourly Rate
                  </span>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      editingJob.rate
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          rate:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Pay Period Start
                  </span>

                  <input
                    type="date"
                    value={
                      editingJob.payPeriodStart
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          payPeriodStart:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Pay Period End
                  </span>

                  <input
                    type="date"
                    value={
                      editingJob.payPeriodEnd
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          payPeriodEnd:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={{
                    ...styles.field,
                    ...styles.fieldFull,
                  }}
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Payday
                  </span>

                  <input
                    type="date"
                    value={
                      editingJob.payday
                    }
                    onChange={(e) =>
                      setEditingJob(
                        {
                          ...editingJob,
                          payday:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>
              </div>

              <div
                style={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowJobModal(
                      false
                    );
                    setEditingJob(
                      null
                    );
                  }}
                  style={{
                    ...styles.secondaryButton,
                    ...styles.modalActionButton,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    ...styles.modalActionButton,
                  }}
                >
                  Save Job
                </button>
              </div>
            </form>
          </div>
        )}

      {/* =====================================================
          HOURS MODAL
      ===================================================== */}

      {showHoursModal &&
        editingHours && (
          <div
            style={
              styles.modalOverlay
            }
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowHoursModal(
                  false
                );
              }
            }}
          >
            <form
              style={
                styles.modal
              }
              onSubmit={
                handleSaveHours
              }
            >
              <h2
                style={
                  styles.modalTitle
                }
              >
                {editingHours.id &&
                selectedJob?.hours.some(
                  (entry) =>
                    entry.id ===
                    editingHours.id
                )
                  ? "Edit Work Hours"
                  : "Add Work Hours"}
              </h2>

              <div
                style={
                  styles.formGrid
                }
              >
                <label
                  style={{
                    ...styles.field,
                    ...styles.fieldFull,
                  }}
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Work Date
                  </span>

                  <input
                    required
                    type="date"
                    value={
                      editingHours.date
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          date:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Start Time
                  </span>

                  <input
                    type="time"
                    value={
                      editingHours.start
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          start:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    End Time
                  </span>

                  <input
                    type="time"
                    value={
                      editingHours.end
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          end:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Break Minutes
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      editingHours.breakMinutes
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          breakMinutes:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Regular Hours
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={
                      editingHours.regularHours
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          regularHours:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="0"
                  />
                </label>

                <label
                  style={
                    styles.field
                  }
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Overtime Hours
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={
                      editingHours.overtimeHours
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          overtimeHours:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="0"
                  />
                </label>

                <label
                  style={{
                    ...styles.field,
                    ...styles.fieldFull,
                  }}
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Holiday Hours
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={
                      editingHours.holidayHours
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          holidayHours:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="0"
                  />
                </label>

                <label
                  style={{
                    ...styles.field,
                    ...styles.fieldFull,
                  }}
                >
                  <span
                    style={
                      styles.label
                    }
                  >
                    Notes
                  </span>

                  <input
                    value={
                      editingHours.notes
                    }
                    onChange={(e) =>
                      setEditingHours(
                        {
                          ...editingHours,
                          notes:
                            e.target
                              .value,
                        }
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div
                style={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowHoursModal(
                      false
                    );
                    setEditingHours(
                      null
                    );
                  }}
                  style={{
                    ...styles.secondaryButton,
                    ...styles.modalActionButton,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    ...styles.modalActionButton,
                  }}
                >
                  Save Hours
                </button>
              </div>
            </form>
          </div>
        )}
    </main>
  );
}
