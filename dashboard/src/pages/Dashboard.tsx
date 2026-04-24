import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import useDebounce from "../hooks/useDebounce";
import FilterPopup from "../components/FilterPopup";
import TokenGrid, { Token } from "../components/TokenGrid";
import TokenGridMobile from "../components/TokenGridMobile";
import { LoaderCircle, SlidersHorizontal } from "lucide-react";
import { useHistory } from "react-router-dom";
import NoTokensFound from "../components/NoToken";
import { sortTokensByLiquidity } from "../utils/liquidity";
import { useAuth } from "../contexts/AuthContext";

// Interfaces
// interface Token {
//   id: number;
//   name: string | null;
//   symbol: string | null;
//   totalSupply: number | null;
//   marketCap: number | null;
//   creator: string | null;
//   totalHolders: number | null;
//   mint: string;
// }

interface Pagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface Filters {
  marketCapFrom: "";
  marketCapTo: "";
  transactionsFrom: "";
  transactionsTo: "";
  buysFrom: "";
  buysTo: "";
  sellsFrom: "";
  sellsTo: "";
  volumeFrom: "";
  volumeTo: "";
  txFrom: "";
  txTo: "";
  holdingFrom: "";
  holdingTo: "";
  createdFrom: "";
  createdTo: "";
  liquidityFrom: "";
  liquidityTo: "";
  socials: 0;
  pumpFun: 0;
  raydium: 0;
  devSold: 0;
  pageSize: number;
}

interface checkBoxes {
  pumpFun: boolean;
  raydium: boolean;
  devSold: boolean;
  socials: boolean;
  audit: boolean;
}

// Styles
const styles = {
  container: {
    padding: "40px",
    backgroundColor: "#1a1a1a",
    minHeight: "100vh",
  },
  filterSection: {
    backgroundColor: "#252525",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  filterTitle: {
    color: "#DDB06F",
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "1.2em",
    fontWeight: "normal" as const,
  },
  filtersGrid: {
    display: "grid",
    // gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gridTemplateColumns: "1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  label: {
    color: "#DDB06F",
    fontSize: "0.9em",
  },
  input: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    padding: "8px 12px",
    color: "#DDB06F",
    borderRadius: "4px",
    fontSize: "0.9em",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  range: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rangeInput: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    padding: "8px 12px",
    color: "#DDB06F",
    borderRadius: "4px",
    fontSize: "0.9em",
    flex: 1,
    boxSizing: "border-box" as const,
  },
  rangeText: {
    color: "#DDB06F",
    fontSize: "0.9em",
  },
  resetButton: {
    backgroundColor: "#DDB06F",
    color: "#000",
    border: "none",
    padding: "8px 24px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9em",
    fontWeight: "bold",
    width: "100%",
  },
  resultsText: {
    color: "#DDB06F",
    marginBottom: "20px",
    fontSize: "0.9em",
  },
  tableContainer: {
    overflowX: "auto" as const,
    marginBottom: "20px",
    opacity: 1,
    transition: "opacity 0.3s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    backgroundColor: "#252525",
    borderRadius: "8px",
    overflow: "hidden",
    rowGap: "1rem",
  },
  headerCell: {
    textAlign: "left" as const,
    padding: "12px 16px",
    color: "#DDB06F",
    backgroundColor: "#1a1a1a",
    borderBottom: "2px solid #333",
    fontSize: "0.9em",
  },
  row: {
    borderBottom: "1px solid #333",
  },
  cell: {
    padding: "12px 16px",
    color: "#DDB06F",
    fontSize: "0.9em",
  },
  viewButton: {
    backgroundColor: "#DDB06F",
    color: "#000",
    padding: "6px 12px",
    borderRadius: "4px",
    textDecoration: "none",
    fontSize: "0.9em",
    fontWeight: "bold",
    display: "inline-block",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    marginTop: "20px",
  },
  paginationButton: {
    backgroundColor: "#DDB06F",
    color: "#000",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9em",
    fontWeight: "bold",
  },
  paginationButtonDisabled: {
    backgroundColor: "#DDB06F",
    color: "#000",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontSize: "0.9em",
    fontWeight: "bold",
    opacity: 0.5,
  },
  paginationText: {
    color: "#DDB06F",
    fontSize: "0.9em",
  },
  filterBar: {
    display: "flex",
  },
  filterCheckBoxes: {
    display: "flex",
    padding: "0.5rem",
  },
  checkBox: {
    margin: "0 0.25rem ",
  },
} as const;

