import React, { useEffect, useState } from "react";
import TransactionTable from "./Transaction";
import {
  BarChart,
  BellIcon,
  Check,
  CircleX,
  Clock,
  Cross,
  HeartIcon,
  InfoIcon,
  LineChart,
  LoaderCircle,
  MoveLeft,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { getTimeAgo } from "../utils/getTimeAgo";
import TokenAddress from "../components/TokenAddress";
import TokenImage from "../components/TokenImage";
import RiskAnalysis from "../components/DetailComponent";
import { getTopHoldersData } from "../utils/utilcode";

import "../styles/theme.css";
import { calculatePrice, calculateTDV } from "../utils/price";
import { formatNumber } from "../utils/formatPrice";
import { formatFloatWithSubtext } from "../utils/subtext";
import { calculateLiquidity } from "../utils/liquidity";

// Helper function to format price values with appropriate suffixes
const formatPriceValue = (value: number): string => {
  if (!value || isNaN(value)) return "$0.00";

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
};

const MobileGridView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [metaData, setMetaData] = useState<any>();
  const [transactions, setTransactions] = useState([]);
  const [solPrice, setSolPrice] = useState<number>(120); // Setting a default value of $120 for SOL
  const [topHolders, setTopHolders] = useState([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "token">(
    "transactions"
  );
  const [rugCheckDetails, setRugCheckDetails] = useState();
  const [activeInteraction, setActiveInteraction] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [transactionsLoader, setTransactionsLoader] = useState(false);

  const firstItems = [
    {
      label: "LIQUIDITY",
      value: `$${formatNumber(
        calculateLiquidity(
          metaData?.reserve_token,
          metaData?.reserve_sol,
          solPrice
        )
      )}`,
    },
    {
      label: "TVL",
      value: `$${formatNumber(
        calculateTDV(metaData?.reserve_sol, metaData?.reserve_token, solPrice)
      )}`,
    },
    {
      label: "M.CAP",
      value: `$${formatNumber(metaData?.market_cap * solPrice)}`,
    },
    {
      label: "SUPPLY",
      value: "1B",
    },
  ];

  const fetchTransactions = async (id: string) => {
    const API_URL = `api/tokens/${id}`;
    const token = getAuthToken();
    try {
      setPageLoader(true);
      setTransactionsLoader(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/${API_URL}`,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        }
      );
      const metaDataWithTransactions = response.data.tokenTransactions;

      if (metaDataWithTransactions) {
        const { transactions, ...rest } = metaDataWithTransactions;
        console.log(transactions);
        const totalTokenAmount = transactions.reduce(
          (sum: any, tx: any) => sum + tx.token_amount,
          0
        );
        const totalBuyTokenAmount = transactions
          .filter((tx: any) => tx.is_buy)
          .reduce((sum: any, tx: any) => sum + tx.token_amount, 0);
        setMetaData({ totalTokenAmount, totalBuyTokenAmount, ...rest });
        setTransactions(transactions);
      }
    } catch (err) {
      console.log("Error occured while requesting...");
      console.log(err);
    } finally {
      setPageLoader(false);
      setTransactionsLoader(false);
    }
  };

  const getSolPrice = async () => {
    try {
      const res = await axios.get(
        "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
      );
      if (res.data && res.data.price) {
        // console.log(res.data);
        setSolPrice(Number(res.data.price));
        // console.log("SOL Price updated:", res.data.price);
      }
    } catch (error) {
      console.error("Error fetching SOL price:", error);
      // Keep using the default price if fetch fails
    }
  };

  useEffect(() => {
    getSolPrice();
    const intervalID = setInterval(getSolPrice, 6000);
    fetchTransactions(id);
    getTopHoldersData(id, setTopHolders);

    // getSolPrice(); // Fetch SOL price on component mount
    return () => {
      clearInterval(intervalID);
    };
  }, [id]);

  const getUserDetailsFromURI = async (uri: string, mint: string) => {
    try {
      const response = await axios.get(uri);

      const { name, symbol, website } = response.data;

      const apiResponse = await axios.post(
        `${process.env.REACT_APP_API_URL}/rugcheckdetails`,
        {
          mint,
          username: name,
          usersymbol: symbol,
          websiteurl: website,
        }
      );

      const data = apiResponse.data?.data;

      setRugCheckDetails(data);
    } catch (err: any) {
      console.log(err.message);
    }
  };
  const getLastInteraction = async (mint: string) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/activeInteraction`,
        { params: { mint } }
      );
      console.log("Last interaction response...");
      const isLastInteracted = response.data.data;
      console.log(isLastInteracted);
      setActiveInteraction(isLastInteracted);
    } catch (error: any) {
      console.log(error.messsage);
    }
  };

  useEffect(() => {
    if (metaData) {
      // console.log("User's data to be sent to API...");
      getUserDetailsFromURI(metaData?.uri, metaData?.mint);
      getLastInteraction(metaData?.mint);
    }
  }, [metaData]);

  useEffect(() => {
    getUserDetailsFromURI(metaData?.uri, metaData?.mint);
    console.log()
  }, []);

  const onHandleRefresh = async (mint: string) => {
    try {
      // console.log("Getting transactions for the user...", mint);
      setTransactionsLoader(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/transactions/${mint}`
      );
      const transactions = response.data.transactions;
      console.log(transactions);
      if (transactions) setTransactions(transactions);
    } catch (err) {
      console.log("Error while fetching the latest transactions...");
      console.log(err);
    } finally {
      setTransactionsLoader(false);
    }
  };

  if (pageLoader) {
    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "var(--color-accent)",
        }}
      >
        <LoaderCircle size={30} className="spinner" />
        <span>Loading Transactions...</span>
      </div>
    );
  }

  return (
    <div
      className="fade-in"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-text)",
      }}
    >
      {/* Top Header */}
      <div className="dashboard-header">
        <div className="flex-container">
          <div className="token-info">
            <div className="token-identity">
              <TokenImage
                uri={metaData?.uri}
                name={metaData?.name}
                isFromRaydium={undefined}
              />
              <div className="token-details">
                <h2>{metaData?.name}</h2>
                <div className="token-metadata">
                  <div className="timestamp">
                    <Clock size={15} /> {getTimeAgo(metaData?.created_at)}
                  </div>
                  <div className="badge">Token</div>
                  <div className="badge">Pair</div>
                </div>
              </div>
            </div>
          </div>

          <div className="token-price-info">
            <div className="price-container">
              <span className="price-label">PRICE IN SOL</span>
              <h3 className="price-value">
                {formatFloatWithSubtext(
                  calculatePrice(
                    metaData?.reserve_sol || 0,
                    metaData?.reserve_token || 1
                  )
                    .toFixed(10)
                    .toString()
                )}
              </h3>
            </div>
            <div className="price-divider"></div>
            <div className="price-container">
              <span className="price-label">PRICE IN USD</span>
              <h3 className="price-value">
                $
                {formatFloatWithSubtext(
                  Number(
                    calculatePrice(
                      metaData?.reserve_sol || 0,
                      metaData?.reserve_token || 1
                    ) * solPrice
                  )
                    .toFixed(10)
                    .toString()
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed component */}
      <div className="tab-navigation">
        <div
          className={`tab-item ${
            activeTab === "transactions" ? "tab-active" : ""
          }`}
          onClick={() => setActiveTab("transactions")}
        >
          <LineChart size={16} /> Details
        </div>
        <div
          className={`tab-item ${activeTab === "token" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("token")}
        >
          <BarChart size={16} /> Token Analysis
        </div>
      </div>

      {/* Main Content Layout */}
      {activeTab === "transactions" ? (
        <div className="content-grid">
          {/* Left Side: Table */}
          <div className="main-content">
            <TransactionTable
              transactionsData={transactions || []}
              solPrice={solPrice}
              onHandleRefreshTransactions={() =>
                onHandleRefresh(metaData?.mint)
              }
              isTransactionLoading={transactionsLoader}
            />
          </div>

          {/* Right Side: Three Vertical Items */}
          <div className="side-content">
            <div className="stats-grid">
              {firstItems.map((item, index) => (
                <div key={index} className="stat-box card">
                  <span className="stat-title">{item.label}</span>
                  <span className="stat-number">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="dashboard-stats-container card">
              <DashboardStats
                statsData={{
                  buy_count: metaData?.buy_count,
                  sell_count: metaData?.sell_count,
                  transactionLength: transactions.length,
                  sol_volume: metaData?.sol_volume,
                  total_holders: metaData?.total_holders,
                  totalAmount: metaData?.totalTokenAmount,
                  totalBuyAmount: metaData?.totalBuyTokenAmount,
                }}
              />
            </div>

            <div className="security-info card">
              <IconTextRow data={metaData} />
            </div>
          </div>
        </div>
      ) : (
        <RiskAnalysis
          data={metaData}
          topHolders={topHolders}
          rugCheckDetails={rugCheckDetails}
          activeInteraction={activeInteraction}
        />
      )}

      {/* Custom CSS */}
      <style>
        {`
          .flex-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
          }
          
          .token-info {
            display: flex;
            align-items: center;
          }
          
          .token-identity {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .token-details {
            display: flex;
            flex-direction: column;
          }
          
          .token-metadata {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 4px;
          }
          
          .timestamp {
            display: flex;
            align-items: center;
            gap: 4px;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
          }
          
          .badge {
            padding: 4px 8px;
            background-color: var(--color-primary);
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          
          .token-price-info {
            display: flex;
            gap: 20px;
            align-items: center;
          }
          
          .price-container {
            display: flex;
            flex-direction: column;
          }
          
          .price-label {
            color: var(--color-text-secondary);
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 500;
          }
          
          .price-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--color-accent);
            margin: 0;
          }
          
          .price-divider {
            width: 1px;
            height: 40px;
            background-color: var(--color-text-secondary);
            opacity: 0.3;
          }
          
          .tab-navigation {
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin: 24px 0;
          }
          
          .tab-item {
            padding: 12px 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            transition: all 0.2s ease;
            border-bottom: 2px solid transparent;
          }
          
          .tab-item:hover {
            color: var(--color-primary);
          }
          
          .tab-active {
            border-bottom: 2px solid var(--color-accent);
            color: var(--color-accent);
            font-weight: 600;
          }
          
          .content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }
          
          .main-content {
            padding: 10px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }
          
          .side-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-gap: 12px;
            margin-bottom: 20px;
            padding: 0;
            max-width: 100%;
            overflow: hidden;
          }
          
          .stat-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 15px 10px;
            border-radius: var(--radius-lg);
            background: var(--gradient-dark);
            box-shadow: var(--shadow-md);
            text-align: center;
            transition: all 0.3s ease;
            border-bottom: 3px solid var(--color-accent);
            position: relative;
            overflow: hidden;
            width: 100%;
          }
          
          .stat-box:nth-child(1) {
            border-bottom-color: var(--color-primary);
          }
          
          .stat-box:nth-child(2) {
            border-bottom-color: var(--color-secondary);
          }
          
          .stat-box:nth-child(3) {
            border-bottom-color: var(--color-accent);
          }
          
          .stat-box:nth-child(4) {
            border-bottom-color: var(--color-highlight);
          }
          
          .stat-box:after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
            z-index: 0;
          }
          
          .stat-box:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
          }
          
          .stat-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--color-text-secondary);
            margin-bottom: 8px;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            width: 100%;
          }
          
          .stat-number {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-text);
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            width: 100%;
          }
          
          .dashboard-stats-container {
            padding: 15px;
            overflow: hidden;
            max-width: 100%;
          }
          
          .security-info {
            padding: 20px;
          }
          
          .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            margin-top: 20px;
          }
          
          .page-indicator {
            font-weight: 500;
            color: var(--color-text-secondary);
          }
          
          /* Responsive Design */
          @media (max-width: 992px) {
            .content-grid {
              grid-template-columns: 1fr;
            }
            
            .side-content {
              order: -1;
            }
          }
          
          @media (max-width: 768px) {
            .token-price-info {
              margin-top: 16px;
              width: 100%;
              justify-content: space-around;
            }
            
            .flex-container {
              flex-direction: column;
              align-items: flex-start;
            }
            
            .side-content {
              padding: 0 6px;
              width: 100%;
              max-width: 100%;
              overflow: hidden;
            }
          
            .stats-grid {
              grid-template-columns: 1fr 1fr;
              grid-gap: 8px;
              margin-bottom: 15px;
            }
            
            .stat-box {
              padding: 10px 5px;
            }
            
            .stat-title {
              font-size: 9px;
              margin-bottom: 4px;
            }
            
            .stat-number {
              font-size: 14px;
            }
            
            .content-grid {
              padding: 0 10px;
            }
            
            .stat-box {
              padding: 12px 8px;
            }
            
            .stat-title {
              font-size: 10px;
            }
            
            .stat-number {
              font-size: 16px;
            }
            
            .dashboard-header {
              padding: 15px;
              margin-bottom: 15px;
            }
            
            .token-identity {
              gap: 8px;
            }
            
            .token-details h2 {
              font-size: 18px;
            }
            
            .token-metadata {
              gap: 6px;
              font-size: 12px;
            }
            
            .price-value {
              font-size: 16px;
            }
            
            .price-label {
              font-size: 10px;
            }
          }
          
          @media (max-width: 480px) {
            .stats-grid {
              grid-template-columns: 1fr 1fr;
              margin: 0 0 10px 0;
              width: 100%;
            }
            
            .dashboard-stats-container, 
            .security-info {
              padding: 10px;
            }
            
            .stats-container {
              max-width: 100%;
              overflow-x: hidden;
            }
            
            .stats-overview {
              flex-direction: column;
            }
            
            .stats-column {
              width: 100%;
              padding: 5px;
            }
            
            .stats-left {
              margin-bottom: 10px;
            }
            
            .stat-group {
              margin-bottom: 8px;
            }
            
            .ratio-header {
              font-size: 11px;
            }
            
            .buys, .sells {
              font-size: 11px;
            }
          }
        `}
      </style>
    </div>
  );
};

const DashboardStats: React.FC<any> = ({ statsData }) => {
  const buycount = Number(statsData?.buy_count);
  const sellCount = Number(statsData?.sell_count);
  const transactionNumber = statsData.transactionLength;
  const makersHolders = statsData?.total_holders;
  const totalBuyAmount = statsData?.totalBuyAmount;
  const totalSellAmount = statsData?.totalAmount - totalBuyAmount;

  // console.log(data?.reserve_sol);
  // console.log(data?.reserve_token);

  return (
    <div className="stats-container">
      <div className="stats-overview">
        <div className="stats-column stats-left">
          <div className="stat-group">
            <span className="stat-name">TRANSACTIONS</span>
            <span className="stat-count">
              {Number(transactionNumber || 0).toFixed(0)}
            </span>
          </div>
          <div className="stat-group">
            <span className="stat-name">VOLUME</span>
            <span className="stat-count">
              {formatNumber(Number(statsData?.totalAmount || 0))}
            </span>
          </div>
          <div className="stat-group">
            <span className="stat-name">MAKERS</span>
            <span className="stat-count">
              {Number(makersHolders || 0).toFixed(0)}
            </span>
          </div>
        </div>

        <div className="stats-column stats-right">
          <div className="ratio-container">
            <div className="ratio-header">
              <span className="ratio-label buys">
                BUYS ({Number(buycount || 0).toFixed(0)})
              </span>
              <span className="ratio-label sells">
                SELLS ({Number(sellCount || 0).toFixed(0)})
              </span>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{
                  width: `${(buycount / (buycount + sellCount || 1)) * 100}%`,
                  background:
                    "linear-gradient(90deg, #4CAF82 0%, #26854C 100%)",
                }}
              ></div>
              <div
                className="progress-bar"
                style={{
                  width: `${(sellCount / (buycount + sellCount || 1)) * 100}%`,
                  background:
                    "linear-gradient(90deg, #E64100 0%, #C91F3D 100%)",
                }}
              ></div>
            </div>
          </div>

          <div className="ratio-container">
            <div className="ratio-header">
              <span className="ratio-label buys">
                BUY VOL {formatNumber(Number(totalBuyAmount || 0))}
              </span>
              <span className="ratio-label sells">
                SELL VOL {formatNumber(Number(totalSellAmount || 0))}
              </span>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{
                  width: `${
                    (totalBuyAmount / (totalSellAmount + totalBuyAmount || 1)) *
                    100
                  }%`,
                  background:
                    "linear-gradient(90deg, #4CAF82 0%, #26854C 100%)",
                }}
              ></div>
              <div
                className="progress-bar"
                style={{
                  width: `${
                    (totalSellAmount /
                      (totalSellAmount + totalBuyAmount || 1)) *
                    100
                  }%`,
                  background:
                    "linear-gradient(90deg, #E64100 0%, #C91F3D 100%)",
                }}
              ></div>
            </div>
          </div>

          <div className="ratio-container">
            <div className="ratio-header">
              <span className="ratio-label buys">BUYERS</span>
              <span className="ratio-label sells">SELLERS</span>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{
                  width: "53%",
                  background:
                    "linear-gradient(90deg, #4CAF82 0%, #26854C 100%)",
                }}
              ></div>
              <div
                className="progress-bar"
                style={{
                  width: "47%",
                  background:
                    "linear-gradient(90deg, #E64100 0%, #C91F3D 100%)",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .stats-container {
          width: 100%;
          overflow: hidden;
        }
        
        .stats-overview {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }
        
        .stats-column {
          padding: 10px;
        }
        
        .stats-left {
          flex: 0 0 130px;
        }
        
        .stats-right {
          flex: 1;
          min-width: 0;
        }
        
        .stat-group {
          margin-bottom: 15px;
        }
        
        .stat-name {
          display: block;
          color: var(--color-text-secondary);
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .stat-count {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-accent);
        }
        
        .ratio-container {
          margin-bottom: 15px;
        }
        
        .progress {
          height: 10px;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .progress-bar {
          height: 100%;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
          transition: width 0.4s ease-in-out;
        }
        
        .ratio-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 600;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        
        .buys {
          color: #4CAF82;
          font-weight: 700;
          text-shadow: 0 0 1px rgba(76, 175, 130, 0.5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .sells {
          color: #E64100;
          font-weight: 700;
          text-shadow: 0 0 1px rgba(230, 65, 0, 0.5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        @media (max-width: 768px) {
          .stats-overview {
            flex-direction: column;
          }
          
          .stats-column:first-child {
            flex: auto;
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
};

const IconTextRow: React.FC<any> = ({ data }) => {
  if (!data) return <></>;
  return (
    <div className="security-container">
      <h3 className="security-title">Data & Security</h3>

      <div className="security-item">
        <div className="security-item-left">
          <InfoIcon className="security-icon" />
          <span className="security-label">Mint Authority</span>
        </div>
        <div className="security-item-right">
          <span className="security-value">
            {data.mintable ? "Enabled " : "Disabled "}
            {data.mintable ? (
              <span className="security-status negative">
                <X size={12} />
              </span>
            ) : (
              <span className="security-status positive">
                <Check size={12} />
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="security-item">
        <div className="security-item-left">
          <InfoIcon className="security-icon" />
          <span className="security-label">Freeze Authority</span>
        </div>
        <div className="security-item-right">
          <span className="security-value">
            {data.freezeable ? "Enabled " : "Disabled "}
            {data.freezeable ? (
              <span className="security-status negative">
                <X size={12} />
              </span>
            ) : (
              <span className="security-status positive">
                <Check size={12} />
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="security-item">
        <div className="security-item-left">
          <InfoIcon className="security-icon" />
          <span className="security-label">Deployer</span>
        </div>
        <div className="security-item-right">
          <span className="security-value">
            <TokenAddress address={data?.creator || "53jfi3284lkdjfJHKJHKJ"} />
          </span>
        </div>
      </div>

      <div className="security-item">
        <div className="security-item-left">
          <InfoIcon className="security-icon" />
          <span className="security-label">Mint Address</span>
        </div>
        <div className="security-item-right">
          <span className="security-value">
            <TokenAddress address={data?.mint || ""} />
          </span>
        </div>
      </div>

      <style>{`
        .security-container {
          width: 100%;
        }
        
        .security-title {
          margin-bottom: 16px;
          color: var(--color-accent);
          font-size: 18px;
        }
        
        .security-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .security-item:last-child {
          border-bottom: none;
        }
        
        .security-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .security-icon {
          color: var(--color-primary);
        }
        
        .security-label {
          font-weight: 600;
          color: var(--color-text);
        }
        
        .security-item-right {
          display: flex;
          align-items: center;
        }
        
        .security-value {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text);
          font-weight: 500;
        }
        
        .security-status {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }
        
        .positive {
          background-color: var(--color-success);
          color: white;
        }
        
        .negative {
          background-color: var(--color-error);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default MobileGridView;
