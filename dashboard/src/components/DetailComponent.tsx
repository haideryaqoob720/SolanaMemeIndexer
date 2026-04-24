import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import { calculatePercent, singleHolderLargeSupply } from "../utils/utilcode";
import axios from "axios";

interface RiskItemProps {
  title: string;
  description: string;
  riskLevel: "High" | "Moderate" | "Low";
}

const RiskItem: React.FC<RiskItemProps> = ({
  title,
  description,
  riskLevel,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-danger";
      case "Moderate":
        return "bg-warning text-dark";
      case "Low":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="bg-dark text-white p-1 rounded">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <AlertTriangle className="text-danger me-2" />
          <strong>{title}</strong>
        </div>
        <div className="d-flex align-items-center">
          <span className={`badge ${getBadgeColor(riskLevel)} me-2`}>
            {riskLevel} Risk
          </span>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>
      <hr className="border-secondary" />
      {isOpen && <p className="">{description}</p>}
    </div>
  );
};

// Safe Item...
const SafeItem: React.FC<{ text: string; state: boolean }> = ({
  text,
  state,
}) => (
  <div className="d-flex align-items-center my-3">
    {state ? (
      <ShieldCheck className="me-2 text-success" />
    ) : (
      <ShieldX className="me-2 text-danger" />
    )}
    <span className="text-white">{text}</span>
  </div>
);

const top10 = {
  title: "",
  description:
    "The top 10 wallets control a large percentage of the token supply, increasing centralization risks.",
  riskLevel: "High",
};
const top20 = {
  title: "",
  description:
    "Similar to the top 10 wallets, a high concentration in the top 20 wallets indicates a risk of centralization and potential for coordinated market manipulation",
  riskLevel: "High",
};

