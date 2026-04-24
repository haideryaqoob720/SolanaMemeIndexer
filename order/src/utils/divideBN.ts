import { BN } from "@coral-xyz/anchor";
export function divideBN(
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
            if (testMod.length < decimals) {
                inDecimals = parseInt(testMod) / Math.pow(10, decimals);
            }
        }
        let dividedStr: string;
        if (inDecimals) {
            dividedStr = inDecimals.toString();
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
    // let solInTx:any = args.data.max_quote_amount_in;
    // solInTx = solInTx.divmod(new BN(LAMPORTS_PER_SOL))
    // solInTx = parseFloat(`${solInTx.div.toNumber()}.${solInTx.mod.toNumber()}`).toFixed(8)
}
