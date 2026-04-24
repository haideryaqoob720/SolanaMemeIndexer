export const calculatePrice = (reserve_sol:number, reserve_token:number):number=>{
    const result = reserve_sol / reserve_token; 
    return result;
}

export const calculateTDV = (reserve_sol:number, reserve_token:number, solPrice:number)=>{
    const token_price = reserve_sol/reserve_token
    const result = reserve_sol * solPrice + reserve_token * token_price; 
    return result;
}