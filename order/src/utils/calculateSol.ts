import { Decimal } from "decimal.js";
Decimal.config({
    precision: 40,
    toExpNeg: -18,
    toExpPos: 18,
    rounding: Decimal.ROUND_DOWN,
});

export function calculateSolReceived(
    tokenAmount: number | string,
    tokenPrice: number | string,
): number {
    try {
        console.log(tokenAmount, tokenPrice, "calculateSolReceived");
        const tokenAmountDecimal = new Decimal(tokenAmount.toString());
        const tokenPriceDecimal = new Decimal(tokenPrice.toString());
        const solReceived = tokenAmountDecimal.mul(tokenPriceDecimal);
        const solReceivedNumber = solReceived.toNumber();
        if (!Number.isFinite(solReceivedNumber)) {
            throw new Error(
                "Calculated SOL amount exceeds JavaScript number precision limits",
            );
        }
        return solReceivedNumber;
    } catch (error: any) {
        throw new Error(`Failed to calculate SOL received: ${error.message}`);

        return 0;
    }
}

export function multiplyPrecise(
    a: number | string,
    b: number | string,
    options?: {
        decimalPlaces?: number;
        roundingMode?: Decimal.Rounding;
    },
): number {
    try {
        const aDecimal = new Decimal(a.toString());
        const bDecimal = new Decimal(b.toString());
        let result = aDecimal.mul(bDecimal);
        if (options?.decimalPlaces !== undefined) {
            result = result.toDecimalPlaces(
                options.decimalPlaces,
                options.roundingMode ?? Decimal.ROUND_HALF_UP,
            );
        }
        const resultNumber = result.toNumber();
        if (!Number.isFinite(resultNumber)) {
            throw new Error(
                "Multiplication result exceeds JavaScript number precision limits",
            );
        }
        return resultNumber;
    } catch (error: any) {
        throw new Error(`Failed to multiply with precision: ${error.message}`);
    }
}
