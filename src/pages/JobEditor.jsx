import { useState } from "react";

const inputStyle = {
  width: "100%",
  padding: "10px 11px",
  border: "1px solid var(--color-border, #f0dce4)",
  borderRadius: "10px",
  background: "#fff",
  color: "var(--color-text, #3a2430)",
  fontSize: "13px",
  outline: "none",
};

const sectionStyle = {
  padding: "14px",
  border: "1px solid var(--color-border, #f0dce4)",
  borderRadius: "14px",
  background: "#fff",
  marginBottom: "12px",
};

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          marginBottom: "6px",
          color: "var(--color-text-soft, #7a5868)",
        }}
      >
        {label}
      </div>

      {children}

      {hint && (
        <div
          style={{
            marginTop: "4px",
            fontSize: "10px",
            color: "var(--color-text-muted, #b899a8)",
          }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--color-text-soft, #7a5868)",
        marginBottom: "12px",
      }}
    >
      {children}
    </div>
  );
}

export default function JobEditor({
  job = null,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    id:
      job?.id ??
      `job-${Date.now()}`,

    person:
      job?.person ??
      "Zai",

    employer:
      job?.employer ??
      "",

    title:
      job?.title ??
      "",

    rate:
      job?.rate ??
      0,

    province:
      job?.province ??
      "Ontario",

    active:
      job?.active ??
      true,

    hasUnpaidBreak:
      job?.hasUnpaidBreak ??
      true,

    defaultBreakMinutes:
      job?.defaultBreakMinutes ??
      30,

    overtimeThreshold:
      job?.overtimeThreshold ??
      44,

    overtimeMultiplier:
      job?.overtimeMultiplier ??
      1.5,

    statHolidayMultiplier:
      job?.statHolidayMultiplier ??
      1.5,

    statHolidayDoubleMultiplier:
      job?.statHolidayDoubleMultiplier ??
      2,

    vacationPercent:
      job?.vacationPercent ??
      0,

    payFrequency:
      job?.payFrequency ??
      "Biweekly",

    payday:
      job?.payday ??
      "",

    payPeriodStart:
      job?.payPeriodStart ??
      "",

    payPeriodEnd:
      job?.payPeriodEnd ??
      "",

    federalTax:
      job?.federalTax ??
      0,

    cpp:
      job?.cpp ??
      0,

    ei:
      job?.ei ??
      0,

    otherDeductions:
      job?.otherDeductions ??
      0,

    notes:
      job?.notes ??
      "",
  });

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const cleanedJob = {
      ...form,

      rate:
        Number(form.rate) || 0,

      defaultBreakMinutes:
        form.hasUnpaidBreak
          ? Number(form.defaultBreakMinutes) || 0
          : 0,

      overtimeThreshold:
        Number(form.overtimeThreshold) || 44,

      overtimeMultiplier:
        Number(form.overtimeMultiplier) || 1.5,

      statHolidayMultiplier:
        Number(form.statHolidayMultiplier) || 1.5,

      statHolidayDoubleMultiplier:
        Number(form.statHolidayDoubleMultiplier) || 2,

      vacationPercent:
        Number(form.vacationPercent) || 0,

      federalTax:
        Number(form.federalTax) || 0,

      cpp:
        Number(form.cpp) || 0,

      ei:
        Number(form.ei) || 0,

      otherDeductions:
        Number(form.otherDeductions) || 0,
    };

    if (typeof onSave === "function") {
      onSave(cleanedJob);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted, #b899a8)",
            }}
          >
            Employment
          </div>

          <h2
            style={{
              margin: "3px 0 0",
              fontFamily:
                "var(--font-display, Georgia, serif)",
              fontSize: "25px",
              color: "var(--color-text, #3a2430)",
            }}
          >
            {job ? "Edit Job" : "Add New Job"}
          </h2>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              border:
                "1px solid var(--color-border, #f0dce4)",
              background: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* BASIC JOB INFORMATION */}
      <section style={sectionStyle}>
        <SectionTitle>
          Job Information
        </SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <Field label="Person">
            <select
              style={inputStyle}
              value={form.person}
              onChange={(e) =>
                update("person", e.target.value)
              }
            >
              <option value="Zai">
                Me
              </option>
              <option value="Ariel">
                Husband
              </option>
            </select>
          </Field>

          <Field label="Employer">
            <input
              style={inputStyle}
              value={form.employer}
              placeholder="e.g. Loblaws"
              onChange={(e) =>
                update("employer", e.target.value)
              }
            />
          </Field>

          <Field label="Job Title">
            <input
              style={inputStyle}
              value={form.title}
              placeholder="e.g. Clerk"
              onChange={(e) =>
                update("title", e.target.value)
              }
            />
          </Field>

          <Field label="Hourly Rate">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.rate}
              onChange={(e) =>
                update("rate", e.target.value)
              }
            />
          </Field>

          <Field label="Province">
            <select
              style={inputStyle}
              value={form.province}
              onChange={(e) =>
                update("province", e.target.value)
              }
            >
              <option>
                Ontario
              </option>
              <option>
                British Columbia
              </option>
              <option>
                Alberta
              </option>
              <option>
                Manitoba
              </option>
              <option>
                Saskatchewan
              </option>
              <option>
                Quebec
              </option>
              <option>
                Nova Scotia
              </option>
              <option>
                New Brunswick
              </option>
              <option>
                Newfoundland and Labrador
              </option>
              <option>
                Prince Edward Island
              </option>
            </select>
          </Field>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "14px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              update("active", e.target.checked)
            }
          />

          Active job
        </label>
      </section>

      {/* BREAK SETTINGS */}
      <section style={sectionStyle}>
        <SectionTitle>
          Break Settings
        </SectionTitle>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={form.hasUnpaidBreak}
            onChange={(e) =>
              update(
                "hasUnpaidBreak",
                e.target.checked
              )
            }
          />

          This job normally has an unpaid break
        </label>

        {form.hasUnpaidBreak && (
          <div
            style={{
              maxWidth: "220px",
              marginTop: "12px",
            }}
          >
            <Field
              label="Default Unpaid Break"
              hint="You can override this for an individual shift."
            >
              <select
                style={inputStyle}
                value={
                  form.defaultBreakMinutes
                }
                onChange={(e) =>
                  update(
                    "defaultBreakMinutes",
                    Number(e.target.value)
                  )
                }
              >
                <option value={0}>
                  0 minutes
                </option>
                <option value={15}>
                  15 minutes
                </option>
                <option value={20}>
                  20 minutes
                </option>
                <option value={30}>
                  30 minutes
                </option>
                <option value={45}>
                  45 minutes
                </option>
                <option value={60}>
                  60 minutes
                </option>
                <option value={90}>
                  90 minutes
                </option>
              </select>
            </Field>
          </div>
        )}
      </section>

      {/* OVERTIME */}
      <section style={sectionStyle}>
        <SectionTitle>
          Overtime
        </SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <Field
            label="Overtime Threshold"
            hint="Example: Ontario standard threshold can be configured here."
          >
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.5"
              value={form.overtimeThreshold}
              onChange={(e) =>
                update(
                  "overtimeThreshold",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Overtime Multiplier">
            <select
              style={inputStyle}
              value={form.overtimeMultiplier}
              onChange={(e) =>
                update(
                  "overtimeMultiplier",
                  Number(e.target.value)
                )
              }
            >
              <option value={1}>
                1×
              </option>
              <option value={1.5}>
                1.5×
              </option>
              <option value={2}>
                2×
              </option>
            </select>
          </Field>
        </div>
      </section>

      {/* STAT HOLIDAYS */}
      <section style={sectionStyle}>
        <SectionTitle>
          Statutory Holiday Rules
        </SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <Field label="Stat Holiday Rate">
            <select
              style={inputStyle}
              value={
                form.statHolidayMultiplier
              }
              onChange={(e) =>
                update(
                  "statHolidayMultiplier",
                  Number(e.target.value)
                )
              }
            >
              <option value={1}>
                1×
              </option>
              <option value={1.5}>
                1.5×
              </option>
              <option value={2}>
                2×
              </option>
            </select>
          </Field>

          <Field label="Double-Time Rate">
            <select
              style={inputStyle}
              value={
                form.statHolidayDoubleMultiplier
              }
              onChange={(e) =>
                update(
                  "statHolidayDoubleMultiplier",
                  Number(e.target.value)
                )
              }
            >
              <option value={1.5}>
                1.5×
              </option>
              <option value={2}>
                2×
              </option>
            </select>
          </Field>

          <Field
            label="Vacation Pay %"
            hint="Leave at 0 if not applicable."
          >
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.1"
              value={form.vacationPercent}
              onChange={(e) =>
                update(
                  "vacationPercent",
                  e.target.value
                )
              }
            />
          </Field>
        </div>
      </section>

      {/* PAY SCHEDULE */}
      <section style={sectionStyle}>
        <SectionTitle>
          Pay Schedule
        </SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <Field label="Pay Frequency">
            <select
              style={inputStyle}
              value={form.payFrequency}
              onChange={(e) =>
                update(
                  "payFrequency",
                  e.target.value
                )
              }
            >
              <option>
                Weekly
              </option>
              <option>
                Biweekly
              </option>
              <option>
                Semi-monthly
              </option>
              <option>
                Monthly
              </option>
              <option>
                Custom
              </option>
            </select>
          </Field>

          <Field
            label="Payday"
            hint="Example: 7th and 22nd"
          >
            <input
              style={inputStyle}
              value={form.payday}
              placeholder="e.g. 7th and 22nd"
              onChange={(e) =>
                update(
                  "payday",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Current Period Start">
            <input
              style={inputStyle}
              type="date"
              value={
                form.payPeriodStart
              }
              onChange={(e) =>
                update(
                  "payPeriodStart",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Current Period End">
            <input
              style={inputStyle}
              type="date"
              value={
                form.payPeriodEnd
              }
              onChange={(e) =>
                update(
                  "payPeriodEnd",
                  e.target.value
                )
              }
            />
          </Field>
        </div>
      </section>

      {/* DEDUCTIONS */}
      <section style={sectionStyle}>
        <SectionTitle>
          Estimated Deductions
        </SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
          }}
        >
          <Field label="Federal Tax">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.federalTax}
              onChange={(e) =>
                update(
                  "federalTax",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="CPP">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.cpp}
              onChange={(e) =>
                update(
                  "cpp",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="EI">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.ei}
              onChange={(e) =>
                update(
                  "ei",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Other Deductions">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={
                form.otherDeductions
              }
              onChange={(e) =>
                update(
                  "otherDeductions",
                  e.target.value
                )
              }
            />
          </Field>
        </div>
      </section>

      {/* NOTES */}
      <section style={sectionStyle}>
        <Field label="Notes">
          <textarea
            style={{
              ...inputStyle,
              minHeight: "80px",
              resize: "vertical",
            }}
            value={form.notes}
            placeholder="Optional notes about this job..."
            onChange={(e) =>
              update(
                "notes",
                e.target.value
              )
            }
          />
        </Field>
      </section>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          paddingBottom: "20px",
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border:
                "1px solid var(--color-border, #f0dce4)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "10px",
            background:
              "var(--color-pink, #e8708a)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Save Job
        </button>
      </div>
    </form>
  );
}
