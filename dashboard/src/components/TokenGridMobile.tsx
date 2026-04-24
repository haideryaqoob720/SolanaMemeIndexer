import { syncBuiltinESMExports } from "module";
import "../styles/tokenGrid.css";
import { formatNumber } from "../utils/formatPrice";
import { getLiquidity } from "../utils/liquidity";
import SocialLinks, { SocialLinksMobile } from "./socials";
import TokenAddress from "./TokenAddress";
import TokenImage from "./TokenImage";
import DisplayAudits from "./Audits";
import HoldersData from "./Holders";
import { Check, Clock, User, X } from "lucide-react";
import { getTimeAgo } from "../utils/getTimeAgo";

interface PumpTokens {
  id: number;
  mint: string;
  bonding_curve: string;
  bonding_progress: number;
  reserve_sol: number;
  reserve_token: number;
  buy_count: number;
  sell_count: number;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: number;
  mint: string;
  name: string;
  uri: string;
  symbol: string;
  socials: string[];
  mintable: boolean;
  freezeable: boolean;
  top_10_holder_equity: number;
  creator: string;
  creator_equity: number;
  total_supply: number;
  total_holders: number;
  market_cap: number;
  creator_balance: number;
  sol_volume: number;
  token_volume: number;
  buy_count: number;
  sell_count: number;
  total_tx: number;
  created_at: string;
  updated_at: string;
  pump_tokens: PumpTokens;
  ray_token: any;
}

interface TokenGridProps {
  token: Token;
  solPrice: number;
  handleItemClick: any;
}

const calculatePrice = (token: Token, solPrice: number): number => {
  return (
    (token?.pump_tokens?.reserve_sol / token?.pump_tokens?.reserve_token) *
    solPrice
  );
};

const styles = {
  cell: {
    padding: "12px 16px",
    color: "#DDB06F",
    fontSize: "0.9em",
  },
};

const TokenGridMobile: React.FC<TokenGridProps> = ({
  token,
  solPrice,
  handleItemClick,
}) => {
  return (
    <div
      className="p-2 d-flex flex-column gap-1 mb-3"
      style={{
        borderBottom: "2px solid gray",
        cursor: "pointer",
      }}
      onClick={() => handleItemClick(token.mint)}
    >
      {/* <div className="token-grid"> */}
      {/* {tokens.map((token) => ( */}
      {/* <div className="token-card" key={token.mint}> */}
      {/* <div className="token-content"> */}

      {/* Profile Data */}
      <div className="d-flex justify-content-between">
        <div className="token-header" style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
            <TokenImage
              uri={token.uri}
              name={token.name}
              isFromRaydium={token?.ray_token ? true : false}
            />
            <div style={{ flex: 1, marginLeft: "0.5rem" }}>
              <div className="d-flex align-items-center justify-content-between">
                <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap" }}>
                  <h1 className="token-symbol m-0" style={{ marginRight: "0.5rem" }}>
                    {token.symbol.toUpperCase()}
                  </h1>
                  <TokenAddress address={token.mint} />
                </div>
                {token.socials && token.socials.length > 0 && (
                  <div style={{ marginLeft: "auto" }}>
                    <SocialLinks links={token.socials} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: "0.25rem" }}>
                <User size={15} style={{ marginRight: "0.25rem", flexShrink: 0 }} />
                <TokenAddress address={token.creator} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div
        className="d-flex justify-content-between p-2"
        style={{
          borderRadius: "10px",
          border: "1px solid gray",
        }}
      >
        <div className="d-flex align-items-center gap-1">
          <Clock size={12} /> {getTimeAgo(token.created_at)}
        </div>
        {/* Four icons */}
        <div className="d-flex gap-2">
          <div className="audit-detail" title="Mint Authrity Disabled">
            {!token.mintable ? (
              <Check color="green" size={15} />
            ) : (
              <X color="red" size={15} />
            )}{" "}
            MAD
          </div>
          <div className="audit-detail" title="Freeze Authrity Disabled">
            {!token.freezeable ? (
              <Check color="green" size={15} />
            ) : (
              <X color="red" size={15} />
            )}{" "}
            FAD
          </div>
          <div className="audit-detail" title="LP Burn">
            {true ? (
              <Check color="green" size={15} />
            ) : (
              <X color="red" size={15} />
            )}{" "}
            LP
          </div>
          <div className="audit-detail" title={`Top 10 holders: ${token.top_10_holder_equity.toFixed(2)}% of total supply`}>
            {token.top_10_holder_equity < 15 ? (
              <Check color="green" size={15} />
            ) : (
              <X color="red" size={15} />
            )}{" "}
            T10 <span style={{margin: "0 0.2rem", opacity: 0.7}}>|</span> <strong style={{fontSize: "0.85em"}}>{token.top_10_holder_equity.toFixed(2)}%</strong>
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="">
        <div className="row d-flex" style={{ marginBottom: 0, paddingBottom: 0 }}>
          <LabelComponent
            label="Liquidity"
            value={`$${formatNumber(getLiquidity(token, solPrice))}`}
          />
          <LabelComponent
            label="MKT CAP"
            value={`$${formatNumber(token.market_cap * solPrice)}`}
          />
          <div className="col-3" style={{ fontSize: "0.85em" }}>
            <div>
              <label style={{ color: "gray" }}>TXNS</label>
              <InfoIcon />
            </div>
            <div style={{ marginBottom: 0 }}>{token.total_tx.toLocaleString()}</div>
            <div style={{ fontSize: "0.9em", lineHeight: "1" }}>
              <span className="buy-count">
                {token.buy_count.toLocaleString()}
              </span>
              <span> / </span>
              <span className="sell-count">
                {token.sell_count.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Holdings. */}
          {/* <div className="col-3">
            <div className="label d-flex">
              <label style={{ color: "gray" }}>HOLDERS</label>
              <InfoIcon />
            </div>

            <HoldersData
              uniqueUsers={token.total_holders}
              creatorEquity={token.creator_equity}
            />
          </div> */}

          <LabelComponent
            label="Volume"
            value={`$${formatNumber(token.token_volume)}`}
          />

          {/* <LabelComponent label="VOLUME" value={formatNumber(token.market_cap * solPrice)}/> */}
        </div>
      </div>
    </div>
  );
};

