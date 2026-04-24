interface FormatConfig {
  threshold: number;
  divisor: number;
  suffix: string;
}

export function formatNumber(num: number): string {
  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Define the format configurations
  const formats: FormatConfig[] = [
    { threshold: 1e9, divisor: 1e9, suffix: "B" }, // Billions
    { threshold: 1e6, divisor: 1e6, suffix: "M" }, // Millions
    { threshold: 1e3, divisor: 1e3, suffix: "K" }, // Thousands
  ];

  // Find the appropriate format
  const format = formats.find((f) => absNum >= f.threshold);

  if (!format) {
    // If number is smaller than 1000, format to 2 decimal places
    const formattedValue = parseFloat(absNum.toFixed(2)).toString();
    return isNegative ? `-${formattedValue}` : formattedValue;
  }

  // Calculate the formatted value
  const value = absNum / format.divisor;

  // Format to max 2 decimal places and remove trailing zeros
  const formattedValue = parseFloat(value.toFixed(2)).toString();

  // Combine the parts
  return `${isNegative ? "-" : ""}${formattedValue}${format.suffix}`;
}
