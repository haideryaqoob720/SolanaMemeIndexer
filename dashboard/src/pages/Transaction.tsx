import { LoaderCircle, RefreshCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getTimeAgo } from "../utils/getTimeAgo";
import TokenAddress from "../components/TokenAddress";
import axios from "axios";
import { formatNumber } from "../utils/formatPrice";
// import './App.css'; // Custom styles for dark mode and green text

interface Transaction {
  created_at: string;
  dex: number;
  id: number;
  is_buy: Boolean;
  mint: string;
  signature: string;
  sol_amount: number;
  status: number;
  timestamp: number;
  token_amount: number;
  token_price_in_sol: number;
  user: string;
}
const TransactionTable: React.FC<any> = ({ transactionsData, solPrice, onHandleRefreshTransactions, isTransactionLoading }) => {

  
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = Math.ceil(transactionsData.length / rowsPerPage);
  
  const paginatedData = transactionsData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="lambo-table-container">
      <div className="lambo-table-header">
        <h2 className="lambo-title">Transactions</h2>
        <button
          className="lambo-refresh-button"
          onClick={onHandleRefreshTransactions}
          title="Refresh"
          disabled={isTransactionLoading}
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      
      <div className="lambo-table-scroll-container">
        <div className="lambo-table">
          <div className="lambo-table-head">
            <div className="lambo-row">
              <div className="lambo-cell lambo-header-cell lambo-date">DATE</div>
              <div className="lambo-cell lambo-header-cell lambo-type">TYPE</div>
              <div className="lambo-cell lambo-header-cell lambo-price">PRICE(USD)</div>
              <div className="lambo-cell lambo-header-cell lambo-total">TOTAL(USD)</div>
              <div className="lambo-cell lambo-header-cell lambo-price-sol">PRICE(SOL)</div>
              <div className="lambo-cell lambo-header-cell lambo-amount">AMOUNT</div>
              <div className="lambo-cell lambo-header-cell lambo-maker">MAKER</div>
            </div>
          </div>
          {
            isTransactionLoading ? <tr>
            <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "1rem",
                color: "var(--color-accent)"
              }}>
                <LoaderCircle size={30} className="spinner" />
                <span>Loading Transactions...</span>
              </div>
            </td>
          </tr>: <div className="lambo-table-body">
            {paginatedData.map((transaction: any, index: number) => (
              <div key={index} className={`lambo-row ${index % 2 === 0 ? 'lambo-row-even' : 'lambo-row-odd'}`}>
                <div className="lambo-cell lambo-date">{getTimeAgo(transaction.created_at)}</div>
                <div className={`lambo-cell lambo-type ${transaction?.is_buy ? 'lambo-buy' : 'lambo-sell'}`}>
                  {transaction.is_buy ? "BUY" : "SELL"}
                </div>
                <div className="lambo-cell lambo-price">${(transaction.sol_amount * solPrice).toFixed(2)}</div>
                <div className="lambo-cell lambo-total">
                  ${(transaction.token_amount * (transaction.sol_amount * solPrice)).toFixed(2)}
                </div>
                <div className="lambo-cell lambo-price-sol">{transaction.sol_amount.toFixed(2)}</div>
                <div className="lambo-cell lambo-amount">{Number(transaction.token_amount).toFixed(2)}</div>
                <div className="lambo-cell lambo-maker">
                  <a
                    className="lambo-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://solscan.io/account/${transaction.user}`}
                  >
                    <TokenAddress address={transaction.user} />
                  </a>
                </div>
              </div>
            ))}</div>
          }
          
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="lambo-pagination">
          <button 
            className="lambo-pagination-button lambo-prev-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="lambo-page-indicator">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="lambo-pagination-button lambo-next-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
      
      <style>{`
        .lambo-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        
        .lambo-page-indicator {
          font-weight: 600;
          color: #E8DB4A;
          text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.5);
          font-size: 0.9rem;
          letter-spacing: 0.5px;
        }
        
        .lambo-pagination-button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #fff;
          font-size: 0.9rem;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .lambo-pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .lambo-prev-button {
          background: linear-gradient(135deg, #004CA6 0%, #26854C 100%);
        }
        
        .lambo-next-button {
          background: linear-gradient(135deg, #26854C 0%, #E64100 100%);
        }
        
        .lambo-pagination-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
        }
        
        /* Custom Lambo Table Styles */
        .lambo-table-container {
          background-color: #131313;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          border-left: 3px solid #E8DB4A;
          border-right: 3px solid #26854C;
          margin-bottom: 20px;
          width: 100%;
        }
        
        .lambo-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(232, 219, 74, 0.2);
        }
        
        .lambo-title {
          color: #E8DB4A;
          font-weight: 700;
          font-size: 1.5rem;
          margin: 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
        }
        
        .lambo-refresh-button {
          background: linear-gradient(135deg, #E8DB4A 0%, #E64100 100%);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 8px 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(232, 219, 74, 0.2);
        }
        
        .lambo-refresh-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(232, 219, 74, 0.3);
        }
        
        .lambo-table-scroll-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #26854C #131313;
        }

        .lambo-table-scroll-container::-webkit-scrollbar {
          height: 8px;
        }

        .lambo-table-scroll-container::-webkit-scrollbar-track {
          background: #131313;
          border-radius: 4px;
        }

        .lambo-table-scroll-container::-webkit-scrollbar-thumb {
          background-color: #26854C;
          border-radius: 4px;
        }
        
        .lambo-table {
          width: 100%;
          min-width: 900px;
          color: #fff;
        }
        
        .lambo-table-head {
          background-color: #0F0F0F;
          border-radius: 8px 8px 0 0;
          overflow: hidden;
        }
        
        .lambo-header-cell {
          color: #E8DB4A !important;
          font-weight: 700 !important;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
          padding: 12px 6px !important;
        }
        
        @media (max-width: 768px) {
          .lambo-table-container {
            padding: 10px;
          }
          
          .lambo-header-cell {
            font-size: 0.65rem;
            padding: 8px 4px !important;
          }
          
          .lambo-cell {
            padding: 8px 4px;
            font-size: 12px;
          }
          
          .lambo-table-header {
            margin-bottom: 10px;
            padding-bottom: 10px;
          }
          
          .lambo-title {
            font-size: 1.2rem;
          }
          
          .lambo-refresh-button {
            padding: 6px 10px;
          }
          
          .lambo-pagination-button {
            padding: 8px 12px;
            font-size: 0.8rem;
          }
          
          .lambo-page-indicator {
            font-size: 0.8rem;
          }
          
          .lambo-table-scroll-container {
            margin-bottom: 10px;
            box-shadow: 0 0 8px rgba(38, 133, 76, 0.2);
            border-radius: 8px;
          }
          
          .lambo-table-scroll-container::-webkit-scrollbar {
            height: 6px;
          }
        }
        
        .lambo-table-body {
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }
        
        .lambo-row {
          display: flex;
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .lambo-row:hover {
          background: linear-gradient(90deg, rgba(38, 133, 76, 0.1), rgba(232, 219, 74, 0.05)) !important;
          transform: scale(1.005);
        }
        
        .lambo-row-even {
          background-color: #1E1E1E;
        }
        
        .lambo-row-odd {
          background-color: #131313;
        }
        
        .lambo-cell {
          flex: 1;
          padding: 10px 6px;
          text-align: left;
          font-weight: 500;
          position: relative;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }
        
        /* Column specific widths */
        .lambo-date {
          flex: 0 0 80px;
          min-width: 80px;
        }
        
        .lambo-type {
          flex: 0 0 60px;
          min-width: 60px;
          text-align: center;
        }
        
        .lambo-price, .lambo-price-sol, .lambo-amount {
          flex: 0 0 100px;
          min-width: 100px;
        }
        
        .lambo-total {
          flex: 0 0 120px;
          min-width: 120px;
        }
        
        .lambo-maker {
          flex: 0 0 220px;
          min-width: 220px;
        }
        
        .lambo-buy {
          color: #4CAF82;
          font-weight: 700;
          text-shadow: 0 0 1px rgba(76, 175, 130, 0.5);
        }
        
        .lambo-sell {
          color: #E64100;
          font-weight: 700;
          text-shadow: 0 0 1px rgba(230, 65, 0, 0.5);
        }
        
        .lambo-link {
          color: #3388FF;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .lambo-link:hover {
          color: #4CAF82;
        }
      `}</style>
    </div>
  );
};

export default TransactionTable;
