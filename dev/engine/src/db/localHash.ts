import { Connection, PublicKey } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import { Logger } from "winston";
import { getAllMetrics } from "../filters/filters";

type MemeTokenTest = {
  id: number;
  mint: string;
  name?: string | null;
  uri?: string | null;
  symbol?: string | null;
  socials: string[];
  top10holderEquity?: number | null;
  creatorEquity?: number | null;
  totalSupply?: number | null;
  lpBurned?: boolean | null;
  lpBurnedAmount?: number | null;
  mintable?: boolean | null;
  freezeable?: boolean | null;
  tax?: boolean | null;
  liquidityLock?: boolean | null;
  bondingCurveVault?: string | null;
  creator?: string | null;
  bondingProgress?: number | null;
  marketCap?: number | null;
  reserveSol?: number | null;
  reserveToken?: number | null;
  status?: number | null;
  totalHolders?: number | null;
  buyCount: number;
  sellCount: number;
};

export class MemeTokenTracker {
  private tokenRecords: Map<string, MemeTokenTest>;
  // private connection: Connection;
  private prisma: PrismaClient;
  private logger: Logger;
  private updatedRecords: number;

  constructor(logger: Logger, existingRecords?: Map<string, MemeTokenTest>) {
    this.tokenRecords = existingRecords
      ? existingRecords
      : new Map<string, MemeTokenTest>();
    // this.connection = new Connection(solanaRpcUrl);
    this.prisma = new PrismaClient();
    this.logger = logger;
    this.updatedRecords = 0;
  }

  async initialize(): Promise<void> {
    try {
      const records = await this.prisma.meme_token_test.findMany();
      console.log(`feteched ${records.length} form db`);
      this.logger.info(`feteched ${records.length} form db`);
      records.forEach((record) => {
        this.tokenRecords.set(record.mint, record);
      });
      console.log(
        `Loaded ${this.tokenRecords.size} meme token records into memory`
      );
      this.logger.info(
        `Loaded ${this.tokenRecords.size} meme token records into memory`
      );
    } catch (error) {
      this.logger.error("Failed to initialize meme token records:", error);
      throw error;
    }
  }

  handleStreamLog(mintAddress: string, isBuy: boolean) {
    try {
      const existingRecord = this.tokenRecords.get(mintAddress);
      if (existingRecord) {
        let record: MemeTokenTest | undefined =
          this.tokenRecords.get(mintAddress);
        if (record) {
          isBuy ? record.buyCount++ : record.sellCount++;
          // this.logger.level = "SwapUpdate";
          this.logger.info("❗❗updated token");
          this.logger.info(record);
          this.updatedRecords++;
          if (this.updatedRecords > 100) {
            this.logger.alert("reached 100 token updates");
            this.updatedRecords = 0;
            // this.updateDatabase()
          }
        } else {
        }
      } else {
        // this.logger.info("token not found in db");
      }
    } catch (error) {
      this.logger.error(`Error handling log for mint ${mintAddress}:`, error);
      throw error;
    }
  }
  async handleCreateLog(mintAddress: string, data: MemeTokenTest) {
    // const data: any = await getAllMetrics(
    //   mintAddress,
    //   owner,
    //   name,
    //   symbol,
    //   uri
    // );
    this.tokenRecords.set(mintAddress, data);
  }
  async updateDatabase() {
    // const update = this.prisma.meme_token_test.updateMany()
  }
}

//   private parseLogData(
//     logData: any,
//     existingRecord?: MemeTokenTest
//   ): Partial<MemeTokenTest> {
//     // This is a placeholder - implement your specific log parsing logic
//     const updates: Partial<MemeTokenTest> = {};

//     // Example log parsing logic - adjust based on your actual log structure
//     if (logData.type === "buy") {
//       updates.buyCount = (existingRecord?.buyCount || 0) + 1;
//     } else if (logData.type === "sell") {
//       updates.sellCount = (existingRecord?.sellCount || 0) + 1;
//     }

//     if (logData.totalSupply) {
//       updates.totalSupply = parseFloat(logData.totalSupply);
//     }

//     if (logData.marketCap) {
//       updates.marketCap = parseFloat(logData.marketCap);
//     }

//     // Add more parsing logic based on your log structure

//     return updates;
//   }

//   private async updateDatabase(
//     mint: string,
//     updates: Partial<MemeTokenTest>
//   ): Promise<void> {
//     await this.prisma.meme_token_test.update({
//       where: { mint },
//       data: updates,
//     });
//   }

//   private async insertDatabase(
//     record: Omit<MemeTokenTest, "id">
//   ): Promise<MemeTokenTest> {
//     return await this.prisma.meme_token_test.create({
//       data: {
//         mint: record.mint,
//         name: record.name || null,
//         uri: record.uri || null,
//         symbol: record.symbol || null,
//         socials: record.socials,
//         top10holderEquity: record.top10holderEquity || null,
//         creatorEquity: record.creatorEquity || null,
//         totalSupply: record.totalSupply || null,
//         lpBurned: record.lpBurned || null,
//         lpBurnedAmount: record.lpBurnedAmount || null,
//         mintable: record.mintable || null,
//         freezeable: record.freezeable || null,
//         tax: record.tax || null,
//         liquidityLock: record.liquidityLock || null,
//         bondingCurveVault: record.bondingCurveVault || null,
//         creator: record.creator || null,
//         bondingProgress: record.bondingProgress || null,
//         marketCap: record.marketCap || null,
//         reserveSol: record.reserveSol || null,
//         reserveToken: record.reserveToken || null,
//         status: record.status || null,
//         totalHolders: record.totalHolders || null,
//         buyCount: record.buyCount,
//         sellCount: record.sellCount,
//       },
//     });
//   }

//   getTokenRecord(mintAddress: string): MemeTokenTest | undefined {
//     return this.tokenRecords.get(mintAddress);
//   }

//   async subscribeToLogs(): Promise<void> {
//     this.connection.onLogs(
//       new PublicKey("your-program-id-here"),
//       (logs) => {
//         logs.logs.forEach(async (log) => {
//           const mintAddress = this.extractMintAddress(log);
//           if (mintAddress) {
//             await this.handleSolanaLog(
//               mintAddress,
//               this.parseTransactionLog(log)
//             );
//           }
//         });
//       },
//       "confirmed"
//     );
//   }

//   private parseTransactionLog(log: string): any {
//     // Implement your specific log parsing logic here
//     return {};
//   }

//   private extractMintAddress(log: string): string | null {
//     // Implement your specific mint address extraction logic
//     const mintMatch = log.match(/Mint: ([A-Za-z0-9]{32,})/);
//     return mintMatch ? mintMatch[1] : null;
//   }

//   // Cleanup method
//   async disconnect(): Promise<void> {
//     await this.prisma.$disconnect();
//   }
// }

// // Example usage
// const initializeTracker = async () => {
//   const tracker = new MemeTokenTracker(
//     "https://api.mainnet-beta.solana.com",
//     console // Replace with proper logger
//   );

//   await tracker.initialize();
//   await tracker.subscribeToLogs();

//   // Make sure to call this when shutting down
//   // await tracker.disconnect();
// };
