import {
    HttpProvider,
    Config,
    GetJupiterQuotesRequest,
    GetRaydiumQuotesRequest,
} from "@bloxroute/solana-trader-client-ts";
import { config } from "../config";
import axios from "axios";
import { divideBN } from "../utils/helpers";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RateLimiter } from "limiter";

interface quoteResponse {
    priceSol: number;
    inAmount: number;
    outAmount: string;
    inToken: string;
    outToken: string;
}

export class BloXRouteWrapper {
    private client: HttpProvider;
    private baseUrl: string;
    private bloxQuoteUrl: string =
        "https://ny.solana.dex.blxrbdn.com/api/v2/raydium/quotes";
    private bloxSwapUrl: string =
        "https://ny.solana.dex.blxrbdn.com/api/v2/raydium/swap";
    private bloxJupiterUrl: string =
        "https://ny.solana.dex.blxrbdn.com/api/v2/jupiter/quotes";
    private bloxSwapJupiterUrl: string =
        "https://ny.solana.dex.blxrbdn.com/api/v2/jupiter/swap";
    private authHeader: string;
    private limiter: RateLimiter;

    constructor(authHeader: string, publicKey?: string, privateKey?: string) {
        const configuration: Config = {
            authHeader: authHeader,
            privateKey: privateKey || "",
            publicKey: publicKey || "",
        };
        this.authHeader = authHeader;
        this.client = new HttpProvider(
            configuration.authHeader,
            configuration.publicKey,
            configuration.privateKey,
        );
        this.limiter = new RateLimiter({
            tokensPerInterval: 10,
            interval: "second",
        });
        this.baseUrl = config.bloxBaseUrl;
    }
    private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
        await this.limiter.removeTokens(1);
        return await fn();
    }

    public async initialize(): Promise<void> {}

    public disconnect(): void {
        // this.client.disconnect();
    }

    public getClient(): HttpProvider {
        return this.client;
    }

    public async getQuote(
        mint: string,
        inAmount: number,
        isBuy: boolean,
        dex: "Raydium" | "Jupiter",
    ) {
        try {
            if (dex === "Raydium") {
                const request: GetRaydiumQuotesRequest = {
                    inToken: isBuy ? mint : config.solMint.toBase58(),
                    outToken: isBuy ? config.solMint.toBase58() : mint,
                    inAmount: inAmount,
                    slippage: 1000,
                };
                return await this.client.getRaydiumQuotes(request);
                // } catch (error:any) {
                //     console.log(`error getting quote from ${dex}`, error.message)
                // }
            }

            if (dex === "Jupiter") {
                // try{
                const request: GetJupiterQuotesRequest = {
                    inToken: isBuy ? mint : config.solMint.toBase58(),
                    outToken: isBuy ? config.solMint.toBase58() : mint,
                    inAmount: inAmount,
                    slippage: 1000,
                };
                const res = await this.client.getJupiterQuotes(request);
                console.log(res, "quote <------------------------------------");
                // return await this.client.getJupiterQuotes(request)
            }
        } catch (error: any) {
            console.log(`error getting quote from ${dex}`, error.message);
        }
    }

    public async getQuoteApi(
        mint: string,
        decimals: number,
        inAmount: number,
        isBuy: boolean,
        maxRetries: number = 3,
        delayMs: number = 2000,
    ): Promise<quoteResponse | null> {
        // Helper function for delay between retries
        const delay = (ms: number): Promise<void> => {
            return new Promise((resolve) => setTimeout(resolve, ms));
        };

        // Function to fetch quote that will be retried
        const fetchQuote = async (): Promise<quoteResponse | null> => {
            try {
                const url: string = `${this.baseUrl}/quotes`;
                console.log(url, "url");
                const blox = await axios.get(url, {
                    headers: {
                        Authorization: this.authHeader,
                    },
                    params: {
                        inToken: isBuy ? config.solMint.toBase58() : mint,
                        outToken: isBuy ? mint : config.solMint.toBase58(),
                        inAmount: inAmount,
                        slippage: 1000,
                    },
                });

                console.log(blox.data, blox.data.routes);

                if (!blox.data?.routes || blox.data.routes.length === 0) {
                    console.log("No routes found in response");
                    return null;
                }

                const amountInSol = inAmount / LAMPORTS_PER_SOL;
                const tokenAmount =
                    blox.data.routes[0].outAmount * Math.pow(10, decimals);
                console.log(
                    amountInSol,
                    tokenAmount,
                    decimals,
                    "calculate price blox",
                );
                const res: quoteResponse = {
                    inAmount: inAmount,
                    outAmount: blox.data.routes[0].outAmount,
                    inToken: blox.data.inTokenAddress,
                    outToken: blox.data.outTokenAddress,
                    priceSol: inAmount / tokenAmount,
                };
                return res;
            } catch (error: any) {
                console.log("Error fetching blox quote: ", error.message);
                return null;
            }
        };

        // Execute with retries
        let retries = 0;
        while (retries <= maxRetries) {
            console.log(`Quote attempt ${retries + 1}/${maxRetries + 1}`);

            const quote = await fetchQuote();

            if (quote !== null) {
                return quote;
            }

            if (retries < maxRetries) {
                const currentDelay = delayMs * (retries + 1);
                console.log(
                    `Quote fetch failed, retrying after ${currentDelay}ms...`,
                );
                await delay(currentDelay);
                retries++;
            } else {
                console.log(`All ${maxRetries + 1} quote attempts failed`);
                return null;
            }
        }

        return null;
    }

    public async swapApi(
        mint: string,
        publicKey: string,
        inAmount: number,
        isBuy: boolean,
        fees?: number,
    ): Promise<{
        transaction: any;
        outAmount: number;
        outAmountMin: number;
    } | null> {
        console.log(
            {
                inToken: isBuy ? config.solMint.toBase58() : mint,
                outToken: isBuy ? mint : config.solMint.toBase58(),
                inAmount: inAmount,
                slippage: 10,
                ownerAddress: publicKey,
                // privateKey: privateKey
            },
            "input to swap",
        );

        return await this.fetchWithRateLimit(async () => {
            try {
                const url: string = `${this.baseUrl}/swap`;
                console.log(url, "url");
                // console.log(this.authHeader, "in blox")
                const response = await axios.post(
                    url,
                    {
                        inToken: isBuy ? config.solMint.toBase58() : mint,
                        outToken: isBuy ? mint : config.solMint.toBase58(),
                        inAmount: inAmount,
                        slippage: 10,
                        ownerAddress: publicKey,
                        computePrice: fees ?? 100000,
                        // privateKey: privateKey
                    },
                    {
                        headers: {
                            Authorization: this.authHeader,
                        },
                    },
                );
                console.log(response.data, "swap response");
                return {
                    transaction: response.data.transactions[0].content,
                    outAmount: response.data.outAmount,
                    outAmountMin: response.data.outAmountMin,
                };
            } catch (error) {
                console.error("Error during swap API call:", error);
                return null;
            }
        });
    }
}
