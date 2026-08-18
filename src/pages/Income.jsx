/**
 * Income.jsx
 * Budget Blossom
 *
 * Income & Work Hours
 *
 * Features:
 * - Multiple household income sources
 * - Open / close individual jobs
 * - Add work hours per job
 * - Edit job
 * - Delete job
 * - New job
 * - Pay-period configuration
 * - Payday configuration
 * - Work hours persist independently for each job
 * - Payroll estimate
 * - Regular / overtime / holiday hours
 * - Estimated gross / net
 */

import React, { useEffect, useMemo, useState } from "react";

/* =========================================================
   STORAGE
========================================================= */

const JOB_STORAGE_KEY = "budgetBlossomIncomeJobs";
const HOURS_STORAGE_KEY = "budgetBlossomWorkHours";

/* =========================================================
   HELPERS
========================================================= */

function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function money(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(number);
}

function numberOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);

  if (!date) return "Not configured";

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateHours(start, end, breakMinutes = 0) {
  if (!start || !end) return 0;

  const [startHour, startMinute] = start
    .split(":")
    .map(Number);

  const [endHour, endMinute] = end
    .split(":")
    .map(Number);

  let startTotal =
    startHour * 60 + startMinute;

  let endTotal =
    endHour * 60 + endMinute;

  // Allows overnight shifts such as 10 PM → 2 AM
  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  const totalMinutes =
    endTotal -
    startTotal -
    numberOrZero(breakMinutes);

  return Math.max(0, totalMinutes / 60);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Ignore localStorage errors
  }
}

/* =========================================================
   DEFAULT JOBS
========================================================= */

const DEFAULT_JOBS = [
  {
    id: "zai_aw",
    owner: "Zai",
    employer: "A&W",
    position: "Cashier/Kitchen",
    hourlyRate: 18,
    type: "Hourly",
    payPeriodStart: "2026-08-01",
    payPeriodEnd: "2026-08-15",
    payday: "2026-08-21",
    overtimeMultiplier: 1.5,
    holidayMultiplier: 1.5,
    nightMultiplier: 1,
    active: true,
  },

  {
    id: "zai_loblaws",
    owner: "Zai",
    employer: "Loblaws",
    position: "",
    hourlyRate: 17.6,
    type: "Hourly",
    payPeriodStart: "",
    payPeriodEnd: "",
    payday: "",
    overtimeMultiplier: 1.5,
    holidayMultiplier: 1.5,
    nightMultiplier: 1,
    active: true,
  },

  {
    id: "ariel_witron",
    owner: "Ariel",
    employer: "Witron",
    position: "Equipment Operator",
    hourlyRate: 21,
    type: "Hourly",
    payPeriodStart: "2026-08-17",
    payPeriodEnd: "2026-08-30",
    payday: "2026-09-04",
    overtimeMultiplier: 1.5,
    holidayMultiplier: 1.5,
    nightMultiplier: 1,
    active: true,
  },
];

/* =========================================================
   NORMALIZE JOB
========================================================= */

function normalizeJob(job, index = 0) {
  return {
    id:
      job?.id ||
      makeId(`job${index}`),

    owner:
      job?.owner ||
      job?.person ||
      "",

    employer:
      job?.employer ||
      job?.company ||
      job?.name ||
      "",

    position:
      job?.position ||
      job?.role ||
      "",

    hourlyRate:
      numberOrZero(
        job?.hourlyRate ??
          job?.rate ??
          job?.payRate
      ),

    type:
      job?.type ||
      "Hourly",

    payPeriodStart:
      job?.payPeriodStart ||
      job?.periodStart ||
      "",

    payPeriodEnd:
      job?.payPeriodEnd ||
      job?.periodEnd ||
      "",

    payday:
      job?.payday ||
      job?.payDate ||
      "",

    overtimeMultiplier:
      numberOrZero(
        job?.overtimeMultiplier || 1.5
      ) || 1.5,

    holidayMultiplier:
      numberOrZero(
        job?.holidayMultiplier || 1.5
      ) || 1.5,

    nightMultiplier:
      numberOrZero(
        job?.nightMultiplier || 1
      ) || 1,

    active:
      job?.active !== false,
  };
}

