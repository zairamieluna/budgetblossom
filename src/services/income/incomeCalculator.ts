import React, { useMemo, useState } from "react";
import {
  calculateShiftHours,
  calculateShift,
  calculatePaycheck,
} from "../services/income/incomeCalculator";

const HOLIDAYS = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-16", name: "Family Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-18", name: "Victoria Day" },
  { date: "2026-07-01", name: "Canada Day" },
  { date: "2026-08-03", name: "Civic Holiday" },
  { date: "2026-09-07", name: "Labour Day" },
  { date: "2026-10-12", name: "Thanksgiving" },
  { date: "2026-11-11", name: "Remembrance Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
];

const DEFAULT_JOB = {
  name: "Work",
  hourlyRate: 18,
};

const money = (value) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number(value || 0));

const dateLabel = (date) => {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function getHoliday(date) {
  return HOLIDAYS.find((holiday) => holiday.date === date);
}

function AppCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        {children}
      </select>
    </label>
  );
}

function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function Income() {
  const [job, setJob] = useState(DEFAULT_JOB);

  const [payPeriodStart, setPayPeriodStart] = useState("2026-07-20");
  const [payPeriodEnd, setPayPeriodEnd] = useState("2026-08-02");
  const [payDate, setPayDate] = useState("2026-08-07");

  const [shifts, setShifts] = useState([
    {
      id: crypto.randomUUID(),
      date: "2026-07-20",
      startTime: "08:00",
      endTime: "16:00",
      unpaidBreakMinutes: 30,
      hourlyRate: 18,
      isStatHoliday: false,
      statMultiplier: 1,
      overtimeMultiplier: 1.5,
      freezingPremium: 0,
      eveningPremium: 0,
      trainingHours: 0,
      type: "regular",
    },
  ]);

  const [deductions, setDeductions] = useState({
    federalTax: 0,
    cpp: 0,
    ei: 0,
    otherDeductions: 0,
  });

  const [vacationPercent, setVacationPercent] = useState(0.04);
  const [bonus, setBonus] = useState(0);

  const [showAddShift, setShowAddShift] = useState(false);

  const [newShift, setNewShift] = useState({
    date: "",
    startTime: "08:00",
    endTime: "16:00",
    unpaidBreakMinutes: 30,
    hourlyRate: 18,
    isStatHoliday: false,
    statMultiplier: 1,
    overtimeMultiplier: 1.5,
    freezingPremium: 0,
    eveningPremium: 0,
    trainingHours: 0,
    type: "regular",
  });

  /*
   * ---------------------------------------------------------
   * CALCULATE ALL SHIFTS
   * ---------------------------------------------------------
   */

  const calculatedShifts = useMemo(() => {
    return shifts.map((shift) => ({
      ...shift,
      calculation: calculateShift(shift),
    }));
  }, [shifts]);

  /*
   * ---------------------------------------------------------
   * PAYCHECK
   * ---------------------------------------------------------
   */

  const paycheck = useMemo(() => {
    try {
      const result = calculatePaycheck(
        shifts.map(({ id, type, ...shift }) => shift),
        {
          vacationPercent,
          bonus,
          federalTax: deductions.federalTax,
          cpp: deductions.cpp,
          ei: deductions.ei,
          otherDeductions: deductions.otherDeductions,
        }
      );

      return {
        ...result,
        payPeriodStart,
        payPeriodEnd,
        payDate,
      };
    } catch {
      return null;
    }
  }, [
    shifts,
    vacationPercent,
    bonus,
    deductions,
    payPeriodStart,
    payPeriodEnd,
    payDate,
  ]);

  /*
   * ---------------------------------------------------------
   * TOTALS
   * ---------------------------------------------------------
   */

  const totals = useMemo(() => {
    if (!paycheck) {
      return {
        hours: 0,
        regularHours: 0,
        overtimeHours: 0,
        statHours: 0,
        trainingHours: 0,
        premiumHours: 0,
      };
    }

    return {
      hours:
        paycheck.regularHours +
        paycheck.overtimeHours +
        paycheck.statHours,

      regularHours: paycheck.regularHours,
      overtimeHours: paycheck.overtimeHours,
      statHours: paycheck.statHours,
      trainingHours: paycheck.trainingHours,
      premiumHours: paycheck.premiumHours,
    };
  }, [paycheck]);

  /*
   * ---------------------------------------------------------
   * ADD SHIFT
   * ---------------------------------------------------------
   */

  function addShift() {
    if (!newShift.date) {
      alert("Please select a work date.");
      return;
    }

    if (!newShift.startTime || !newShift.endTime) {
      alert("Please enter a start and end time.");
      return;
    }

    const holiday = getHoliday(newShift.date);

    const shiftToAdd = {
      ...newShift,
      id: crypto.randomUUID(),

      hourlyRate: Number(newShift.hourlyRate),
      unpaidBreakMinutes: Number(newShift.unpaidBreakMinutes),
      statMultiplier: Number(newShift.statMultiplier),
      overtimeMultiplier: Number(newShift.overtimeMultiplier),
      freezingPremium: Number(newShift.freezingPremium),
      eveningPremium: Number(newShift.eveningPremium),
      trainingHours: Number(newShift.trainingHours),

      isStatHoliday:
        newShift.isStatHoliday || Boolean(holiday),
    };

    setShifts((current) => [...current, shiftToAdd]);

    setNewShift({
      date: "",
      startTime: "08:00",
      endTime: "16:00",
      unpaidBreakMinutes: 30,
      hourlyRate: Number(job.hourlyRate),
      isStatHoliday: false,
      statMultiplier: 1,
      overtimeMultiplier: 1.5,
      freezingPremium: 0,
      eveningPremium: 0,
      trainingHours: 0,
      type: "regular",
    });

    setShowAddShift(false);
  }

  /*
   * ---------------------------------------------------------
   * REMOVE SHIFT
   * ---------------------------------------------------------
   */

  function removeShift(id) {
    setShifts((current) =>
      current.filter((shift) => shift.id !== id)
    );
  }

  /*
   * ---------------------------------------------------------
   * UPDATE SHIFT
   * ---------------------------------------------------------
   */

  function updateShift(id, field, value) {
    setShifts((current) =>
      current.map((shift) => {
        if (shift.id !== id) return shift;

        const updated = {
          ...shift,
          [field]: value,
        };

        if (
          field === "hourlyRate" ||
          field === "unpaidBreakMinutes" ||
          field === "statMultiplier" ||
          field === "overtimeMultiplier" ||
          field === "freezingPremium" ||
          field === "eveningPremium" ||
          field === "trainingHours"
        ) {
          updated[field] = Number(value);
        }

        return updated;
      })
    );
  }

  /*
   * ---------------------------------------------------------
   * AUTOMATIC STAT HOLIDAY DETECTION
   * ---------------------------------------------------------
   */

  function handleDateChange(id, date) {
    const holiday = getHoliday(date);

    setShifts((current) =>
      current.map((shift) =>
        shift.id === id
          ? {
              ...shift,
              date,
              isStatHoliday: Boolean(holiday),
            }
          : shift
      )
    );
  }

  /*
   * ---------------------------------------------------------
   * NEW SHIFT DATE
   * ---------------------------------------------------------
   */

  function handleNewShiftDate(date) {
    const holiday = getHoliday(date);

    setNewShift((current) => ({
      ...current,
      date,
      isStatHoliday: Boolean(holiday),
    }));
  }

  /*
   * ---------------------------------------------------------
   * PAY BREAKDOWN
   * ---------------------------------------------------------
   */

  const earningsBreakdown = [
    {
      label: "Regular Pay",
      value: paycheck?.regularPay ?? 0,
    },
    {
      label: "Overtime Pay",
      value: paycheck?.overtimePay ?? 0,
    },
    {
      label: "Stat Holiday Pay",
      value: paycheck?.statPay ?? 0,
    },
    {
      label: "Premiums",
      value: paycheck?.premiumPay ?? 0,
    },
    {
      label: "Training",
      value: paycheck?.trainingPay ?? 0,
    },
    {
      label: "Vacation Pay",
      value: paycheck?.vacationPay ?? 0,
    },
    {
      label: "Bonus",
      value: paycheck?.bonus ?? 0,
    },
  ];

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Income & Payroll
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track your shifts and automatically calculate your
              estimated paycheck.
            </p>
          </div>

          <button
            onClick={() => setShowAddShift(true)}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Add Shift
          </button>
        </div>

        {/* JOB SETTINGS */}

        <AppCard className="mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Job Settings
            </h2>

            <p className="text-sm text-slate-500">
              Set the default information used when adding shifts.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Job"
              value={job.name}
              onChange={(value) =>
                setJob((current) => ({
                  ...current,
                  name: value,
                }))
              }
            />

            <Input
              label="Hourly Rate"
              type="number"
              step="0.01"
              value={job.hourlyRate}
              onChange={(value) =>
                setJob((current) => ({
                  ...current,
                  hourlyRate: Number(value),
                }))
              }
            />

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-600">
                Default Rate
              </p>

              <p className="mt-1 text-2xl font-bold text-indigo-900">
                {money(job.hourlyRate)}/hr
              </p>
            </div>
          </div>
        </AppCard>

        {/* PAY PERIOD */}

        <AppCard className="mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Pay Period
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Period Start"
              type="date"
              value={payPeriodStart}
              onChange={setPayPeriodStart}
            />

            <Input
              label="Period End"
              type="date"
              value={payPeriodEnd}
              onChange={setPayPeriodEnd}
            />

            <Input
              label="Pay Date"
              type="date"
              value={payDate}
              onChange={setPayDate}
            />
          </div>
        </AppCard>

        {/* SUMMARY */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Gross Pay"
            value={money(paycheck?.grossPay)}
            subtitle="Before deductions"
          />

          <SummaryCard
            title="Net Pay"
            value={money(paycheck?.netPay)}
            subtitle="Estimated take-home"
          />

          <SummaryCard
            title="Total Hours"
            value={totals.hours.toFixed(2)}
            subtitle="Paid work hours"
          />

          <SummaryCard
            title="Deductions"
            value={money(paycheck?.totalDeductions)}
            subtitle="Taxes + deductions"
          />
        </div>

        {/* SHIFT LIST */}

        <AppCard className="mb-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Work Shifts
              </h2>

              <p className="text-sm text-slate-500">
                Holidays are detected automatically.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-4">
            {calculatedShifts.map(
              ({ calculation, ...shift }, index) => {
                const holiday = getHoliday(shift.date);

                return (
                  <div
                    key={shift.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          Shift #{index + 1}
                        </p>

                        {holiday && (
                          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            🇨🇦 {holiday.name}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => removeShift(shift.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <Input
                        label="Date"
                        type="date"
                        value={shift.date}
                        onChange={(value) =>
                          handleDateChange(shift.id, value)
                        }
                      />

                      <Input
                        label="Start"
                        type="time"
                        value={shift.startTime}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "startTime",
                            value
                          )
                        }
                      />

                      <Input
                        label="End"
                        type="time"
                        value={shift.endTime}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "endTime",
                            value
                          )
                        }
                      />

                      <Input
                        label="Unpaid Break (minutes)"
                        type="number"
                        value={shift.unpaidBreakMinutes}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "unpaidBreakMinutes",
                            value
                          )
                        }
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <Input
                        label="Hourly Rate"
                        type="number"
                        step="0.01"
                        value={shift.hourlyRate}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "hourlyRate",
                            value
                          )
                        }
                      />

                      <Select
                        label="Stat Holiday"
                        value={
                          shift.isStatHoliday
                            ? "yes"
                            : "no"
                        }
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "isStatHoliday",
                            value === "yes"
                          )
                        }
                      >
                        <option value="no">
                          Regular Day
                        </option>

                        <option value="yes">
                          Stat Holiday
                        </option>
                      </Select>

                      <Select
                        label="Stat Multiplier"
                        value={shift.statMultiplier}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "statMultiplier",
                            value
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
                      </Select>

                      <Select
                        label="Overtime Multiplier"
                        value={shift.overtimeMultiplier}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "overtimeMultiplier",
                            value
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
                      </Select>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <Input
                        label="Freezing Premium ($)"
                        type="number"
                        step="0.01"
                        value={shift.freezingPremium}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "freezingPremium",
                            value
                          )
                        }
                      />

                      <Input
                        label="Evening Premium ($)"
                        type="number"
                        step="0.01"
                        value={shift.eveningPremium}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "eveningPremium",
                            value
                          )
                        }
                      />

                      <Input
                        label="Training Hours"
                        type="number"
                        step="0.01"
                        value={shift.trainingHours}
                        onChange={(value) =>
                          updateShift(
                            shift.id,
                            "trainingHours",
                            value
                          )
                        }
                      />

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Paid Hours
                        </p>

                        <p className="text-xl font-bold text-slate-900">
                          {calculation.hours.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* SHIFT RESULT */}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Regular
                        </p>

                        <p className="font-semibold">
                          {money(
                            calculation.regularPay
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Overtime
                        </p>

                        <p className="font-semibold">
                          {money(
                            calculation.overtimePay
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Stat
                        </p>

                        <p className="font-semibold">
                          {money(
                            calculation.statPay
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          Premiums
                        </p>

                        <p className="font-semibold">
                          {money(
                            calculation.premiumPay
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-indigo-50 p-3">
                        <p className="text-xs text-indigo-600">
                          Shift Gross
                        </p>

                        <p className="font-bold text-indigo-900">
                          {money(
                            calculation.grossPay
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </AppCard>

        {/* ADD SHIFT MODAL */}

        {showAddShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Add Work Shift
                  </h2>

                  <p className="text-sm text-slate-500">
                    Enter your actual work schedule.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddShift(false)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Date"
                  type="date"
                  value={newShift.date}
                  onChange={handleNewShiftDate}
                />

                <Input
                  label="Hourly Rate"
                  type="number"
                  step="0.01"
                  value={newShift.hourlyRate}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      hourlyRate: Number(value),
                    }))
                  }
                />

                <Input
                  label="Start Time"
                  type="time"
                  value={newShift.startTime}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      startTime: value,
                    }))
                  }
                />

                <Input
                  label="End Time"
                  type="time"
                  value={newShift.endTime}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      endTime: value,
                    }))
                  }
                />

                <Input
                  label="Unpaid Break (minutes)"
                  type="number"
                  value={newShift.unpaidBreakMinutes}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      unpaidBreakMinutes: Number(value),
                    }))
                  }
                />

                <Select
                  label="Stat Holiday"
                  value={
                    newShift.isStatHoliday
                      ? "yes"
                      : "no"
                  }
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      isStatHoliday:
                        value === "yes",
                    }))
                  }
                >
                  <option value="no">
                    Regular Day
                  </option>

                  <option value="yes">
                    Stat Holiday
                  </option>
                </Select>

                <Select
                  label="Stat Multiplier"
                  value={newShift.statMultiplier}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      statMultiplier: Number(value),
                    }))
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
                </Select>

                <Select
                  label="Overtime Multiplier"
                  value={newShift.overtimeMultiplier}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      overtimeMultiplier: Number(value),
                    }))
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
                </Select>

                <Input
                  label="Freezing Premium ($)"
                  type="number"
                  step="0.01"
                  value={newShift.freezingPremium}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      freezingPremium: Number(value),
                    }))
                  }
                />

                <Input
                  label="Evening Premium ($)"
                  type="number"
                  step="0.01"
                  value={newShift.eveningPremium}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      eveningPremium: Number(value),
                    }))
                  }
                />

                <Input
                  label="Training Hours"
                  type="number"
                  step="0.01"
                  value={newShift.trainingHours}
                  onChange={(value) =>
                    setNewShift((current) => ({
                      ...current,
                      trainingHours: Number(value),
                    }))
                  }
                />
              </div>

              {newShift.date &&
                getHoliday(newShift.date) && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    🇨🇦 <strong>
                      {getHoliday(newShift.date).name}
                    </strong>{" "}
                    detected. This shift will be treated
                    as a statutory holiday.
                  </div>
                )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() =>
                    setShowAddShift(false)
                  }
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={addShift}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Add Shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EARNINGS BREAKDOWN */}

        <div className="grid gap-6 lg:grid-cols-2">
          <AppCard>
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Earnings Breakdown
            </h2>

            <div className="space-y-3">
              {earningsBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                >
                  <span className="text-sm text-slate-600">
                    {item.label}
                  </span>

                  <span className="font-semibold text-slate-900">
                    {money(item.value)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-50 p-4">
              <span className="font-semibold text-indigo-900">
                Gross Pay
              </span>

              <span className="text-xl font-bold text-indigo-900">
                {money(paycheck?.grossPay)}
              </span>
            </div>
          </AppCard>

          {/* DEDUCTIONS */}

          <AppCard>
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Deductions
            </h2>

            <div className="grid gap-4">
              <Input
                label="Federal Tax"
                type="number"
                step="0.01"
                value={deductions.federalTax}
                onChange={(value) =>
                  setDeductions((current) => ({
                    ...current,
                    federalTax: Number(value),
                  }))
                }
              />

              <Input
                label="CPP"
                type="number"
                step="0.01"
                value={deductions.cpp}
                onChange={(value) =>
                  setDeductions((current) => ({
                    ...current,
                    cpp: Number(value),
                  }))
                }
              />

              <Input
                label="EI"
                type="number"
                step="0.01"
                value={deductions.ei}
                onChange={(value) =>
                  setDeductions((current) => ({
                    ...current,
                    ei: Number(value),
                  }))
                }
              />

              <Input
                label="Other Deductions"
                type="number"
                step="0.01"
                value={deductions.otherDeductions}
                onChange={(value) =>
                  setDeductions((current) => ({
                    ...current,
                    otherDeductions: Number(value),
                  }))
                }
              />
            </div>

            <div className="mt-5 rounded-xl bg-slate-100 p-4">
              <div className="flex justify-between">
                <span className="font-medium">
                  Total Deductions
                </span>

                <span className="font-bold">
                  {money(paycheck?.totalDeductions)}
                </span>
              </div>

              <div className="mt-2 flex justify-between text-lg">
                <span className="font-bold">
                  Net Pay
                </span>

                <span className="font-bold text-green-600">
                  {money(paycheck?.netPay)}
                </span>
              </div>
            </div>
          </AppCard>
        </div>

        {/* ADDITIONAL PAY */}

        <AppCard className="mt-6">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Additional Pay
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Vacation Pay %"
              type="number"
              step="0.01"
              value={(vacationPercent * 100).toFixed(2)}
              onChange={(value) =>
                setVacationPercent(
                  Number(value) / 100
                )
              }
            />

            <Input
              label="Bonus"
              type="number"
              step="0.01"
              value={bonus}
              onChange={(value) =>
                setBonus(Number(value))
              }
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Vacation pay is calculated from eligible
            earnings. Confirm your employer's exact
            vacation-pay rules before relying on this
            estimate.
          </p>
        </AppCard>

        {/* FINAL PAY */}

        <div className="mt-6 rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-slate-400">
                Gross
              </p>

              <p className="mt-1 text-2xl font-bold">
                {money(paycheck?.grossPay)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Deductions
              </p>

              <p className="mt-1 text-2xl font-bold">
                {money(
                  paycheck?.totalDeductions
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Net Pay
              </p>

              <p className="mt-1 text-2xl font-bold text-green-400">
                {money(paycheck?.netPay)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Pay Date
              </p>

              <p className="mt-1 text-lg font-semibold">
                {dateLabel(payDate)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
