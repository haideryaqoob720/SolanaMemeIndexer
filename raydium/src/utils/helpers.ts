import BN from "bn.js"

export const extractValues = <T extends Record<string, string>, K extends keyof T>(
  array: T[],
  key: K
): string[] => {
  return array.map(item => item[key]);
};



export const divideBN = (number:string, divisor:string):string => {
  try {  
    const num:BN = new BN(number)
    const div:BN = new BN(divisor)
    const result = num.divmod(div)
    return `${result.div.toString()}.${result.mod.toString()}`
  } catch (error:any) {
    console.log("error dividing bn", error.message)
    return "0.0"
  }
}