import React, { useEffect, useState } from "react";
import { X, Filter, Check, Circle } from "lucide-react";
import "../styles/filterPopup.css";

const FilterPopup = ({
  isOpen,
  onClose,
  setFiltersObject,
  filtersState,
  handleResetFilter,
  setIsFilterApplied,
}: any) => {
  const defaultFilters = {
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
    pageSize: Number(localStorage.getItem("pageSize")) || 10,
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [sortField, setSortField] = useState();
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (filtersState) {
      setFilters(filtersState);
    }
  }, [filtersState]);

  const handleApplyFilters = () => {
    if(sortField){
      const updatedFilter = {...filters, sortBy:sortField, sortOrder}
      setFiltersObject(updatedFilter);
    }else{
      setFiltersObject(filters);
    }
    setIsFilterApplied(true);
    onClose();
  };

  const handleFilterChange = (e: any) => {
    const { name, value, checked } = e.target;

    // if (name === "pumpFun") {
    //   setFilters((prev) => ({
    //     ...prev,
    //     pumpFun: checked ? 1 : 0,
    //   }));
    // } else if (name === "raydium") {
    //   setFilters((prev) => ({
    //     ...prev,
    //     raydium: checked ? 1 : 0,
    //   }));
    // } else

    if (name === "socials") {
      setFilters((prev: any) => ({
        ...prev,
        socials: checked ? 1 : 0,
      }));
    } else if (name === "devSold") {
      setFilters((prev: any) => ({
        ...prev,
        holdingTo: "3",
      }));
    } else {
      setFilters((prev: any) => ({
        ...prev,
        [name]: value,
      }));
    }
    // console.log(filters);
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
      pageSize: 10,
    });
    handleResetFilter();
    setIsFilterApplied(false);
    setSortField(undefined);
    setSortOrder("");
    localStorage.removeItem("filters");
    onClose();
  };

  if (!isOpen) return null;
  const handleClose = (event: any) => {
    event.stopPropagation();
    onClose();
  };
  const handleChildClick = (event: any) => {
    event.stopPropagation();
  };

  const handleSortFieldChange = (event:any)=>{
    const value = event.target.value
    if(value)
      setSortField(event.target.value);
  }
  const handleSortOrderChange = (event:any)=>{
    setSortOrder(event.target.value);
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content ${isOpen ? "open" : ""}`}
        onClick={handleChildClick}
      >
      
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            <Filter size={18} className="mr-2" />
            Token Filters
          </h3>
          <button className="btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Simple Filter List */}
        <div className="filters-grid">
          {/* Sorting Dropdown */}
          <div className="filter-group d-block d-md-none">
            <label className="filter-label">Sort By</label>
            <div className="range-group">
              {/* Dropdown for sorting field */}
              <select
                value={sortField}
                onChange={handleSortFieldChange}
                className="input select"
              >
                <option value="">Select Field</option>
                <option value="created_at">Create</option>
                <option value="liquidity_in_usd">Liquidity</option>
                <option value="total_tx">Transactions</option>
                <option value="market_cap">Market Cap</option>
                <option value="token_volume">Volume</option>
              </select>

              {/* Dropdown for sorting order */}
              <select
                value={sortOrder}
                onChange={handleSortOrderChange}
                className="input select"
              >
                <option value="asc">Lowest to Highest</option>
                <option value="desc">highest to Lowest</option>
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Market Cap</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="marketCapFrom"
                value={filters?.marketCapFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="marketCapTo"
                value={filters?.marketCapTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Liquidity</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="liquidityFrom"
                value={filters?.liquidityFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="liquidityTo"
                value={filters?.liquidityTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Volume</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="volumeFrom"
                value={filters?.volumeFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="volumeTo"
                value={filters?.volumeTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Transactions</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="txFrom"
                value={filters?.txFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="txTo"
                value={filters?.txTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Buys</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="buysFrom"
                value={filters?.buysFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="buysTo"
                value={filters?.buysTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Sells</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="sellsFrom"
                value={filters?.sellsFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="sellsTo"
                value={filters?.sellsTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Dev Holding %</label>
            <div className="range-group">
              <input
                type="number"
                inputMode="numeric"
                name="holdingFrom"
                value={filters?.holdingFrom}
                onChange={handleFilterChange}
                placeholder="Min"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="number"
                inputMode="numeric"
                name="holdingTo"
                value={filters?.holdingTo}
                onChange={handleFilterChange}
                placeholder="Max"
                className="input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Token Age</label>
            <div className="range-group">
              <input
                type="date"
                name="createdFrom"
                value={filters?.createdFrom}
                onChange={handleFilterChange}
                placeholder="From"
                className="input"
              />
              <span className="range-text">to</span>
              <input
                type="date"
                name="createdTo"
                value={filters?.createdTo}
                onChange={handleFilterChange}
                placeholder="To"
                className="input"
              />
            </div>
          </div>
          
          {/* Filter Action Buttons */}
          <div className="filter-group">
            <div className="filter-actions">
              <button className="reset-button" onClick={resetFilters}>
                Reset
              </button>
              <button className="button" onClick={handleApplyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>
        {`
         
          

        `}
      </style>
    </div>
  );
};

export default FilterPopup;
