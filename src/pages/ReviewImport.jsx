/**
 * ReviewImport.jsx
 *
 * Budget Blossom
 * Smart Import Review
 */

import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

export default function ReviewImport({
  data = {},
  onSave,
  onCancel,
}) {
  function handleChange(key, value) {
    if (!onSave) return;

    onSave({
      ...data,
      [key]: value,
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: 24,
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontDisplay,
            marginBottom: 8,
          }}
        >
          ✅ Review Import
        </h1>

        <p
          style={{
            opacity: 0.7,
            marginBottom: 24,
          }}
        >
          Review the detected information before saving it to Budget Blossom.
        </p>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Bank</label>

          <input
            value={data.bank ?? ""}
            onChange={(e) =>
              handleChange("bank", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Balance</label>

          <input
            value={data.balance ?? ""}
            onChange={(e) =>
              handleChange("balance", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Credit Limit</label>

          <input
            value={data.creditLimit ?? ""}
            onChange={(e) =>
              handleChange("creditLimit", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Available Credit</label>

          <input
            value={data.availableCredit ?? ""}
            onChange={(e) =>
              handleChange("availableCredit", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Minimum Payment</label>

          <input
            value={data.minimumPayment ?? ""}
            onChange={(e) =>
              handleChange("minimumPayment", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <label>Due Date</label>

          <input
            value={data.dueDate ?? ""}
            onChange={(e) =>
              handleChange("dueDate", e.target.value)
            }
            style={inputStyle}
          />
        </SoftCard>

        <div
          style={{
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={onCancel}
            style={secondaryButton}
          >
            Cancel
          </button>

          <button
            onClick={() => onSave?.(data)}
            style={primaryButton}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginTop: 8,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 16,
  boxSizing: "border-box",
};

const primaryButton = {
  flex: 1,
  padding: 14,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  background: colors.primary,
  color: "#fff",
  fontWeight: 700,
};

const secondaryButton = {
  flex: 1,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #ddd",
  cursor: "pointer",
  background: "#fff",
};
