/**
 * Settings.jsx
 * Settings page — reads theme and profile from Supabase user_data.
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import SoftCard from "../components/common/SoftCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { colors, typography, radii, transitions } from "../ui/designTokens";

export default function Settings() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const { data, error:e } = await supabase.from("user_data").select("data").limit(1).single();
        if (e) throw e;
        if (cancelled) return;
        const blob = data?.data?.budgetsbloom;
        setRawData(typeof blob==="string"?JSON.parse(blob):blob??null);
      } catch(err) { if(!cancelled) setError(err.message||"Failed to load"); }
      finally      { if(!cancelled) setLoading(false); }
    }
    load(); return ()=>{cancelled=true;};
  }, []);

  const profile = rawData?.profile ?? {};
  const theme   = rawData?.theme   ?? "pink";

  const rows = [
    { label:"Name",         value: profile.name        || "—", emoji:"👤" },
    { label:"Partner Name", value: profile.partnerName || "—", emoji:"💕" },
    { label:"Theme",        value: theme,                       emoji:"🎨" },
    { label:"Debt Method",  value: rawData?.debtMethod || "snowball", emoji:"💳" },
  ];

  return (
    <div style={{ minHeight:"100vh",backgroundColor:colors.bg,fontFamily:typography.fontBody,
      color:colors.text,paddingBottom:"80px" }}>
      <div style={{ maxWidth:"520px",margin:"0 auto",padding:"0 16px" }}>

        <div className="fade-up" style={{ padding:"40px 0 24px" }}>
          <p style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"4px" }}>App</p>
          <h1 style={{ fontFamily:typography.fontDisplay,fontSize:"30px",fontWeight:700,color:colors.text,letterSpacing:"-0.03em",lineHeight:1.1 }}>Settings</h1>
        </div>

        {loading && <LoadingSpinner message="Loading settings…" />}
        {error   && <SoftCard variant="highlight" style={{ marginBottom:"16px",color:colors.pinkDeep,fontSize:"13px" }}>⚠ {error}</SoftCard>}

        {!loading && rawData && (
          <>
            <SoftCard variant="base" style={{ marginBottom:"16px" }} noAnimate>
              <h2 style={{ fontSize:"11px",fontWeight:700,color:colors.textMuted,letterSpacing:"0.12em",
                textTransform:"uppercase",marginBottom:"14px" }}>Profile</h2>
              <div style={{ display:"flex",flexDirection:"column",gap:"1px" }}>
                {rows.map(({label,value,emoji},i)=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:"12px",
                    padding:"12px 0",
                    borderBottom: i<rows.length-1?`1px solid ${colors.borderSoft}`:"none" }}>
                    <span style={{ fontSize:"18px",width:"28px",textAlign:"center" }}>{emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"10px",fontWeight:700,color:colors.textMuted,
                        letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"1px" }}>{label}</div>
                      <div style={{ fontSize:"14px",fontWeight:500,color:colors.text,textTransform:"capitalize" }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SoftCard>

            {/* App info */}
            <SoftCard variant="soft" style={{ textAlign:"center",padding:"20px" }} noAnimate>
              <div style={{ fontSize:"32px",marginBottom:"8px" }}>🌸</div>
              <div style={{ fontFamily:typography.fontDisplay,fontSize:"18px",fontWeight:700,
                color:colors.pinkDeep,marginBottom:"4px" }}>Budget Bloom</div>
              <div style={{ fontSize:"12px",color:colors.textMuted }}>
                Your cozy personal finance companion
              </div>
            </SoftCard>
          </>
        )}
      </div>
    </div>
  );
}
