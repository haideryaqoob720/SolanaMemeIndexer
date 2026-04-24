export function formatFloatWithSubtext(numStr: string) {
  // const numStr = num.toString();
  const [whole, decimal] = numStr.split(".");

  if (!decimal) return numStr;

  const leadingZeros = decimal.match(/^0+/)?.[0]?.length || 0;
  if (leadingZeros === 0) return numStr;

  const remainingDecimals = decimal.slice(leadingZeros);
  return `${whole}.0${
    leadingZeros > 0 ? `₍${toSubscript(leadingZeros)}₎` : ""
  }${remainingDecimals}`;
}

// Convert numbers to subscript
function toSubscript(num: number) {
  const subscripts: any = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
  };
  return num
    .toString()
    .split("")
    .map((char: string) => subscripts[char])
    .join("");
}
