import { User } from "lucide-react";

const HoldersData = ({ uniqueUsers, creatorEquity }: any) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // justifyContent: "center",
        // alignItems: "center",
        // textAlign: "center",
      }}
    >
      <span>
        <User size={15} />
        {creatorEquity.toFixed(2)}%
      </span>
      <span>{uniqueUsers}</span>
    </div>
  );
};

export default HoldersData;
