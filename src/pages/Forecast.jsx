/**
 * Forecast.jsx
 * Budget Blossom Forecast V3
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
          maxWidth: "540px",
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

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Total Income</h3>
          <h2>{fmt(forecast.income)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Total Expenses</h3>
          <h2>{fmt(forecast.expenses)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Total Savings</h3>
          <h2>{fmt(forecast.savings)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Total Card Balance</h3>
          <h2>{fmt(forecast.cards)}</h2>
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Projected Balance</h3>

          <h1
            style={{
              color:
                forecast.projectedBalance >= 0
                  ? colors.pinkDeep
                  : colors.critical,
            }}
          >
            {fmt(forecast.projectedBalance)}
          </h1>

          <p>{forecast.message}</p>
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Upcoming Bills</h3>

          {forecast.upcomingBills.length === 0 ? (
            <p>No upcoming bills.</p>
          ) : (
            forecast.upcomingBills.map((bill, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <strong>{bill.name}</strong>
                <br />
                {bill.due}
                <br />
                {fmt(bill.amount)}
              </div>
            ))
          )}
        </SoftCard>

        <SoftCard style={{ marginBottom: 16 }}>
          <h3>Upcoming Income</h3>

          {forecast.upcomingIncome.length === 0 ? (
            <p>No upcoming income.</p>
          ) : (
            forecast.upcomingIncome.map((pay, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <strong>{pay.source}</strong>
                <br />
                {pay.date}
                <br />
                {fmt(pay.amount)}
              </div>
            ))
          )}
        </SoftCard>

        <SoftCard>
          <h3>Insights</h3>

          <ul>
            {forecast.insights.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </SoftCard>
      </div>
    </div>
  );
}
