import { config } from "../config";
import { realTimeTokenMetrics } from "../types";
import {BN} from "@coral-xyz/anchor"
export const extractValues = <T extends Record<string, string>, K extends keyof T>(
  array: T[],
  key: K
): string[] => {
  return array.map(item => item[key]);
};


type dexType = "pumpFun" | "raydium"

export const logRealTimeMetrics = (mint:string, data:realTimeTokenMetrics, dex:dexType) =>{
  const log = process.env.DEBUG 
  if(log === 'false'){
    return
  }
    
    console.log(`data for ${mint} on ${dex}`)
    console.log(data)
}


export const addBN = (firstNumber:BN, secondNumber:BN, test?:boolean)=>{
  const result:BN = firstNumber.add(secondNumber)
  if(test){
    const testRes:number = firstNumber.toNumber() + secondNumber.toNumber()
    console.log({
      testres: testRes,
      first: firstNumber.toNumber(),
      second: secondNumber.toNumber(),
      resultBN: result,
      result: result.toString(10)
    })
  }
  return result
}

export function convertToBN(number:string | number):BN{
  try {
    const strValue = typeof number === 'number' ? number.toString(10) : number;    
    if (strValue.includes('.')) {
      const [integerPart, decimalPart] = strValue.split('.');
      return new BN(integerPart, 10);
    }
    return new BN(strValue, 10)
  } catch (error:any) {
    console.log("error converting", number, error.message)
    return new BN(1)
  }
}

export function convertBnToString(number:BN):string{
  return number.toString(10)
}


// export function monitorLog(mint:string, fn:()=>void){
//   if(mint === config.monitorToken){
//     fn()
//   }
// }


export const timeTaken = (start:number, end:number, message?:string, step?:string) => {
  let timeTaken:number = end - start;
  const timeInSec = formatTimeMinSec(timeTaken/1000)
  const info = {
    step: step,
    start: start,
    end: end,
    timeTaken: timeTaken,
    seconds: timeInSec
  }
  console.log(info,message)
}
const formatTimeMinSec = (timeTaken: number): string => {
  // Handle invalid inputs
  if (timeTaken < 0 || !Number.isFinite(timeTaken)) {
    throw new Error('Time value must be a positive finite number');
  }
  
  // Calculate minutes and seconds
  const minutes: number = Math.floor(timeTaken / 60);
  const seconds: number = Math.floor(timeTaken % 60);
  
  // Format the output string
  const minutesText: string = minutes === 1 ? 'min' : 'mins';
  const secondsText: string = seconds === 1 ? 'sec' : 'secs';
  
  // Handle special cases for cleaner output
  if (minutes === 0) {
    return `${seconds} ${secondsText}`;
  } else if (seconds === 0) {
    return `${minutes} ${minutesText}`;
  } else {
    return `${minutes} ${minutesText} ${seconds} ${secondsText}`;
  }
};