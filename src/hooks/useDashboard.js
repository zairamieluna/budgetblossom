import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import FinanceEngine from "../finance/FinanceEngine";

import {
    PERIODS,
    getCurrentPeriodIndex,
} from "../finance/calendar/periodService";

export default function useDashboard() {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [rawData, setRawData] = useState(null);

    const [periodIndex, setPeriodIndex] =
        useState(getCurrentPeriodIndex());

    const [showQuickActions, setShowQuickActions] =
        useState(false);

    const period = PERIODS[periodIndex];

    async function loadData() {

        setLoading(true);
        setError(null);

        try {

            const { data, error } = await supabase
                .from("user_data")
                .select("data")
                .limit(1)
                .single();

            if (error) throw error;

            const blob = data?.data?.budgetsbloom;

            const parsed =
                typeof blob === "string"
                    ? JSON.parse(blob)
                    : blob ?? {};

            setRawData(parsed);

        } catch (err) {

            console.error(err);

            setError(
                err.message || "Failed to load dashboard."
            );

        } finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        loadData();

    }, []);

    async function saveData(updatedData) {

        setSaving(true);

        try {

            const { data: row } = await supabase
                .from("user_data")
                .select("id")
                .limit(1)
                .single();

            await supabase
                .from("user_data")
                .update({

                    data: {

                        budgetsbloom:
                            JSON.stringify(updatedData),

                    },

                })
                .eq("id", row.id);

            setRawData(updatedData);

        } catch (err) {

            console.error(err);

        } finally {

            setSaving(false);

        }

    }

    const finance = useMemo(() => {

        if (!rawData) return null;

        return FinanceEngine.calculate(
            rawData,
            period
        );

    }, [rawData, period]);

    const name =
        rawData?.profile?.name || "";

    function previousPeriod() {

        setPeriodIndex(index =>
            Math.max(0, index - 1)
        );

    }

    function nextPeriod() {

        setPeriodIndex(index =>
            Math.min(
                PERIODS.length - 1,
                index + 1
            )
        );

    }

    function handleQuickAction(action) {

        switch (action) {

            case "scan":
                alert("📷 Smart Scan coming soon.");
                break;

            case "expense":
                alert("💸 Add Expense");
                break;

            case "income":
                alert("💰 Add Income");
                break;

            case "card":
                alert("💳 Update Card");
                break;

            case "saving":
                alert("🏦 Savings");
                break;

            case "statement":
                alert("📄 Statement Import");
                break;

            default:
                break;

        }

    }

    return {

        // Loading
        loading,
        saving,
        error,

        // User data
        rawData,
        saveData,

        // Finance
        finance,

        // Profile
        name,

        // Period
        period,
        periodIndex,
        previousPeriod,
        nextPeriod,

        // Quick Actions
        showQuickActions,
        setShowQuickActions,
        handleQuickAction,

        // Refresh
        reload: loadData,

    };

}
