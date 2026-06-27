// src/services/dashboard/DashboardService.js

import { supabase } from "../../lib/supabaseClient";

const TABLE = "user_data";

const COLUMN = "data";

const KEY = "budgetsbloom";

async function getRow() {
    const { data, error } = await supabase
        .from(TABLE)
        .select("id,data")
        .limit(1)
        .single();

    if (error) throw error;

    return data;
}

async function loadDashboard() {
    const row = await getRow();

    const blob = row?.[COLUMN]?.[KEY];

    return typeof blob === "string"
        ? JSON.parse(blob)
        : blob ?? {};
}

async function saveDashboard(updatedData) {
    const row = await getRow();

    const { error } = await supabase
        .from(TABLE)
        .update({
            [COLUMN]: {
                [KEY]: JSON.stringify(updatedData),
            },
        })
        .eq("id", row.id);

    if (error) throw error;

    return updatedData;
}

const DashboardService = {
    loadDashboard,
    saveDashboard,
};

export default DashboardService;
