import { Check, X, ShieldCheck, Shield } from "lucide-react";
import "../styles/filterPopup.css";

const DisplayAudits = ({ mad, fad, lp, top10 }: any) => {
  return (
    <div 
      className="audits-container"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        justifyContent: "flex-start"
      }}
    >
      <div 
        className="audit-badge" 
        title="Mint Authority Disabled" 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "600",
          backgroundColor: !mad ? "rgba(38, 133, 76, 0.15)" : "rgba(201, 31, 61, 0.15)",
          color: !mad ? "var(--color-success)" : "var(--color-error)",
          border: `1px solid ${!mad ? "rgba(38, 133, 76, 0.3)" : "rgba(201, 31, 61, 0.3)"}`,
          transition: "all 0.2s ease"
        }}
      >
        {!mad ? (
          <ShieldCheck size={14} strokeWidth={2.5} />
        ) : (
          <Shield size={14} strokeWidth={2.5} />
        )}
        <span>MAD</span>
      </div>
      
      <div 
        className="audit-badge" 
        title="Freeze Authority Disabled"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "600",
          backgroundColor: !fad ? "rgba(38, 133, 76, 0.15)" : "rgba(201, 31, 61, 0.15)",
          color: !fad ? "var(--color-success)" : "var(--color-error)",
          border: `1px solid ${!fad ? "rgba(38, 133, 76, 0.3)" : "rgba(201, 31, 61, 0.3)"}`,
          transition: "all 0.2s ease"
        }}
      >
        {!fad ? (
          <ShieldCheck size={14} strokeWidth={2.5} />
        ) : (
          <Shield size={14} strokeWidth={2.5} />
        )}
        <span>FAD</span>
      </div>
      
      <div 
        className="audit-badge" 
        title="LP Burned"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "600",
          backgroundColor: lp ? "rgba(38, 133, 76, 0.15)" : "rgba(201, 31, 61, 0.15)",
          color: lp ? "var(--color-success)" : "var(--color-error)",
          border: `1px solid ${lp ? "rgba(38, 133, 76, 0.3)" : "rgba(201, 31, 61, 0.3)"}`,
          transition: "all 0.2s ease"
        }}
      >
        {lp ? (
          <ShieldCheck size={14} strokeWidth={2.5} />
        ) : (
          <Shield size={14} strokeWidth={2.5} />
        )}
        <span>LP</span>
      </div>
      
      <div 
        className="audit-badge" 
        title={`Top 10 holders: ${top10.toFixed(2)}% of total supply`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: "600",
          backgroundColor: top10 < 15 ? "rgba(38, 133, 76, 0.15)" : "rgba(201, 31, 61, 0.15)",
          color: top10 < 15 ? "var(--color-success)" : "var(--color-error)",
          border: `1px solid ${top10 < 15 ? "rgba(38, 133, 76, 0.3)" : "rgba(201, 31, 61, 0.3)"}`,
          transition: "all 0.2s ease"
        }}
      >
        {top10 < 15 ? (
          <ShieldCheck size={14} strokeWidth={2.5} />
        ) : (
          <Shield size={14} strokeWidth={2.5} />
        )}
        <span>T10 <span style={{margin: "0 0.2rem", opacity: 0.7}}>|</span> <strong>{top10.toFixed(2)}%</strong></span>
      </div>
    </div>
  );
};

export default DisplayAudits;
