import React, { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";

const TokenAddress = ({ address = "" }) => {
  const [copied, setCopied] = useState(false);
  
  // Add check for empty address
  if (!address) {
    return null;
  }

  const formatAddress = (addr: string) => {
    if (addr.length < 8) return addr; // Handle addresses shorter than 8 chars
    const first = addr.slice(0, 4);
    const last = addr.slice(-4);
    return `${first}...${last}`;
  };

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className="address-text"
      style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        padding: "0.2rem 0.4rem",
        margin: "0 0.25rem",
        backgroundColor: "rgba(232, 219, 74, 0.08)",
        borderRadius: "4px",
        transition: "all 0.2s ease",
        border: "1px solid rgba(232, 219, 74, 0.15)",
      }}
    >
      <span style={{ fontSize: "0.8rem" }}>{formatAddress(address)}</span>
      <button
        onClick={copyToClipboard}
        style={{ 
          background: "none", 
          border: "none", 
          padding: "0.1rem", 
          marginLeft: "0.25rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center"
        }}
        aria-label="Copy address"
        title="Copy address"
      >
        {copied ? (
          <CheckCircle size={14} color="var(--color-success)" />
        ) : (
          <Copy size={14} color="var(--color-accent)" opacity={0.8} />
        )}
      </button>
    </div>
  );
};

export default TokenAddress;
