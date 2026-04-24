import { sniperStrategies } from "@prisma/client";
import getRedisClient, { RedisCache } from "./store";
import { RedisClientType } from "redis";
import { getAllSniperStrategies } from "../db/getAllSniperStrategies";
import { ProcessedOrdersTracker } from "../pumpSwap/orderMap";
// import { Strategy } from "@meteora-ag/dlmm";

export interface metricsToCheck {
    liquidityAmount: number;
    top10HoldingPercentage: number;
    market_cap: number;
    volume: number;
    total_tx: number;
    totalHolders: number;
}
export interface socialMetrics {
    hasTelegram: boolean;
    hasWebsite: boolean;
    hasSocials: boolean;
}

export class SniperStrategyStore {
    private key = "sniperStrategies";
    private client: RedisClientType;
    private tokenMap: RedisCache | null = null;
    private tracker: ProcessedOrdersTracker;

    constructor(client: RedisClientType) {
        this.client = client;
        this.tracker = ProcessedOrdersTracker.getInstance();
    }
    async initializeStore() {
        this.tokenMap = await getRedisClient();
        const allStrategies = await getAllSniperStrategies();
        if (!allStrategies) {
            console.log("no Sniper strategies found");
            return;
        }
        await this.client.del(this.key);
        await Promise.all(
            allStrategies.map(async (strategy) => {
                if (strategy.id === 43 || strategy.id === 44) {
                    console.log(strategy, "initialize");
                }
                await this.createStrategy(strategy.id.toString(), strategy);
            }),
        );
        console.log("initialized sniper strategies cache");
    }
    async createStrategy(strategyId: string, data: sniperStrategies) {
        try {
            await this.client.hSet(
                this.key,
                strategyId.toString(),
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log(
                "error creating sniper strategy in cache: ",
                error.message,
            );
        }
    }
    async getStrategy(strategyId: string): Promise<sniperStrategies | null> {
        try {
            const data = await this.client.hGet(
                this.key,
                strategyId.toString(),
            );
            return data ? JSON.parse(data) : null;
        } catch (error: any) {
            console.log(
                "error getting sniper strategy in cache: ",
                error.message,
            );
            return null;
        }
    }
    async deleteStrategy(strategyId: string) {
        try {
            await this.client.hDel(this.key, strategyId.toString());
        } catch (error: any) {
            console.log(
                "error deleting sniper strategy in cache: ",
                error.message,
            );
        }
    }
    async getAllStrategies(): Promise<sniperStrategies[] | null> {
        try {
            const data = await this.client.hGetAll(this.key);
            const allStrategys: sniperStrategies[] = Object.entries(data).map(
                ([key, value]) => ({
                    ...JSON.parse(value),
                }),
            );
            return allStrategys;
        } catch (error: any) {
            console.log("error getting all tokens", error.message);
            return null;
        }
    }
    async updateStrategy(strategyId: string, data: sniperStrategies) {
        try {
            this.client.hSet(
                this.key,
                strategyId.toString(),
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log("Error updating strategy", error.message);
        }
    }

    async matchStrategies(
        metrics: metricsToCheck,
        mint: string,
        allStrategies: sniperStrategies[],
        existingMint: any,
    ): Promise<sniperStrategies[] | null> {
        try {
            // const allStrategies = await this.getAllStrategies();
            if (!allStrategies) {
                // console.log("no strategies found");
                return null;
            }
            const strategyResults = await Promise.all(
                allStrategies.map(async (strategy) => {
                    // if (strategy.id === 59) {
                    //     console.log(strategy, "match strategy");
                    // }
                    const hasOrder = this.tracker.isProcessed(
                        `${strategy.userId}:${strategy.id}:${mint}`,
                    );
                    //   await this.tokenMap?.getActiveOrder(
                    //     mint,
                    //     strategy.userId.toString(),
                    //     strategy.id.toString(),
                    // );
                    if (hasOrder) {
                        // console.log(
                        //     "has order",
                        //     `${strategy.userId}:${strategy.id}:${mint}`,
                        // );
                        return { strategy, include: false };
                    }
                    let allMetricsPassed: boolean = true;
                    for (const metricKey of Object.keys(metrics) as Array<
                        keyof metricsToCheck
                    >) {
                        const strategyValue = strategy[metricKey];
                        const tokenMetric = metrics[metricKey];
                        if (metricKey === "top10HoldingPercentage") {
                            if (
                                metrics.top10HoldingPercentage >
                                strategy.top10HoldingPercentage
                            ) {
                                allMetricsPassed = false;
                                break;
                            }
                        } else if (metricKey === "totalHolders") {
                        } else {
                            if (
                                strategyValue === null ||
                                strategyValue === undefined ||
                                strategyValue > tokenMetric
                            ) {
                                // if (strategy.id === 53 || strategy.id === 43) {
                                if (strategy.id === 95) {
                                    console.log(
                                        strategyValue,
                                        tokenMetric,
                                        metricKey,
                                        strategy.id,
                                        mint,
                                        "metrics not passed",
                                    );
                                }
                                allMetricsPassed = false;
                                break;
                            }
                        }
                    }
                    const meetsSocialsCriteria: boolean = this.compareSocials(
                        strategy.hasSocials,
                        strategy.hasTelegram,
                        strategy.hasWebsite,
                        existingMint.socials,
                    );
                    const meetsTokenSupplyCriteria: boolean = // compare mintable and freezeable requirements
                        this.compareTokenActivityControls(
                            strategy.mintable,
                            strategy.freezeable,
                            existingMint.mintable,
                            existingMint.freezeable,
                        );
                    if (!meetsSocialsCriteria) {
                        // if (strategy.id === 95) {
                        //     console.log(`socials not met for ${strategy.id}`, {
                        //         socials: strategy.hasSocials,
                        //         telegram: strategy.hasTelegram,
                        //         website: strategy.hasWebsite,
                        //         token: existingMint.socials,
                        //     });
                        // }
                        allMetricsPassed = false;
                        // console.log("socials not passed");
                    }
                    if (!meetsTokenSupplyCriteria) {
                        // console.log("token supply not met");
                        allMetricsPassed = false;
                        // console.log("token supply not passed");
                    }
                    // if (
                    //     metrics.top10HoldingPercentage >
                    //     strategy.top10HoldingPercentage
                    // ) {
                    //     // console.log(
                    //     //     "top 10 doesnt match",
                    //     //     `token t10 ${metrics.top10HoldingPercentage} > strategy t10 ${strategy.top10HoldingPercentage}`,
                    //     // );
                    //     allMetricsPassed = false;
                    // }
                    if (allMetricsPassed) {
                        // await this.tokenMap?.addActiveOrder(
                        //     mint,
                        //     strategy.userId.toString(),
                        //     strategy.id.toString(),
                        // );
                        // console.log(
                        //     "locked",
                        //     `${strategy.userId}:${strategy.id}:${mint}`,
                        // );
                        if (strategy.id === 95) {
                            console.log(
                                `Strategy ${strategy.id} matched - All metrics passed`,
                                {
                                    strategy: strategy,
                                    metrics: metrics,
                                    socials: existingMint.socials,
                                    mintable: {
                                        strategy: strategy.mintable,
                                        token: existingMint.mintable,
                                    },
                                    freezeable: {
                                        strategy: strategy.freezeable,
                                        token: existingMint.freezeable,
                                    },
                                },
                            );
                        }
                        return { strategy, include: true };
                    }

                    return { strategy, include: false };
                }),
            );

            const filteredStrategies = strategyResults
                .filter((result) => result.include)
                .map((result) => result.strategy);
            return filteredStrategies;
        } catch (error: any) {
            console.log("error filtering strategies", error.message);
            return null;
        }
    }
    private compareTokenActivityControls(
        mintable: boolean,
        freezeable: boolean,
        isTokenMintable: boolean,
        isTokenFreezeable: boolean,
    ): boolean {
        let passes: boolean = true;
        passes = mintable ? true : mintable === isTokenMintable;
        passes = freezeable ? true : freezeable === isTokenFreezeable;
        return passes;
    }
    private compareSocials(
        hasSocials: boolean | null,
        hasTelegram: boolean | null,
        hasWebsite: boolean | null,
        socials: string[],
    ): boolean {
        let passes: boolean = false;
        const currentMetrics = this.extractSocials(socials);
        const telegramPasses = !hasTelegram
            ? true
            : currentMetrics.hasTelegram === hasTelegram;
        // hasTelegram === null ||currentMetrics.hasTelegram === hasTelegram;
        const websitePasses = !hasWebsite
            ? true
            : currentMetrics.hasWebsite === hasWebsite;
        // hasWebsite === null || currentMetrics.hasWebsite === hasWebsite;
        const socialsPasses = !hasSocials
            ? true
            : currentMetrics.hasSocials === hasSocials;
        // hasSocials === null || currentMetrics.hasSocials === hasSocials;
        if (telegramPasses && websitePasses && socialsPasses) {
            passes = true;
        }
        // if (!passes) {
        //     console.log({
        //         hasSocials: {
        //             strategy: hasSocials,
        //             token: currentMetrics.hasSocials,
        //         },
        //         hasTelegram: {
        //             strategy: hasTelegram,
        //             token: currentMetrics.hasTelegram,
        //         },
        //         hasWebsite: {
        //             strategy: hasWebsite,
        //             token: currentMetrics.hasWebsite,
        //         },
        //         socials: socials,
        //     });
        // }
        return passes;
    }
    private extractSocials(tokenSocials: string[]): socialMetrics {
        const websiteUrlRegex =
            /^(https?:\/\/)?(www\.)?(?!(?:www\.)?(twitter\.com|x\.com|telegram\.org|t\.me|reddit\.com)(?:\/|$))([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
        const telegramUrlRegex =
            /^(https?:\/\/)?(www\.)?t(\.me|elegram\.(me|org))(\/[^\s]*)?$/i;
        const socialMediaRegex =
            /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com|reddit\.com|facebook\.com|tiktok\.com|instagram\.com|linkedin\.com|youtube\.com|discord\.gg)\/[^\s]*$/i;
        let socialMetrics: socialMetrics = {
            hasTelegram: false,
            hasWebsite: false,
            hasSocials: false,
        };
        if (tokenSocials.length > 0) {
            // socialMetrics.hasSocials = true;
            tokenSocials.forEach((social) => {
                if (
                    !socialMetrics.hasTelegram &&
                    telegramUrlRegex.test(social)
                ) {
                    socialMetrics.hasTelegram = true;
                }
                if (!socialMetrics.hasWebsite && websiteUrlRegex.test(social)) {
                    socialMetrics.hasWebsite = true;
                }
                if (
                    !socialMetrics.hasSocials &&
                    socialMediaRegex.test(social)
                ) {
                    socialMetrics.hasSocials = true;
                }
            });
        }
        return socialMetrics;
    }
}

let sniperStrategyCache: SniperStrategyStore | null = null;

async function getSniperStrategyStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!sniperStrategyCache) {
        sniperStrategyCache = new SniperStrategyStore(client);
        await sniperStrategyCache.initializeStore();
    }
    return sniperStrategyCache;
}

export default getSniperStrategyStore;