interface LabelItemValue {
  label: string;
  value: string;
}

const LabelComponent: React.FC<LabelItemValue> = ({ label, value }) => {
  return (
    <div className="col-3" style={{ fontSize: "0.85em" }}>
      <div className="">
        <div className="label d-flex">
          <label style={{ color: "gray", marginBottom: 0 }}>{label}</label>
          <InfoIcon />
        </div>
        <p style={{ marginBottom: 0, fontSize: "0.95em" }}>{value}</p>
      </div>
    </div>
  );
};

const InfoIcon: React.FC = () => {
  return (
    <div className="d-inline">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        fill="black"
        viewBox="0 0 16 16"
      >
        <circle cx="8" cy="8" r="7" strokeWidth="1" fill="gray" />
        <text
          x="50%"
          y="50%"
          fontSize="10"
          textAnchor="middle"
          dy=".3em"
          fill="black"
        >
          i
        </text>
      </svg>
    </div>
  );
};

const SolanaIcon: React.FC = () => {
  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="50"
        height="50"
        viewBox="0 0 32 32"
      >
        <path
          fill="#00FFA3"
          d="M16 0c8.837 0 16 7.163 16 16s-7.163 16-16 16-16-7.163-16-16 7.163-16 16-16zm-2.573 24.057l.012-1.824c-3.351 2.239-6.48 2.307-9.502.64-1.352-.854-2.103-2.554-2.027-4.114 0 0-.043-2.267 2.226-3.503 1.968-1.074 3.661-1.599 5.318-2.293-1.62 1.522-2.312 3.446-2.085 5.32.56 1.92 1.914 2.828 3.374 2.827 1.49 0 2.647-.656 3.539-1.528.537-.36.778-.841.7-1.318-.092-.35-.414-.676-.758-.735-.42-.068-.767-.39-.891-.79-.273-.57.273-1.289.84-1.225.89.095 1.617-.354 2.366-.923.944-.722 1.734-1.695 2.084-2.755 1.607-4.058-.045-9.181-3.98-12.184-2.823-2.43-6.477-2.686-9.24-1.043-2.507 1.243-4.428 3.487-5.424 5.907-.056.117.089.31.165.369 1.042 1.141 3.157 3.084 5.296 2.273-.057-.35.041-.706.352-.884.417-.227.907-.292 1.358-.106.694.292 1.031 1.045 1.029 1.756-.003.678-.145 1.294-.63 1.819-.266.314-.354.705-.158 1.015.338.655.406 1.455.764 2.112.248-.465-.149-.955-.594-1.142-1.426-.754-.024-2.033.021-3.413.39 3.052-.481 4.288-1.658 6.356-2.527-.184 3.597-.618 3.676-2.38 5.524zm5.196-9.014c.495 1.69-.755 3.578-2.416 3.778-1.786-.453-2.826-2.19-1.667-3.741.363-.437.892-.467 1.315-.469-.131-.495-.52-.71-1.025-.682.462-.477.758-1.074.95-1.703.228-.806-.327-1.558-.948-2.038.055-.237.325-.332.51-.313-.344.124-.553.468-.67.768z"
        />
      </svg>
      <p>Solana Icon</p>
    </div>
  );
};

export default TokenGridMobile;
