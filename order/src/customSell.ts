import { sendSellTransaction } from "./onChain/sell/sell";
import { pumpSwapSell } from "./sniperSell/pumpswapSell";

// async function customSell() {
//     const result = await pumpSwapSell(
//         orderData.mint,
//         orderData.priceInSol,
//         orderData.priceInSol * orderData.solPrice,
//         orderData.solPrice,
//         orderData.order,
//         orderData.market,
//         orderData.isQuoteSol,
//         orderData.isWithdraw,
//     );
// }
const order = {
    mint: "QzF3WipATSzrjbRTMk2yu8xtMaZCD9sCAjC3mzFpump",
    priceInSol: 0.0000009295,
    solPrice: 158,
    market: "EynCRWv3Kkh1i59pt7Dk1Sm8YrDTHaHPFS8zV2cyyPhM",
    isQuoteSol: false,
    isWithdraw: false,
    order: {
        buyTime: 1752593194550,
        mint: "QzF3WipATSzrjbRTMk2yu8xtMaZCD9sCAjC3mzFpump",
        strategyId: 53,
        userId: 35,
        decimals: 6,
        dex: "PumpSwap",
        route: "Native",
        txFees: 0.0001,
        keypair: {
            public: "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z",
            private:
                "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY",
        },
        isOnChain: true,
        orderAmountInUsd: 0.2,
        buyingPrice: 0.00007482337914727347,
        initialPrice: {
            sol: { actual: 4.7216116077032547e-7, estimated: null },
            usd: { actual: 0.00007482337914727347, estimated: null },
        },
        finalPrice: {
            sol: { actual: null, estimated: null },
            usd: { actual: null, estimated: null },
        },
        buyAmount: {
            sol: { estimated: 0.001262068, actual: 0.001262068 },
            usd: { estimated: 0.2, actual: 0.2 },
        },
        sellAmount: {
            sol: { estimated: null, actual: null },
            usd: { estimated: null, actual: null },
        },
        takeProfitPrice: 0.00011971740663563758,
        sellTime: null,
        status: "pending",
        stopLossPrice: 0.0000710822101899098,
        tokenBuyAmount: { actual: 2397290768, estimated: null },
        tokenSellAmount: { actual: null, estimated: null },
        buyTxHash:
            "u9kRPgDrtefGKx6jdA6WsXyxD5fmWvvDzQtJW1sByf3NbynJscNTEseuHACFS2Tp4SXtaqa7C3E6nz7kXkKJHme",
        sellTxHash: null,
    },
};

// customSell();

async function justSell() {
    const sellRes = await sendSellTransaction(
        "7KYGNWTGngJp3FnXZFE5P7hRMN9aUxSwiNbLSrY5R6Ls", //mint
        "EveRbgaUXnz59herLfvXuBSNvt7RwtTj2a9cZtFAqKW8", //market
        "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z",
        "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY",
        122283396,
        6,
        true,
        true,
        "PumpSwap",
        0.0000003684,
        true,
        false,
        0,
    );
}

justSell();
