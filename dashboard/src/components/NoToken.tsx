import React from "react";

type NoTokensFoundProps = {
  onResetFilters: () => void;
};

const NoTokensFound: React.FC<NoTokensFoundProps> = ({ onResetFilters }) => {
  return (
    <div className="no-tokens-container">
      <h2 className="no-tokens-title">
        No tokens found matching your criteria
      </h2>
      <p className="no-tokens-message">
        Try adjusting or removing some filters or reset all to view all tokens.
      </p>
      <button className="reset-button" onClick={onResetFilters}>
        Reset Filters
      </button>

      <style>{`
        .no-tokens-container {
          position: absolute;
          left: 50%;
          transform: translate(-50%);
          text-align: center;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .no-tokens-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .no-tokens-message {
          font-size: 1rem;
          color: #555;
          margin-bottom: 1.5rem;
        }

        .reset-button {
          padding: 0.75rem 1.5rem;
          background-color: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .reset-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default NoTokensFound;
