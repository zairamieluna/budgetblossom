/**
 * MoodTracker.jsx
 *
 * Budget Blossom
 */

import { useState } from "react";
import SoftCard from "../common/SoftCard";
import { colors, transitions } from "../../ui/designTokens";

const MOODS = [
  { emoji: "😊", label: "Happy", value: "happy" },
  { emoji: "😐", label: "Okay", value: "okay" },
  { emoji: "😔", label: "Sad", value: "sad" },
  { emoji: "😤", label: "Stressed", value: "stressed" },
  { emoji: "🥲", label: "Meh", value: "meh" },
];

export default function MoodTracker({
  rawData,
  saving,
  onSave,
}) {
  const todayStr = new Date().toISOString().split("T")[0];

  const existing =
    rawData?.moods?.[todayStr];

  const [selected, setSelected] = useState(
    existing ?? null
  );

  const [saved, setSaved] = useState(
    !!existing
  );

  async function pickMood(value) {
    setSelected(value);
    setSaved(false);

    const updated = {
      ...rawData,
      moods: {
        ...(rawData?.moods ?? {}),
        [todayStr]: value,
      },
    };

    await onSave(updated);

    setSaved(true);
  }

  const currentMood = MOODS.find(
    (m) => m.value === selected
  );

  return (
    <SoftCard
      variant="base"
      noAnimate
      style={{
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: colors.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            Today's Mood
          </div>

          <div
            style={{
              fontSize: "12px",
              color: colors.textMuted,
            }}
          >
            {saved && currentMood
              ? `Feeling ${currentMood.label} today 🌸`
              : "How are you feeling?"}
          </div>
        </div>

        {saved && currentMood && (
          <div
            style={{
              fontSize: "28px",
            }}
          >
            {currentMood.emoji}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          justifyContent: "space-between",
        }}
      >
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            onClick={() =>
              pickMood(mood.value)
            }
            disabled={saving}
            title={mood.label}
            style={{
              flex: 1,
              padding: "10px 4px",
              borderRadius: "10px",
              border:
                selected === mood.value
                  ? `2px solid ${colors.pinkDeep}`
                  : `2px solid ${colors.border}`,
              background:
                selected === mood.value
                  ? colors.pinkPale
                  : colors.bgDeep,
              cursor: saving
                ? "default"
                : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              transition: `all ${transitions.base}`,
              transform:
                selected === mood.value
                  ? "scale(1.08)"
                  : "scale(1)",
            }}
          >
            <span
              style={{
                fontSize: "22px",
              }}
            >
              {mood.emoji}
            </span>

            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color:
                  selected === mood.value
                    ? colors.pinkDeep
                    : colors.textMuted,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </SoftCard>
  );
}