const RiskAnalysis: React.FC<{
  data: any;
  topHolders: any;
  rugCheckDetails: any;
  activeInteraction: Boolean;
}> = ({ data, topHolders, rugCheckDetails, activeInteraction }) => {
  const [percent, setPercent] = useState(0);
  const [isTop20, setIsTop20] = useState(false);

  // const fetchTweetStatus = async (symbol: string) => {
  //   try {
  //     const response = await axios.get(
  //       `${process.env.REACT_APP_API_URL}/get-tweets?username=${symbol}`
  //     );
  //     console.log(response);
  //     const data = response.data;
  //     if (!data.success) setHasTweets(false);
  //     else {
  //       console.log("get the number of tweets and number of accounts.");
  //     }
  //   } catch (err) {
  //     console.log(err);
  //     setHasTweets(false);
  //   }
  // };

  useEffect(() => {
    if (topHolders.length >= 20) {
      setIsTop20(true);
    } else {
      setIsTop20(false);
    }
    calculatePercent(topHolders, setPercent);
    singleHolderLargeSupply(topHolders);
  }, [topHolders]);

  useEffect(() => {
    console.log(rugCheckDetails);
  }, [rugCheckDetails]);

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-danger";
      case "Moderate":
        return "bg-warning text-dark";
      case "Low":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  const isMetaDataFound =
    rugCheckDetails?.has_tweets &&
    rugCheckDetails?.isWebsiteValid &&
    rugCheckDetails?.number_of_twitters > 0;

  // const safeItems = [
  //   { text: "mintable risk.", state: !data?.mintable },
  //   { text: "freeze risk.", state: !data?.freezeable },
  //   { text: "auto-freeze risk.", state: !data?.freezeable  },
  //   { text: "No permanent control risk.", state: false },
  //   { text: `${!isMetaDataFound ? "":"No "}concerning metadata found.`, state: isMetaDataFound },
  //   { text: "Sufficient liquidity confirmed.", state: true },
  //   { text: "Adequate liquidity levels.", state: true },
  //   { text: "No custom fees applied.", state: true },
  //   { text: "Recent user activity confirmed.", state: true },
  //   { text: "All liquidity pools known.", state: true },
  //   { text: "Sufficient LP providers.", state: true },
  //   { text: "Established contract stability.", state: true },
  //   { text: "Active interaction in last 30 days.", state: activeInteraction },
  // ];
  const safeItems = [
    { text: "mintable risk.", state: rugCheckDetails?.mintable },
    { text: "freeze risk.", state: rugCheckDetails?.freezeable },
    { text: "auto-freeze risk.", state: rugCheckDetails?.freezeable },
    { text: "No permanent control risk.", state: false },
    {
      text: `${!isMetaDataFound ? "" : "No "}concerning metadata found.`,
      state: isMetaDataFound,
    },
    { text: "Sufficient liquidity confirmed.", state: true },
    { text: "Adequate liquidity levels.", state: true },
    { text: "No custom fees applied.", state: true },
    { text: "Recent user activity confirmed.", state: true },
    { text: "All liquidity pools known.", state: true },
    { text: "Sufficient LP providers.", state: true },
    { text: "Established contract stability.", state: true },
    { text: "Active interaction in last 30 days.", state: activeInteraction },
  ];

  return (
    <div className="bg-dark text-white p-4 rounded">
      {/*  */}
      <div className="bg-dark text-white p-1 rounded">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {percent > 20 ? (
              <AlertTriangle className="text-danger me-2" />
            ) : (
              <CheckCircle className="me-2 text-success" />
            )}
            <strong>Private wallet holds significant supply.</strong>
          </div>
          <div className="d-flex align-items-center">
            <span className={`badge ${getBadgeColor("High")} me-2`}>
              High Risk
            </span>
            <button className="btn btn-sm btn-outline-light" onClick={() => {}}>
              {false ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
        </div>
        <hr className="border-secondary" />
        {/* {isOpen && <p className="">{description}</p>} */}
      </div>
      {/*  */}
      <div className="bg-dark text-white p-1 rounded">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {percent > 90 ? (
              <AlertTriangle className="text-danger me-2" />
            ) : (
              <CheckCircle className="me-2 text-success" />
            )}
            <strong>Large portion of LP is unlocked.</strong>
          </div>
          <div className="d-flex align-items-center">
            <span className={`badge ${getBadgeColor("High")} me-2`}>
              High Risk
            </span>
            <button className="btn btn-sm btn-outline-light" onClick={() => {}}>
              {false ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
        </div>
        <hr className="border-secondary" />
        {/* {isOpen && <p className="">{description}</p>} */}
      </div>
      {/* 3 Metadata mutability risk. */}

      {/* <div className="bg-dark text-white p-1 rounded">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <AlertTriangle className="text-danger me-2" />
            <strong>Metadata mutability risk.</strong>
          </div>
          <div className="d-flex align-items-center">
            <span className={`badge ${getBadgeColor("High")} me-2`}>
              High Risk
            </span>
            <button className="btn btn-sm btn-outline-light" onClick={() => {}}>
              {false ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
        </div>
        <hr className="border-secondary" />
      </div> */}

      {/* 4 */}
      {isTop20 ? (
        <div className="bg-dark text-white p-1 rounded">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {percent > 40 ? (
                <AlertTriangle className="text-danger me-2" />
              ) : (
                <CheckCircle className="me-2 text-success" />
              )}
              <strong>Top 20 wallets hold significant share.</strong>
            </div>
            <div className="d-flex align-items-center">
              <span className={`badge ${getBadgeColor("High")} me-2`}>
                High Risk
              </span>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => {}}
              >
                {false ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
          </div>
          <hr className="border-secondary" />
          {/* {isOpen && <p className="">{description}</p>} */}
        </div>
      ) : (
        <div className="bg-dark text-white p-1 rounded">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {percent > 30 ? (
                <AlertTriangle className="text-danger me-2" />
              ) : (
                <CheckCircle className="me-2 text-success" />
              )}
              <strong>Top 10 wallets hold significant share.</strong>
            </div>
            <div className="d-flex align-items-center">
              <span className={`badge ${getBadgeColor("High")} me-2`}>
                High Risk
              </span>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => {}}
              >
                {false ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
          </div>
          <hr className="border-secondary" />
          {/* {isOpen && <p className="">{description}</p>} */}
        </div>
      )}

      {/* Check security */}
      <div className="">
        {safeItems.map((item, index) => (
          <SafeItem key={index} text={item.text} state={item.state} />
        ))}
      </div>
    </div>
  );
};

export default RiskAnalysis;
// const risks = [
//   {
//     title: "Private wallet holds significant supply.",
//     description:
//       "Concentration of a large percentage of tokens within the top 10 wallets can lead to centralization risks and potential market manipulation.",
//     riskLevel: "High",
//   },
//   {
//     title: "",
//     description:
//       "A significant portion of the LP is in circulation, which can result in a significant withdrawal of liquidity, A.K.A, a rug pull.",
//     riskLevel: "High",
//   },
//   {
//     title: "",
//     description:
//       "The ability to alter token metadata post-deployment can lead to changes in token characteristics or promises without consensus, undermining trust.",
//     riskLevel: "Moderate",
//   },
// ];
