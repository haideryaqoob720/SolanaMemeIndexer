import { BN } from "bn.js";
export function calculateQuoteFromMaxQuote(
    maxQuoteAmount: BN,
    slippage: number, // 1 => 1%
): BN {
    // --- Basic Validations ---
    if (slippage < 0) {
        throw new Error("Slippage cannot be negative.");
    }
    if (maxQuoteAmount.isNeg()) {
        throw new Error("Max quote amount cannot be negative.");
    }

    // --- Reverse Slippage Calculation ---
    // To avoid floating-point inaccuracies with BN.js, we work with a large integer precision.
    // We calculate totalQuote = maxQuoteAmount / (1 + slippage / 100)
    // This is equivalent to: (maxQuoteAmount * precision) / ( (1 + slippage/100) * precision )

    const precision = new BN(1_000_000_000); // Using a large number for precision

    // Calculate the slippage factor as an integer
    const slippageFactorFloat = (1 + slippage / 100) * 1_000_000_000;
    const slippageFactor = new BN(Math.floor(slippageFactorFloat));

    // If slippage is 0, the factor is exactly the precision, and quote amount is the max quote amount.
    if (slippageFactor.isZero()) {
        return maxQuoteAmount;
    }

    // totalQuote = (maxQuoteAmount * precision) / slippageFactor
    const totalQuote = maxQuoteAmount.mul(precision).div(slippageFactor);

    return totalQuote;
}