/* =========================================================
   NORMALIZE HOURS
========================================================= */

function normalizeHours(hours) {
  if (!hours || typeof hours !== "object") {
    return {};
  }

  return hours;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Income({
  onNavigate,
}) {
  const [jobs, setJobs] = useState(() => {
    const saved = loadJSON(
      JOB_STORAGE_KEY,
      null
    );

    if (Array.isArray(saved) && saved.length) {
      return saved.map(normalizeJob);
    }

    return DEFAULT_JOBS.map(normalizeJob);
  });

  const [hoursByJob, setHoursByJob] =
    useState(() =>
      normalizeHours(
        loadJSON(
          HOURS_STORAGE_KEY,
          {}
        )
      )
    );

  const [openJobs, setOpenJobs] = useState(
    {}
  );

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [showJobModal, setShowJobModal] =
    useState(false);

  const [showHoursModal, setShowHoursModal] =
    useState(false);

  const [editingJob, setEditingJob] =
    useState(null);

  const [hoursForm, setHoursForm] =
    useState({
      date: "",
      start: "",
      end: "",
      breakMinutes: 30,
      category: "regular",
      holiday: false,
      nightDifferential: 1,
      note: "",
    });

  /* =======================================================
     PERSIST JOBS
  ======================================================= */

  useEffect(() => {
    saveJSON(
      JOB_STORAGE_KEY,
      jobs
    );
  }, [jobs]);

  /* =======================================================
     PERSIST HOURS
  ======================================================= */

  useEffect(() => {
    saveJSON(
      HOURS_STORAGE_KEY,
      hoursByJob
    );
  }, [hoursByJob]);

  /* =======================================================
     JOB KEY
  ======================================================= */

  function getJobHours(jobId) {
    return Array.isArray(
      hoursByJob[jobId]
    )
      ? hoursByJob[jobId]
      : [];
  }

  /* =======================================================
     OPEN / CLOSE JOB
  ======================================================= */

  function toggleJob(jobId) {
    setOpenJobs((previous) => ({
      ...previous,
      [jobId]: !previous[jobId],
    }));

    setSelectedJobId(jobId);
  }

  /* =======================================================
     NEW JOB
  ======================================================= */

  function handleNewJob() {
    setEditingJob({
      id: makeId("job"),
      owner: "",
      employer: "",
      position: "",
      hourlyRate: "",
      type: "Hourly",
      payPeriodStart: "",
      payPeriodEnd: "",
      payday: "",
      overtimeMultiplier: 1.5,
      holidayMultiplier: 1.5,
      nightMultiplier: 1,
      active: true,
    });

    setShowJobModal(true);
  }

  /* =======================================================
     EDIT JOB
  ======================================================= */

  function handleEditJob(job) {
    setEditingJob({
      ...job,
    });

    setShowJobModal(true);
  }

  /* =======================================================
     SAVE JOB
  ======================================================= */

  function handleSaveJob() {
    if (
      !editingJob ||
      !editingJob.owner ||
      !editingJob.employer
    ) {
      return;
    }

    const cleanedJob =
      normalizeJob(editingJob);

    setJobs((previous) => {
      const exists =
        previous.some(
          (job) =>
            job.id === cleanedJob.id
        );

      if (exists) {
        return previous.map((job) =>
          job.id === cleanedJob.id
            ? cleanedJob
            : job
        );
      }

      return [
        ...previous,
        cleanedJob,
      ];
    });

    setShowJobModal(false);
    setEditingJob(null);
  }

  /* =======================================================
     DELETE JOB
  ======================================================= */

  function handleDeleteJob(jobId) {
    const job = jobs.find(
      (item) => item.id === jobId
    );

    if (!job) return;

    const confirmed = window.confirm(
      `Delete ${job.owner} — ${job.employer}?`
    );

    if (!confirmed) return;

    setJobs((previous) =>
      previous.filter(
        (item) => item.id !== jobId
      )
    );

    setHoursByJob((previous) => {
      const copy = {
        ...previous,
      };

      delete copy[jobId];

      return copy;
    });

    setOpenJobs((previous) => {
      const copy = {
        ...previous,
      };

      delete copy[jobId];

      return copy;
    });

    if (selectedJobId === jobId) {
      setSelectedJobId(null);
    }
  }

  /* =======================================================
     ADD HOURS
  ======================================================= */

  function handleOpenHours(job) {
    setSelectedJobId(job.id);

    setHoursForm({
      date:
        job.payPeriodStart ||
        new Date()
          .toISOString()
          .slice(0, 10),

      start: "",
      end: "",
      breakMinutes: 30,
      category: "regular",
      holiday: false,
      nightDifferential: 1,
      note: "",
    });

    setShowHoursModal(true);
  }

  /* =======================================================
     SAVE HOURS
  ======================================================= */

  function handleSaveHours() {
    if (!selectedJobId) return;

    if (
      !hoursForm.date ||
      !hoursForm.start ||
      !hoursForm.end
    ) {
      return;
    }

    const job = jobs.find(
      (item) =>
        item.id === selectedJobId
    );

    if (!job) return;

    const calculatedHours =
      calculateHours(
        hoursForm.start,
        hoursForm.end,
        hoursForm.breakMinutes
      );

    if (calculatedHours <= 0) {
      return;
    }

    const newShift = {
      id: makeId("shift"),
      date: hoursForm.date,
      start: hoursForm.start,
      end: hoursForm.end,

      breakMinutes:
        numberOrZero(
          hoursForm.breakMinutes
        ),

      hours: calculatedHours,

      category:
        hoursForm.holiday
          ? "holiday"
          : hoursForm.category,

      holiday:
        Boolean(hoursForm.holiday),

      nightDifferential:
        numberOrZero(
          hoursForm.nightDifferential
        ) || 1,

      note:
        hoursForm.note || "",

      createdAt:
        new Date().toISOString(),
    };

    /*
     * IMPORTANT:
     * Hours are saved using the JOB ID.
     *
     * This prevents Zai's A&W hours
     * from being mixed with Ariel's
     * Witron hours.
     */

    setHoursByJob((previous) => ({
      ...previous,

      [selectedJobId]: [
        ...(Array.isArray(
          previous[selectedJobId]
        )
          ? previous[selectedJobId]
          : []),

        newShift,
      ],
    }));

    setShowHoursModal(false);

    setHoursForm({
      date: "",
      start: "",
      end: "",
      breakMinutes: 30,
      category: "regular",
      holiday: false,
      nightDifferential: 1,
      note: "",
    });
  }

  /* =======================================================
     DELETE SHIFT
  ======================================================= */

  function handleDeleteShift(
    jobId,
    shiftId
  ) {
    setHoursByJob((previous) => ({
      ...previous,

      [jobId]: getJobHours(
        jobId
      ).filter(
        (shift) =>
          shift.id !== shiftId
      ),
    }));
  }

  /* =======================================================
     PAYROLL CALCULATION
  ======================================================= */

  function calculatePayroll(job) {
    const shifts =
      getJobHours(job.id);

    let regularHours = 0;
    let overtimeHours = 0;
    let holidayHours = 0;

    let regularPay = 0;
    let overtimePay = 0;
    let holidayPay = 0;

    shifts.forEach((shift) => {
      const hours =
        numberOrZero(
          shift.hours
        );

      const differential =
        numberOrZero(
          shift.nightDifferential
        ) || 1;

      if (
        shift.category ===
          "holiday" ||
        shift.holiday
      ) {
        holidayHours += hours;

        holidayPay +=
          hours *
          job.hourlyRate *
          job.holidayMultiplier *
          differential;

        return;
      }

      if (
        shift.category ===
        "overtime"
      ) {
        overtimeHours += hours;

        overtimePay +=
          hours *
          job.hourlyRate *
          job.overtimeMultiplier *
          differential;

        return;
      }

      regularHours += hours;

      regularPay +=
        hours *
        job.hourlyRate *
        differential;
    });

    const gross =
      regularPay +
      overtimePay +
      holidayPay;

    /*
     * This is an ESTIMATE only.
     * The actual payroll deduction can
     * differ from this percentage.
     */

    const estimatedNet =
      gross * 0.8;

    return {
      regularHours,
      overtimeHours,
      holidayHours,
      regularPay,
      overtimePay,
      holidayPay,
      gross,
      estimatedNet,
    };
  }

  /* =======================================================
     FILTER / SUMMARY
  ======================================================= */

  const totalHouseholdGross =
    useMemo(() => {
      return jobs.reduce(
        (total, job) =>
          total +
          calculatePayroll(job)
            .gross,
        0
      );
    }, [
      jobs,
      hoursByJob,
    ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "var(--page-bg, #fff8fb)",
        color:
          "var(--text-primary, #281927)",
        paddingBottom:
          "120px",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          padding:
            "70px 29px 25px",
        }}
      >
        <div
          style={{
            fontSize: "15px",
            fontWeight: 800,
            letterSpacing:
              "0.16em",
            color:
              "#9b6b8c",
            marginBottom:
              "15px",
          }}
        >
          SALARY
        </div>

        <h1
          style={{
            margin: 0,
            fontSize:
              "46px",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing:
              "-0.04em",
          }}
        >
          Income & Work Hours
        </h1>

        <p
          style={{
            margin:
              "14px 0 0",
            fontSize:
              "19px",
            lineHeight: 1.45,
            color:
              "#a47796",
          }}
        >
          Enter work once. Budget Blossom
          calculates the paycheck and keeps
          expected and actual pay separate.
        </p>
      </div>

      {/* =================================================
          HOUSEHOLD INCOME SOURCES
      ================================================= */}

      <section
        style={{
          margin:
            "0 29px 25px",
          background:
            "#ffffff",
          border:
            "2px solid #f0dce6",
          borderRadius:
            "25px",
          padding:
            "28px 29px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: "15px",
            marginBottom:
              "24px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize:
                "18px",
              letterSpacing:
                "0.08em",
              color:
                "#976d8d",
            }}
          >
            HOUSEHOLD INCOME SOURCES
          </h2>

          <button
            type="button"
            onClick={
              handleNewJob
            }
            style={primaryButton}
          >
            + New Job
          </button>
        </div>

        {jobs.length === 0 && (
          <div
            style={{
              padding:
                "30px",
              textAlign:
                "center",
              color:
                "#9b7591",
            }}
          >
            No jobs added yet.
          </div>
        )}

        {jobs.map((job) => {
          const isOpen =
            Boolean(
              openJobs[job.id]
            );

          const payroll =
            calculatePayroll(
              job
            );

          const shifts =
            getJobHours(
              job.id
            );

          return (
            <div
              key={job.id}
              style={{
                marginBottom:
                  "18px",
                border:
                  isOpen
                    ? "4px solid #df5c91"
                    : "2px solid #f0dce6",
                borderRadius:
                  "28px",
                padding:
                  "28px",
                background:
                  "#fff",
              }}
            >
              {/* JOB HEADER */}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "20px",
                }}
              >
                <div
                  style={{
                    minWidth:
                      0,
                  }}
                >
                  <h3
                    style={{
                      margin:
                        "0 0 8px",
                      fontSize:
                        "30px",
                      lineHeight:
                        1.1,
                    }}
                  >
                    {job.owner} —{" "}
                    {job.employer}
                  </h3>

                  <div
                    style={{
                      fontSize:
                        "18px",
                      color:
                        "#8e6680",
                    }}
                  >
                    {job.position
                      ? `${job.position} · `
                      : ""}
                    {money(
                      job.hourlyRate
                    )}
                    /hr
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleJob(
                      job.id
                    )
                  }
                  style={{
                    ...primaryButton,
                    minWidth:
                      "145px",
                  }}
                >
                  {isOpen
                    ? "Opened"
                    : "Open"}
                </button>
              </div>

              {/* =================================================
                  EXPANDED JOB
              ================================================= */}

              {isOpen && (
                <div
                  style={{
                    marginTop:
                      "25px",
                  }}
                >
                  <div
                    style={{
                      borderTop:
                        "2px solid #f0dce6",
                      paddingTop:
                        "25px",
                      display:
                        "flex",
                      gap:
                        "15px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenHours(
                          job
                        )
                      }
                      style={{
                        ...primaryButton,
                        flex:
                          "1 1 180px",
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
                      style={{
                        ...secondaryButton,
                        flex:
                          "1 1 180px",
                      }}
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
                        ...deleteButton,
                        flex:
                          "1 1 180px",
                      }}
                    >
                      Delete Job
                    </button>
                  </div>

                  {/* PAY SCHEDULE */}

                  <div
                    style={{
                      marginTop:
                        "25px",
                      padding:
                        "25px",
                      border:
                        "2px solid #f3dda8",
                      background:
                        "#fffaf0",
                      borderRadius:
                        "22px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          800,
                        color:
                          "#97742f",
                        fontSize:
                          "17px",
                        letterSpacing:
                          "0.08em",
                        marginBottom:
                          "15px",
                      }}
                    >
                      PAY SCHEDULE
                    </div>

                    <div
                      style={{
                        fontSize:
                          "18px",
                        lineHeight:
                          1.7,
                        color:
                          "#806a48",
                      }}
                    >
                      {job.payPeriodStart &&
                      job.payPeriodEnd ? (
                        <>
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
                                "#d62e72",
                            }}
                          >
                            {formatDate(
                              job.payday
                            )}
                          </strong>
                        </>
                      ) : (
                        <>
                          ⚠️ Pay schedule needs
                          to be configured.
                          <br />
                          Tap{" "}
                          <strong>
                            Edit Job
                          </strong>{" "}
                          and enter the pay-period
                          start, end, and payday.
                        </>
                      )}
                    </div>
                  </div>

                  {/* SUMMARY */}

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                      gap:
                        "15px",
                      marginTop:
                        "25px",
                    }}
                  >
                    <SummaryBox
                      label="HOURS"
                      value={
                        (
                          payroll.regularHours +
                          payroll.overtimeHours +
                          payroll.holidayHours
                        ).toFixed(2)
                      }
                    />

                    <SummaryBox
                      label="GROSS"
                      value={money(
                        payroll.gross
                      )}
                    />

                    <SummaryBox
                      label="EST. NET"
                      value={money(
                        payroll.estimatedNet
                      )}
                    />
                  </div>

                  {/* WORK HOURS */}

                  <div
                    style={{
                      marginTop:
                        "28px",
                    }}
                  >
                    <h4
                      style={{
                        margin:
                          "0 0 15px",
                        fontSize:
                          "18px",
                        letterSpacing:
                          "0.08em",
                        color:
                          "#976d8d",
                      }}
                    >
                      WORK HOURS
                    </h4>

                    {shifts.length ===
                    0 ? (
                      <div
                        style={{
                          background:
                            "#fff5f9",
                          borderRadius:
                            "20px",
                          padding:
                            "24px",
                          textAlign:
                            "center",
                          color:
                            "#a47796",
                          fontSize:
                            "17px",
                        }}
                      >
                        No work hours entered
                        for this pay period yet.
                      </div>
                    ) : (
                      <div>
                        {shifts.map(
                          (shift) => (
                            <div
                              key={
                                shift.id
                              }
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "center",
                                gap:
                                  "15px",
                                padding:
                                  "16px",
                                marginBottom:
                                  "10px",
                                background:
                                  "#fff7fa",
                                borderRadius:
                                  "15px",
                              }}
                            >
                              <div>
                                <strong>
                                  {formatDate(
                                    shift.date
                                  )}
                                </strong>

                                <div
                                  style={{
                                    color:
                                      "#8e6680",
                                    marginTop:
                                      "4px",
                                  }}
                                >
                                  {shift.start}{" "}
                                  –{" "}
                                  {shift.end}
                                  {" · "}
                                  {Number(
                                    shift.hours
                                  ).toFixed(
                                    2
                                  )}{" "}
                                  hrs
                                  {" · "}
                                  {shift.category}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteShift(
                                    job.id,
                                    shift.id
                                  )
                                }
                                style={{
                                  border:
                                    "none",
                                  background:
                                    "transparent",
                                  color:
                                    "#c84d70",
                                  fontWeight:
                                    700,
                                  cursor:
                                    "pointer",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* PAYCHECK ESTIMATE */}

                  <div
                    style={{
                      marginTop:
                        "25px",
                      padding:
                        "25px",
                      border:
                        "2px solid #d7eddf",
                      background:
                        "#f5fbf7",
                      borderRadius:
                        "22px",
                    }}
                  >
                    <h4
                      style={{
                        margin:
                          "0 0 20px",
                        color:
                          "#4a8a66",
                        fontSize:
                          "17px",
                      }}
                    >
                      PAYCHECK ESTIMATE
                    </h4>

                    <PayRow
                      label="Regular"
                      value={`${payroll.regularHours.toFixed(
                        2
                      )} hrs · ${money(
                        payroll.regularPay
                      )}`}
                    />

                    <PayRow
                      label="Overtime"
                      value={`${payroll.overtimeHours.toFixed(
                        2
                      )} hrs · ${money(
                        payroll.overtimePay
                      )}`}
                    />

                    <PayRow
                      label="Holiday"
                      value={money(
                        payroll.holidayPay
                      )}
                    />

                    <div
                      style={{
                        borderTop:
                          "2px solid #d7eddf",
                        marginTop:
                          "12px",
                        paddingTop:
                          "15px",
                      }}
                    >
                      <PayRow
                        label="Estimated Gross"
                        value={money(
                          payroll.gross
                        )}
                        strong
                      />

                      <PayRow
                        label="Estimated Net"
                        value={money(
                          payroll.estimatedNet
                        )}
                        strong
                        green
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* =================================================
          HOUSEHOLD TOTAL
      ================================================= */}

      <section
        style={{
          margin:
            "0 29px 30px",
          background:
            "#fff",
          border:
            "2px solid #f0dce6",
          borderRadius:
            "24px",
          padding:
            "25px",
        }}
      >
        <div
          style={{
            color:
              "#976d8d",
            fontSize:
              "15px",
            fontWeight:
              800,
            letterSpacing:
              "0.08em",
          }}
        >
          CURRENT HOUSEHOLD ESTIMATED GROSS
        </div>

        <div
          style={{
            marginTop:
              "10px",
            fontSize:
              "32px",
            fontWeight:
              800,
          }}
        >
          {money(
            totalHouseholdGross
          )}
        </div>
      </section>

      {/* =================================================
          JOB MODAL
      ================================================= */}

      {showJobModal &&
        editingJob && (
          <Modal
            title={
              jobs.some(
                (job) =>
                  job.id ===
                  editingJob.id
              )
                ? "Edit Job"
                : "New Job / Employer"
            }
            onClose={() => {
              setShowJobModal(false);
              setEditingJob(null);
            }}
          >
            <Input
              label="Owner"
              value={
                editingJob.owner
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    owner: value,
                  })
                )
              }
              placeholder="Zai or Ariel"
            />

            <Input
              label="Employer"
              value={
                editingJob.employer
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    employer: value,
                  })
                )
              }
              placeholder="A&W"
            />

            <Input
              label="Position"
              value={
                editingJob.position
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    position: value,
                  })
                )
              }
              placeholder="Cashier / Kitchen"
            />

            <Input
              label="Hourly Rate"
              type="number"
              step="0.01"
              value={
                editingJob.hourlyRate
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    hourlyRate: value,
                  })
                )
              }
              placeholder="18.00"
            />

            <div
              style={{
                marginTop:
                  "20px",
                fontWeight:
                  800,
                color:
                  "#97742f",
              }}
            >
              PAY SCHEDULE
            </div>

            <Input
              label="Pay Period Start"
              type="date"
              value={
                editingJob.payPeriodStart
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    payPeriodStart:
                      value,
                  })
                )
              }
            />

            <Input
              label="Pay Period End"
              type="date"
              value={
                editingJob.payPeriodEnd
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    payPeriodEnd:
                      value,
                  })
                )
              }
            />

            <Input
              label="Payday"
              type="date"
              value={
                editingJob.payday
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    payday:
                      value,
                  })
                )
              }
            />

            <Input
              label="Overtime Multiplier"
              type="number"
              step="0.1"
              value={
                editingJob.overtimeMultiplier
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    overtimeMultiplier:
                      value,
                  })
                )
              }
            />

            <Input
              label="Holiday Multiplier"
              type="number"
              step="0.1"
              value={
                editingJob.holidayMultiplier
              }
              onChange={(value) =>
                setEditingJob(
                  (previous) => ({
                    ...previous,
                    holidayMultiplier:
                      value,
                  })
                )
              }
            />

            <div
              style={{
                display:
                  "flex",
                gap:
                  "12px",
                marginTop:
                  "25px",
              }}
            >
              <button
                type="button"
                onClick={
                  handleSaveJob
                }
                style={{
                  ...primaryButton,
                  flex: 1,
                }}
              >
                Save Job
              </button>

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
                  ...secondaryButton,
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

      {/* =================================================
          HOURS MODAL
      ================================================= */}

      {showHoursModal && (
        <Modal
          title="Add Work Hours"
          onClose={() =>
            setShowHoursModal(
              false
            )
          }
        >
          <Input
            label="Work Date"
            type="date"
            value={
              hoursForm.date
            }
            onChange={(value) =>
              setHoursForm(
                (previous) => ({
                  ...previous,
                  date: value,
                })
              )
            }
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "15px",
            }}
          >
            <Input
              label="Start"
              type="time"
              value={
                hoursForm.start
              }
              onChange={(value) =>
                setHoursForm(
                  (previous) => ({
                    ...previous,
                    start: value,
                  })
                )
              }
            />

            <Input
              label="End"
              type="time"
              value={
                hoursForm.end
              }
              onChange={(value) =>
                setHoursForm(
                  (previous) => ({
                    ...previous,
                    end: value,
                  })
                )
              }
            />
          </div>

          <Input
            label="Unpaid Break (minutes)"
            type="number"
            value={
              hoursForm.breakMinutes
            }
            onChange={(value) =>
              setHoursForm(
                (previous) => ({
                  ...previous,
                  breakMinutes:
                    value,
                })
              )
            }
          />

          <label
            style={{
              display:
                "block",
              marginTop:
                "18px",
              fontWeight:
                700,
            }}
          >
            Pay Type

            <select
              value={
                hoursForm.category
              }
              onChange={(event) =>
                setHoursForm(
                  (previous) => ({
                    ...previous,
                    category:
                      event.target
                        .value,
                  })
                )
              }
              style={
                selectStyle
              }
            >
              <option value="regular">
                Regular
              </option>

              <option value="overtime">
                Overtime
              </option>

              <option value="holiday">
                Holiday
              </option>
            </select>
          </label>

          <Input
            label="Night Differential Multiplier"
            type="number"
            step="0.1"
            value={
              hoursForm.nightDifferential
            }
            onChange={(value) =>
              setHoursForm(
                (previous) => ({
                  ...previous,
                  nightDifferential:
                    value,
                })
              )
            }
          />

          <Input
            label="Note"
            value={
              hoursForm.note
            }
            onChange={(value) =>
              setHoursForm(
                (previous) => ({
                  ...previous,
                  note: value,
                })
              )
            }
            placeholder="Optional"
          />

          {hoursForm.start &&
            hoursForm.end && (
              <div
                style={{
                  marginTop:
                    "20px",
                  padding:
                    "18px",
                  background:
                    "#fff5f9",
                  borderRadius:
                    "16px",
                  color:
                    "#8e6680",
                  fontWeight:
                    700,
                }}
              >
                Calculated hours:{" "}
                {calculateHours(
                  hoursForm.start,
                  hoursForm.end,
                  hoursForm.breakMinutes
                ).toFixed(2)}
              </div>
            )}

          <button
            type="button"
            onClick={
              handleSaveHours
            }
            style={{
              ...primaryButton,
              width: "100%",
              marginTop:
                "25px",
            }}
          >
            Save Hours
          </button>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#fff5f9",
        borderRadius:
          "18px",
        padding:
          "18px",
      }}
    >
      <div
        style={{
          color:
            "#a47796",
          fontSize:
            "14px",
          marginBottom:
            "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "25px",
          fontWeight:
            800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PayRow({
  label,
  value,
  strong = false,
  green = false,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        justifyContent:
          "space-between",
        gap:
          "15px",
        marginBottom:
          "12px",
        fontWeight:
          strong ? 800 : 500,
        color:
          green
            ? "#4a8a66"
            : "#342734",
        fontSize:
          strong
            ? "19px"
            : "17px",
      }}
    >
      <span>
        {label}
      </span>

      <span>
        {value}
      </span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
}) {
  return (
    <label
      style={{
        display:
          "block",
        marginTop:
          "16px",
        fontWeight:
          700,
        color:
          "#6f5366",
      }}
    >
      {label}

      <input
        type={type}
        value={
          value ?? ""
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        step={step}
        style={
          inputStyle
        }
      />
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}) {
  return (
    <div
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
      style={{
        position:
          "fixed",
        inset: 0,
        background:
          "rgba(40,25,39,0.45)",
        zIndex: 1000,
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding:
          "20px",
        overflowY:
          "auto",
      }}
    >
      <div
        style={{
          width:
            "min(560px, 100%)",
          maxHeight:
            "90vh",
          overflowY:
            "auto",
          background:
            "#fff",
          borderRadius:
            "28px",
          padding:
            "28px",
          boxShadow:
            "0 20px 60px rgba(40,25,39,0.25)",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "15px",
            marginBottom:
              "10px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize:
                "28px",
            }}
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            style={{
              border:
                "none",
              background:
                "#fff2f7",
              width:
                "42px",
              height:
                "42px",
              borderRadius:
                "50%",
              fontSize:
                "20px",
              cursor:
                "pointer",
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const primaryButton = {
  border: "none",
  background: "#d94d86",
  color: "#fff",
  borderRadius: "17px",
  padding: "17px 24px",
  fontSize: "17px",
  fontWeight: 800,
  cursor: "pointer",
  touchAction: "manipulation",
};

const secondaryButton = {
  border:
    "2px solid #f0dce6",
  background: "#fff",
  color: "#76566b",
  borderRadius: "17px",
  padding: "15px 22px",
  fontSize: "17px",
  fontWeight: 800,
  cursor: "pointer",
  touchAction: "manipulation",
};

const deleteButton = {
  border: "none",
  background: "#fff0f5",
  color: "#c84d70",
  borderRadius: "17px",
  padding: "17px 22px",
  fontSize: "17px",
  fontWeight: 800,
  cursor: "pointer",
  touchAction: "manipulation",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "15px 16px",
  border: "2px solid #ead5e0",
  borderRadius: "14px",
  background: "#fff",
  color: "#342734",
  fontSize: "17px",
  outline: "none",
};

const selectStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "15px 16px",
  border: "2px solid #ead5e0",
  borderRadius: "14px",
  background: "#fff",
  color: "#342734",
  fontSize: "17px",
};
