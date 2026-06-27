/**
 * FilePicker.jsx
 *
 * Budget Blossom
 * Smart File Picker
 */

import { useRef, useState } from "react";
import { colors, typography } from "../../ui/designTokens";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function FilePicker({
  onFileSelected,
}) {
  const inputRef = useRef(null);

  const [error, setError] = useState("");

  function openPicker() {
    inputRef.current?.click();
  }

  function validate(file) {
    if (!file) return false;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is larger than 15MB.");
      return false;
    }

    setError("");
    return true;
  }

  function handleChange(e) {
    const file = e.target.files?.[0];

    if (!validate(file)) return;

    onFileSelected?.(file);
  }

  return (
    <div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      <button
        onClick={openPicker}
        style={{
          width: "100%",
          padding: "18px",
          borderRadius: "18px",
          border: `2px dashed ${colors.border}`,
          background: colors.bgCard,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 12,
          }}
        >
          📷
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: 18,
            fontFamily: typography.fontDisplay,
          }}
        >
          Choose a File
        </div>

        <div
          style={{
            marginTop: 6,
            opacity: .7,
            fontSize: 13,
          }}
        >
          Screenshot, Receipt, Credit Card or PDF
        </div>
      </button>

      {error && (
        <div
          style={{
            color: "#d44",
            marginTop: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

    </div>
  );
}