const parentUrl = process.env.REACT_APP_API_URL || "";
const Dashboard: React.FC = () => {
  const [url, setUrl] = useState(() => localStorage.getItem("url") || "");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    return Number(localStorage.getItem("pageSize")) || 10;
  });
  const [solPrice, setSolPrice] = useState<number>(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check the screen size on mount
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768); // Mobile if width <= 768px
    };

    checkScreenSize(); // Initial check

    // Listen for window resize events
    window.addEventListener("resize", checkScreenSize);

    // Cleanup listener when component unmounts
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const [filters, setFilters] = useState<Filters>();

  const [checkBoxes, setCheckBoxes] = useState<checkBoxes>({
    pumpFun: true,
    raydium: false,
    devSold: false,
    socials: false,
    audit: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const history = useHistory();

  // const getTokenAuto = () => {
  //   if (!isFilterApplied) {
  //     fetchTokens(
  //       `${parentUrl}/api/getrequiredtokens?pageSize=${pageSize}&page=${currentPage}`
  //     );
  //   }
  // };
  // useEffect(() => {
  //   const intervalID = setInterval(getTokenAuto, 6000);
  //   return () => {
  //     clearInterval(intervalID);
  //   };
  // }, []);

  // Use the custom hook
  // const debouncedFilters = useDebounce(filters, 500);
  // console.log(tokens);

  // const fetchTokens = useCallback(
  //   async (pageNumber = 1) => {
  //     console.log("Making URL Params...");
  //     try {
  //       setLoading(true);
  //       const params = new URLSearchParams({
  //         page: currentPage.toString(),
  //         pageSize: pageSize.toString(),
  //         ...(debouncedFilters.name && { name: debouncedFilters.name }),
  //         ...(debouncedFilters.symbol && { symbol: debouncedFilters.symbol }),
  //         ...(debouncedFilters.marketCapMin && {
  //           marketCapMin: debouncedFilters.marketCapMin,
  //         }),
  //         ...(debouncedFilters.marketCapMax && {
  //           marketCapMax: debouncedFilters.marketCapMax,
  //         }),
  //         ...(debouncedFilters.holdersMin && {
  //           holdersMin: debouncedFilters.holdersMin,
  //         }),
  //         ...(debouncedFilters.holdersMax && {
  //           holdersMax: debouncedFilters.holdersMax,
  //         }),
  //       });

  //       console.log(filters);
  //       console.log("Params object: ");
  //       console.log(params);
  //       const response = await axios.get(
  //         `${
  //           process.env.REACT_APP_API_URL
  //         }/api/getrequiredtokens?${params.toString()}`,
  //         {
  //           headers: { Authorization: `Bearer ${getAuthToken()}` },
  //         }
  //       );
  //       console.log("Request url");
  //       console.log(
  //         `${
  //           process.env.REACT_APP_API_URL
  //         }/api/getrequiredtokens?${params.toString()}`
  //       );

  //       setTokens(response.data.tokens);
  //       setPagination(response.data.pagination);
  //     } catch (err) {
  //       console.error("Failed to fetch tokens:", err);
  //       setError("Failed to load tokens");
  //     } finally {
  //       setLoading(false);
  //     }
  //   },
  //   [currentPage, debouncedFilters]
  // );

  // useEffect(() => {
  //   fetchTokens();
  // }, [fetchTokens]);

  // const fetchTokensFirst = async (pageNumber: number) => {
  //   const host = process.env.REACT_APP_API_URL;
  //   const API_URL = `/api/gettokens?page=${pageNumber}`;
  //   try {
  //     setLoading(true);
  //     const response = await axios.get(host + API_URL);
  //     const tokens = response.data.tokens;
  //     const paginations = response.data.pagination;
  //     console.log("Getting tokens and paginations...");
  //     console.log(tokens);
  //     setTokens(tokens);
  //     setPagination(paginations);

  //     window.scrollTo({
  //       top: 0,
  //       behavior: "smooth",
  //     });
  //   } catch (err) {
  //     console.log(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchTokensFirst(1);
  // }, []);

  // const fetchFilteredData = async (pageNumber = 1) => {
  //   console.log("Fetching filterred data....");
  //   console.log(url);
  //   setLoading(true);
  //   try {
  //     // const res = await axios.post("http://localhost:3001/api/filters/v2");
  //     console.log("Filterred URI");
  //     console.log(url);

  //     const newURL = url ? url : "http://localhost:3001/api/getrequiredtokens";
  //     console.log(newURL);
  //     const response = await axios.get(newURL, {
  //       params: {
  //         page: pageNumber,
  //       },
  //     });

  //     console.log("response from API...");
  //     console.log(response);
  //     const paginations = response.data?.pagination;
  //     const tokens = response.data.data;
  //     setPagination(paginations);
  //     setTokens(tokens);
  //   } catch (error) {
  //     console.error("Error fetching data:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getSolPrice = async () => {
    try {
      const res = await axios.get(
        "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
      );
      // console.log(res.data.price);
      setSolPrice(res.data.price);
    } catch (err) {
      console.log("Error while getting live sol price...");
    }
  };

  useEffect(() => {
    getSolPrice();
    const id = setInterval(getSolPrice, 6000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const fetchTokens = async (url: string) => {
    console.log("Called fetch Tokens...");
    try {
      setLoading(true);
      // Add authentication token to request
      const token = localStorage.getItem("authToken");
      console.log(
        "Using auth token:",
        token ? "Token exists" : "No token found"
      );

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response);
      const tokens = response.data.tokens;
      const paginations = response.data.pagination;
      console.log("Getting tokens and paginations...");
      console.log(tokens);
      if (tokens) {
        setTokens(tokens);
      } else {
        setTokens([]);
      }
      setPagination(paginations);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError(
        "Failed to load data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const filters = JSON.parse(localStorage.getItem("filters") || "{}");
      const currentPage = Number(localStorage.getItem("currentPage")) || 1;
      if (filters) {
        setFilters(filters);
        // set the three checkbox according their values..
        // const socials = filters.socials;
        // const audit = filters.audit;
        // const devSold = filters.devSold;
        // if
      }
      setCurrentPage(currentPage);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem("filters", JSON.stringify(filters));
      localStorage.setItem("currentPage", JSON.stringify(currentPage));
      localStorage.setItem("pageSize", JSON.stringify(pageSize));
      const newUrl = buildFilterUrl(parentUrl, filters, currentPage, pageSize);
      setUrl(newUrl);
    }
  }, [filters, currentPage, pageSize, isAuthenticated]);

  useEffect(() => {
    console.log("URL is changed...");
    fetchTokens(url);
  }, [url]);

  // useEffect(() => {
  //   if (isFilterApplied) {
  //     fetchFilteredData(currentPage);
  //   } else {
  //     fetchTokens(currentPage);
  //   }
  //   const solPriceInterval = setInterval(getSolPrice, 60000);
  //   // const interval = setInterval(fetchData, 60000);
  //   return () => {
  //     clearInterval(solPriceInterval);
  //     // clearInterval(interval);
  //   };
  // }, [url, isFilterApplied]);

  // useEffect(() => {
  //   fetchData();
  //   const solPriceInterval = setInterval(getSolPrice, 60000);
  //   // const interval = setInterval(fetchData, 60000);
  //   return () => {
  //     clearInterval(solPriceInterval);
  //     // clearInterval(interval);
  //   };
  //   // return () => clearInterval(interval);
  // }, [url]);

  const handleUrlChange = () => {
    setUrl(
      `${url}&
    ${checkBoxes.pumpFun ? "&pumpFun=1" : ""}
    ${checkBoxes.raydium ? "&raydium=1" : ""}
    ${checkBoxes.devSold ? "&creator_equity_min=3" : ""}
    ${checkBoxes.socials ? "&socials=1" : ""}
    `
    );
    console.log(url);
  };

  const handleCheckboxes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCheckBoxes((prev) => ({
      ...prev,
      [name]: checked,
    }));
    handleUrlChange();
  };
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      marketCapFrom: "",
      marketCapTo: "",
      transactionsFrom: "",
      transactionsTo: "",
      buysFrom: "",
      buysTo: "",
      sellsFrom: "",
      sellsTo: "",
      volumeFrom: "",
      volumeTo: "",
      txFrom: "",
      txTo: "",
      holdingFrom: "",
      holdingTo: "",
      createdFrom: "",
      createdTo: "",
      liquidityFrom: "",
      liquidityTo: "",
      socials: 0,
      pumpFun: 0,
      raydium: 0,
      devSold: 0,
      pageSize: pageSize,
    });
  };

  const handlePageChange = (newPage: number) => {
    console.log("Page is changed...");
    setCurrentPage(newPage);
  };

  const resetEveryThing = () => {
    console.log("Reset everything..");
    resetFilters();
    setCurrentPage(1);
  };

  const formatNumber = (value: number | null): string => {
    if (value === null || value === undefined) return "N/A";
    return value.toLocaleString();
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return "N/A";
    return `$${value.toLocaleString()}`;
  };

  const fetchSortedData = async (column: string, sort: number) => {
    console.log("called to refetch the data...");
    try {
      let sortOrder = "DESC";
      if (sort === 0) sortOrder = "NOSORT";
      else if (sort === 1) sortOrder = "ASC";

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/get-sorted-data?column=${column}&sortOrder=${sortOrder}`
      );
      console.log("Data is received...");
      console.log(response.data);
      setTokens(response.data);
    } catch (er) {
      console.log(er);
    }
  };

  const handleUrlOnSort = () => {};

  const handleFilterFromPopup = (filtersParam: any) => {
    console.log("Applying filter...");
    console.log(filtersParam);
    setFilters({ ...filters, ...filtersParam, solPrice });
  };

  const handleCheckBoxChange = (event: any) => {
    const name = event.target.name;
    const checked = event.target.checked;
    // API is called for both false and true....
    // setFilters((pre: any) => ({ ...pre, [name]: checked }));
    console.log("name: ", name, " checked...", checked);
    setFilters((pre: any) => ({ ...pre, [name]: checked.toString() }));
    setCheckBoxes((p: any) => ({ ...p, [name]: checked }));
  };

  const onItemClick = (mint: string) => {
    history.push(`/details/${mint}`);
  };

  return (
    <div style={styles.container}>
      {/* <span>{isFilterApplied ? " Filter Applied" : "No Filter Applied"}</span> */}
      <FilterPopup
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        setFiltersObject={handleFilterFromPopup}
        setIsFilterApplied={setIsFilterApplied}
        filtersState={filters}
        handleResetFilter={resetFilters}
        // onApplyFilters={handleApplyFilters}
      />
      <div style={styles.resultsText}>
        {pagination && (
          <>
            {!loading && (
              <>
                Tokens {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, pagination.totalCount)} of{" "}
                {pagination.totalCount.toLocaleString()}
              </>
            )}
            {loading && "Loading..."}
          </>
        )}
      </div>
      <div className="lambo-filter-bar">
        <button
          className="lambo-filter-button"
          onClick={() => {
            setIsFilterOpen(true);
          }}
          title="Open filters"
        >
          <SlidersHorizontal
            size={isMobile ? 14 : 18}
            className="filter-icon"
          />
          <span>Filters</span>
        </button>

        <div className="lambo-toggles">
          <button
            className={`lambo-toggle-btn ${
              checkBoxes?.socials ? "active" : ""
            }`}
            onClick={() =>
              handleCheckBoxChange({
                target: { name: "socials", checked: !checkBoxes?.socials },
              } as any)
            }
            disabled={loading}
            title="Toggle Socials filter"
          >
            <span className="toggle-icon">🔗</span>
            <span className="toggle-label">Socials</span>
            <div
              className={`toggle-indicator ${
                checkBoxes?.socials ? "on" : "off"
              }`}
            ></div>
          </button>

          <button
            className={`lambo-toggle-btn ${
              checkBoxes?.devSold ? "active" : ""
            }`}
            onClick={() =>
              handleCheckBoxChange({
                target: { name: "devSold", checked: !checkBoxes?.devSold },
              } as any)
            }
            disabled={loading}
            title="Toggle Dev Sold filter"
          >
            <span className="toggle-icon">💰</span>
            <span className="toggle-label">Dev Sold</span>
            <div
              className={`toggle-indicator ${
                checkBoxes?.devSold ? "on" : "off"
              }`}
            ></div>
          </button>

          <button
            className={`lambo-toggle-btn ${checkBoxes?.audit ? "active" : ""}`}
            onClick={() =>
              handleCheckBoxChange({
                target: { name: "audit", checked: !checkBoxes?.audit },
              } as any)
            }
            disabled={loading}
            title="Toggle Audit filter"
          >
            <span className="toggle-icon">✓</span>
            <span className="toggle-label">Audit</span>
            <div
              className={`toggle-indicator ${checkBoxes?.audit ? "on" : "off"}`}
            ></div>
          </button>
        </div>
        {/* <div style={styles.filterCheckBoxes}>
          <input
            type="checkbox"
            name="pumpFun"
            checked={checkBoxes.pumpFun}
            style={styles.checkBox}
            onChange={(e) => {
              handleCheckboxes(e);
            }}
          />
          <label style={styles.paginationText}>PumpFun</label>
        </div>
        <div style={styles.filterCheckBoxes}>
          <input
            type="checkbox"
            name="raydium"
            checked={checkBoxes.raydium}
            style={styles.checkBox}
            onChange={(e) => {
              handleCheckboxes(e);
            }}
          />
          <label style={styles.paginationText}>Raydium</label>
        </div>
        <div style={styles.filterCheckBoxes}>
          <input
            type="checkbox"
            name="devSold"
            checked={checkBoxes.devSold}
            style={styles.checkBox}
            onChange={(e) => {
              handleCheckboxes(e);
            }}
          />
          <label style={styles.paginationText}>Dev Sold</label>
        </div>
        <div style={styles.filterCheckBoxes}>
          <input
            type="checkbox"
            name="socials"
            checked={checkBoxes.socials}
            style={styles.checkBox}
            onChange={(e) => {
              handleCheckboxes(e);
            }}
          />
          <label style={styles.paginationText}>Socials</label>
        </div> */}
      </div>
      <div style={styles.tableContainer}>
        {/* Here conditions goes for mobile or desktop size... */}

        {isMobile ? (
          <MobileGridView
            tokens={tokens}
            loading={loading}
            solPrice={solPrice}
            setFilter={setFilters}
            onItemClick={onItemClick}
            resetEveryThing={resetEveryThing}
            isFilterApplied={isFilterApplied}
            setTokens={setTokens}
          />
        ) : (
          <DashboardGridView
            tokens={tokens}
            loading={loading}
            solPrice={solPrice}
            setFilter={setFilters}
            onItemClick={onItemClick}
            resetEveryThing={resetEveryThing}
            isFilterApplied={isFilterApplied}
            setTokens={setTokens}
          />
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div
          className="pagination-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "30px",
            gap: "15px",
          }}
        >
          {/* Page size selector above pagination controls */}
          <div
            className="page-size-selector"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "5px",
            }}
          >
            <label
              style={{
                color: "#DDB06F",
                marginRight: "10px",
                display: isMobile ? "none" : "block",
              }}
            >
              Items per page:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing page size
              }}
              style={{
                backgroundColor: "#252525",
                color: "#DDB06F",
                border: "1px solid #333",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.9em",
              }}
              aria-label="Select number of items per page"
            >
              <option value={10}>10 {isMobile ? "per page" : ""}</option>
              <option value={20}>20 {isMobile ? "per page" : ""}</option>
              <option value={50}>50 {isMobile ? "per page" : ""}</option>
              <option value={100}>100 {isMobile ? "per page" : ""}</option>
            </select>
          </div>

          {/* Pagination controls */}
          <div
            className="pagination-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {/* First button (hidden on mobile) */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              style={{
                backgroundColor: currentPage === 1 ? "#2a2a2a" : "#DDB06F",
                color: currentPage === 1 ? "#666" : "#000",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "0.9em",
                fontWeight: "bold",
                opacity: currentPage === 1 ? 0.5 : 1,
                display: isMobile ? "none" : "flex",
                alignItems: "center",
              }}
              aria-label="Go to first page"
            >
              <span style={{ marginRight: "5px" }}>«</span> First
            </button>

            {/* Previous button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                backgroundColor: currentPage === 1 ? "#2a2a2a" : "#DDB06F",
                color: currentPage === 1 ? "#666" : "#000",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "0.9em",
                fontWeight: "bold",
                opacity: currentPage === 1 ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                minWidth: isMobile ? "90px" : "auto",
                justifyContent: "center",
              }}
              aria-label="Go to previous page"
            >
              <span style={{ marginRight: "5px" }}>‹</span>{" "}
              {isMobile ? "" : "Prev"}
            </button>

            {/* Page indicator */}
            <div
              style={{
                color: "#DDB06F",
                fontSize: "0.9em",
                padding: "6px 12px",
                backgroundColor: "#252525",
                borderRadius: "4px",
                minWidth: isMobile ? "90px" : "120px",
                textAlign: "center",
              }}
            >
              {isMobile
                ? `${currentPage}/${pagination.totalPages}`
                : `Page ${currentPage} of ${pagination.totalPages}`}
            </div>

            {/* Next button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              style={{
                backgroundColor:
                  currentPage === pagination.totalPages ? "#2a2a2a" : "#DDB06F",
                color: currentPage === pagination.totalPages ? "#666" : "#000",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor:
                  currentPage === pagination.totalPages
                    ? "not-allowed"
                    : "pointer",
                fontSize: "0.9em",
                fontWeight: "bold",
                opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                minWidth: isMobile ? "90px" : "auto",
                justifyContent: "center",
              }}
              aria-label="Go to next page"
            >
              {isMobile ? "" : "Next"}{" "}
              <span style={{ marginLeft: isMobile ? "0" : "5px" }}>›</span>
            </button>

            {/* Last button (hidden on mobile) */}
            <button
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
              style={{
                backgroundColor:
                  currentPage === pagination.totalPages ? "#2a2a2a" : "#DDB06F",
                color: currentPage === pagination.totalPages ? "#666" : "#000",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor:
                  currentPage === pagination.totalPages
                    ? "not-allowed"
                    : "pointer",
                fontSize: "0.9em",
                fontWeight: "bold",
                opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                display: isMobile ? "none" : "flex",
                alignItems: "center",
              }}
              aria-label="Go to last page"
            >
              Last <span style={{ marginLeft: "5px" }}>»</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MobileGridViewProps {
  tokens: Token[];
  loading: boolean;
  solPrice: number;
  setFilter: any;
  onItemClick: any;
  resetEveryThing: any;
  isFilterApplied: boolean;
  setTokens: any;
}

const MobileGridView: React.FC<MobileGridViewProps> = ({
  tokens,
  loading,
  solPrice,
  setFilter,
  onItemClick,
  resetEveryThing,
  isFilterApplied,
}) => {
  return (
    <div style={styles.table}>
      {loading && (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{
            animation: "spin 0.1s linear infinite",
          }}
        >
          {/* Lucid-React Spinner */}
          <LoaderCircle size={30} />
        </div>
      )}
      {tokens
        ? tokens.map((token) => (
            <TokenGridMobile
              key={token.mint}
              token={token}
              solPrice={solPrice}
              handleItemClick={onItemClick}
            />
          ))
        : isFilterApplied && <NoTokensFound onResetFilters={resetEveryThing} />}
    </div>
  );
};

const DashboardGridView: React.FC<MobileGridViewProps> = ({
  tokens,
  loading,
  solPrice,
  setFilter,
  onItemClick,
  resetEveryThing,
  isFilterApplied,
  setTokens,
}) => {
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // console.log(tokens);
  // console.log(loading);
  useEffect(() => {
    if (sortOrder !== 0) {
      const sortValue = sortOrder === 1 ? "asc" : "desc";
      if (sortColumn === "liquidity_in_usd") {
        const sortedTokens = sortTokensByLiquidity(tokens, solPrice, sortValue);
        setTokens(sortedTokens);
        return;
      }

      setFilter((pr: any) => ({
        ...pr,
        sortBy: sortColumn,
        sortOrder: sortValue,
      }));
    } else {
      setFilter((pre: any) => ({ ...pre, sortOrder: "", sortBy: "" }));
    }
  }, [sortOrder]);

  const handleItemClick = (column: string) => {
    let newSortValue = 0;
    if (column === sortColumn) {
      // Toggle sort order
      if (sortOrder === 0) {
        newSortValue = 1;
      } else if (sortOrder === 1) {
        newSortValue = -1;
      } else {
        newSortValue = 0;
      }
      setSortOrder(newSortValue);
    } else {
      // New column is selected, set sort order to ascending
      setSortColumn(column);
      setSortOrder(1);
      // fetchSortedData(column, 1);
    }
  };

  const getIcon = (num: number) => {
    if (num === 1) return "^";
    else if (num === -1) return "v";
  };

  return (
    <table className="token-table">
      <thead>
        <tr>
          <th
            onClick={() => handleItemClick("symbol")}
            className={sortColumn === "symbol" ? "active" : ""}
          >
            Token{" "}
            {sortColumn === "symbol" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th>Socials</th>
          <th
            onClick={() => handleItemClick("created_at")}
            className={sortColumn === "created_at" ? "active" : ""}
          >
            Created{" "}
            {sortColumn === "created_at" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th
            onClick={() => handleItemClick("liquidity_in_usd")}
            className={sortColumn === "liquidity_in_usd" ? "active" : ""}
          >
            Liquidity{" "}
            {sortColumn === "liquidity_in_usd" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th
            onClick={() => handleItemClick("market_cap")}
            className={sortColumn === "market_cap" ? "active" : ""}
          >
            Market Cap{" "}
            {sortColumn === "market_cap" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th
            onClick={() => handleItemClick("total_tx")}
            className={sortColumn === "total_tx" ? "active" : ""}
          >
            Transactions{" "}
            {sortColumn === "total_tx" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th
            onClick={() => handleItemClick("token_volume")}
            className={sortColumn === "token_volume" ? "active" : ""}
          >
            Volume{" "}
            {sortColumn === "token_volume" && (
              <span className={sortOrder === 1 ? "sort-icon asc" : "sort-icon"}>
                ▼
              </span>
            )}
          </th>
          <th>Security</th>
          <th>Rug Score</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "1rem",
                  color: "var(--color-accent)",
                }}
              >
                <LoaderCircle size={30} className="spinner" />
                <span>Loading tokens...</span>
              </div>
            </td>
          </tr>
        ) : tokens && tokens.length > 0 ? (
          tokens.map((token) => (
            <TokenGrid
              key={token.mint}
              token={token}
              solPrice={solPrice}
              handleItemClick={onItemClick}
              score={9}
            />
          ))
        ) : (
          isFilterApplied && <NoTokensFound onResetFilters={resetEveryThing} />
        )}

        {/* 
              <tr key={token.id} style={styles.row}>
                <td style={styles.cell}>{token.name || "N/A"}</td>
                <td style={styles.cell}>{token.symbol || "N/A"}</td>
                <td style={styles.cell}>{formatNumber(token.totalSupply)}</td>
                <td style={styles.cell}>{formatCurrency(token.marketCap)}</td>
                <td style={styles.cell}>{formatNumber(token.totalHolders)}</td>
                <td style={styles.cell}>
                  <Link to={`/token/${token.mint}`} style={styles.viewButton}>
                    View Details
                  </Link>
                </td>
              </tr>
              */}
      </tbody>
    </table>
  );
};

export default Dashboard;

const buildFilterUrl = (
  baseUrl: string,
  filters: any = {}, // Default to empty object
  pageNumber: number,
  pageSize: number
) => {
  const params = new URLSearchParams();

  // Mapping for range-based filters
  const rangeFields: { [key: string]: string } = {
    marketCap: "market_cap",
    transactions: "transactions",
    buys: "buy_count",
    sells: "sell_count",
    volume: "token_volume",
    tx: "total_tx",
    holding: "top_10_holder_equity",
    created: "created_at",
    liquidity: "liquidity",
  };

  // Handle range filters (min/max) and ignore undefined or empty values
  Object.keys(rangeFields).forEach((field) => {
    const fieldKey = rangeFields[field];
    const fromValue = filters?.[`${field}From`];
    const toValue = filters?.[`${field}To`];

    if (fromValue !== "" && fromValue !== undefined)
      params.append(`${fieldKey}_min`, fromValue);

    if (toValue !== "" && toValue !== undefined)
      params.append(`${fieldKey}_max`, toValue);
  });

  // Handle boolean/numeric fields, ignore undefined or falsy values (except 0)
  // ["socials", "pumpFun", "raydium", "devSold"].forEach((key) => {
  //   const value = filters?.[key];
  //   if (value !== undefined && value !== "") params.append(key, value);
  // });

  // Handle pagination
  params.append("page", pageNumber.toString());
  params.append("pageSize", pageSize.toString());

  const sortBy = filters.sortBy;
  const sortOrder = filters.sortOrder;
  if (sortBy && sortBy.length != 0) {
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
  }
  // CheckBoxes...
  const socials = filters.socials;
  const devSold = filters.devSold;
  const audit = filters.audit;
  if (socials) params.append("socials", socials);
  if (devSold) params.append("devSold", devSold);
  if (audit) params.append("audit", audit);

  if (filters.solPrice) params.append("solPrice", filters.solPrice);

  return `${baseUrl}/api/getrequiredtokens?${params.toString()}`;
};
