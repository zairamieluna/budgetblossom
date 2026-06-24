/**
 * Forecast.jsx
 * Budget Blossom Forecast V1
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/common/LoadingSpinner";
import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

import { generateForecast } from "../finance/forecast/forecastEngine";

const fmt = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

export default function Forecast() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("data")
          .limit(1)
          .single();

        if (error) throw error;

        if (cancelled) return;

        const blob = data?.data?.budgetsbloom;

        setRawData(
          typeof blob === "string"
            ? JSON.parse(blob)
            : blob ?? null
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const forecast = useMemo(() => {
    return generateForecast(rawData);
  }, [rawData]);

  if (loading) {
    return <LoadingSpinner message="Loading forecast..." />;
  }

  if (error) {
    return (
      <SoftCard variant="highlight">
        <strong>Error:</strong> {error}
      </SoftCard>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: "24px",
        paddingBottom: "90px",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontDisplay,
            fontSize: "30px",
            marginBottom: "20px",
          }}
        >
          📈 Forecast
        </h1>

        <SoftCard style={{ marginBottom: "16px" }}>
          <h3>Total Income</h3>
          <h2>{fmt(forecast.income)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: "16px" }}>
          <h3>Total Expenses</h3>
          <h2>{fmt(forecast.expenses)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: "16px" }}>
          <h3>Total Saved</h3>
          <h2>{fmt(forecast.savings)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: "16px" }}>
          <h3>Total Card Balance</h3>
          <h2>{fmt(forecast.cards)}</h2>
        </SoftCard>

        <SoftCard variant="highlight">
          <h3>Remaining Balance</h3>
          <h1
            style={{
              color:
                forecast.remaining >= 0
                  ? colors.pinkDeep
                  : colors.critical,
            }}
          >
            {fmt(forecast.remaining)}
          </h1>

          <p>{forecast.message}</p>
        </SoftCard>
      </div>
    </div>
  );
}
