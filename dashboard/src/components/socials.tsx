import React from "react";
import { Send, Globe, Twitter } from "lucide-react";

const SocialLinks = ({ links = [] }: any) => {
  const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
      return <Twitter size={16} />;
    }
    if (lowerUrl.includes("t.me") || lowerUrl.includes("telegram")) {
      return <Send size={16} />;
    }
    return <Globe size={16} />;
  };

  const handleClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="socials-container" style={{
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: "8px"
    }}>
      {links.map((link: string, index: number) => (
        <button
          key={index}
          onClick={() => handleClick(link)}
          className="social-icon"
          aria-label={`Visit ${link}`}
          title={link}
          style={{
            background: "rgba(232, 219, 74, 0.1)",
            border: "1px solid rgba(232, 219, 74, 0.2)",
            padding: "6px",
            borderRadius: "50%",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent)"
          }}
        >
          {getSocialIcon(link)}
        </button>
      ))}
    </div>
  );
};

export const SocialLinksMobile = ({ links = [] }: any) => {
  const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
      return <Twitter size={15} />;
    }
    if (lowerUrl.includes("t.me") || lowerUrl.includes("telegram")) {
      return <Send size={15} />;
    }
    return <Globe size={15} />;
  };

  const handleClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ padding: "0.25rem" }} className="bg-dark">
      {links.map((link: string, index: number) => (
        // <link href={link}>
        <button
          key={index}
          onClick={() => handleClick(link)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label={`Visit ${link}`}
        >
          {getSocialIcon(link)}
        </button>
        // </link>
      ))}
    </div>
  );
};

export default SocialLinks;
