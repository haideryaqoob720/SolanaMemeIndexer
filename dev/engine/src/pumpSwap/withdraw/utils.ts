import { BN } from "@coral-xyz/anchor";

function divideBN(
    numerator: any,
    divisor: number | string,
    decimals: number,
    name?: string,
): number {
    try {
        const bnValue = new BN(numerator);
        const bnDivisor = new BN(divisor);
        const quotient = bnValue.div(bnDivisor);
        const remainder = bnValue.mod(bnDivisor);
        let testDiv = quotient.toNumber();
        let testMod = remainder.toString(10);
        let inDecimals: number | null = null;
        if (testDiv === 0) {
            // console.log(testMod, "testMod");
            // console.log(testMod, decimals);
            if (testMod.length < decimals) {
                inDecimals = parseInt(testMod) / Math.pow(10, decimals);
            }
        }
        let dividedStr: string;
        if (inDecimals) {
            dividedStr = inDecimals.toString();
            // console.log(dividedStr, "divided decimals");
            return parseFloat(dividedStr);
        }
        dividedStr = `${quotient.toNumber()}.${remainder.toNumber()}`;
        // console.log(dividedStr, "pumpswap");
        // console.log(parseFloat(dividedStr), "pumpswap");
        return parseFloat(dividedStr);
    } catch (error: any) {
        console.log(
            `error dividing ${name ?? numerator.toString()}`,
            error.message,
        );
        return 0;
    }
}

function subtractBN(a: BN, b: BN, decimals: number): number {
    // b should be larger than a
    const bnA = new BN(a);
    const bnB = new BN(b);
    const result = bnB.sub(bnA);
    return result.toNumber() / Math.pow(10, decimals);
}
export { divideBN, subtractBN };
