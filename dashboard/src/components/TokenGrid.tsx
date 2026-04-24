import { syncBuiltinESMExports } from "module";
import "../styles/tokenGrid.css";
import { formatFloatWithSubtext } from "../utils/subtext";
import SocialLinks from "./socials";
import TokenAddress from "./TokenAddress";
import TokenImage from "./TokenImage";
import DisplayAudits from "./Audits";
import HoldersData from "./Holders";
import { Clock, User } from "lucide-react";
import { getTimeAgo } from "../utils/getTimeAgo";
import { formatNumber } from "../utils/formatPrice";
import { useHistory } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLiquidity } from "../utils/liquidity";

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
  score: number;
}

const calculatePrice = (token: Token, solPrice: number): number => {
  let reserve_token = token?.pump_tokens?.reserve_token;
  const reserve_sol = token?.pump_tokens?.reserve_sol;
  if (reserve_token === 0 || reserve_sol === 0) return 0;
  const price = (reserve_sol / reserve_token) * solPrice;
  if (isNaN(price)) return 0;
  return price;
};

const styles = {
  cell: {
    padding: "12px 16px",
    color: "#DDB06F",
    fontSize: "0.9em",
  },
};

const TokenGrid: React.FC<TokenGridProps> = ({
  token,
  solPrice,
  handleItemClick,
  score,
}) => {
  const [ignore, setIgnore] = useState(false);

  useEffect(() => {
    // console.log("Checking null value...");
    // const resolve_sol = token?.pump_tokens?.reserve_sol;
    // const resolve_token = token?.pump_tokens?.reserve_token;
    // const market_cap = token?.market_cap;
    // if (resolve_sol === 0 || resolve_token === 0 || market_cap === 0) {
    //   console.log("Having zero's on calculation......");
    //   console.log(token.mint);
    //   setIgnore(true);
    // }
  }, []);

  const checkForZeroValue = (value: any) => {};
  return ignore ? (
    <></>
  ) : (
    <tr
      onClick={() => {
        // alert(token.pump_tokens?.reserve_sol+ " r: "+ token.pump_tokens.reserve_token);
        handleItemClick(token.mint);
      }}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      className="token-row"
    >
      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="token-header">
          <TokenImage
            uri={token.uri}
            name={token.name}
            isFromRaydium={token.ray_token ? true : false}
          />
          <div style={{ marginLeft: "0.5rem" }}>
            <div className="token-title">
              <h3 className="token-symbol">{token.symbol}</h3>
              <TokenAddress address={token.mint} />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "0.25rem",
              }}
            >
              <User
                size={14}
                color="var(--color-text-secondary)"
                style={{ marginRight: "0.25rem" }}
              />
              <TokenAddress address={token.creator} />
            </div>
          </div>
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div>
          <SocialLinks links={token.socials} />
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--color-text-secondary)",
            fontSize: "0.85rem",
          }}
        >
          <Clock size={14} style={{ marginRight: "0.5rem" }} />
          {getTimeAgo(token.created_at)}
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">Liquidity</div>
        <div className="metric-value">
          ${formatNumber(getLiquidity(token, solPrice).toFixed(2))}
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">Market Cap</div>
        <div className="metric-value">
          ${formatNumber(token.market_cap * solPrice)}
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">Transactions</div>
        <div className="metric-value">{token.total_tx.toLocaleString()}</div>
        <div className="transactions">
          <span className="buy-count">{token.buy_count.toLocaleString()}</span>
          <span style={{ margin: "0 0.25rem", opacity: 0.6 }}>/</span>
          <span className="sell-count">
            {token.sell_count.toLocaleString()}
          </span>
        </div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">Volume</div>
        <div className="metric-value">{formatNumber(token.token_volume)}</div>
      </td>

      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">Security Audits</div>
        <DisplayAudits
          mad={token.mintable}
          fad={token.freezeable}
          lp={token?.ray_token?.lp_burned || false}
          top10={token.top_10_holder_equity}
        />
      </td>
      <td
        style={{
          padding: "1rem",
          verticalAlign: "middle",
        }}
      >
        <div className="metric-label">{`${score}/10`}</div>
      </td>
    </tr>
  );
};

export default TokenGrid;
