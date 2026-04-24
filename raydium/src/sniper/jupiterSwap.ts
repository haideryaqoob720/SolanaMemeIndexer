import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

interface SwapParams {
    inputMint: string;
    outputMint: string;
    amount: string; // amount in smallest units (e.g., lamports)
    slippageBps: number; // slippage in basis points
    userPublicKey: string;
}

interface quoteResponse{
    priceSol:number;
    inAmount:number;
    outAmount:string;
    inToken:string;
    outToken:string;
  }

interface SwapRoute {
    // Define route structure as needed
    inAmount: string;
    outAmount: string;
    // priceImpactPct: number;
    // ...other fields from Jupiter API
}

export class JupiterSwap {
    private readonly apiUrl = 'https://quote-api.jup.ag/v6';

    async getRoutes(params: SwapParams): Promise<any> {
        // console.log(params)
        const { inputMint, outputMint, amount, slippageBps, userPublicKey } = params;
        const url = `${this.apiUrl}/quote`;
        const response = await axios.get(url, {
            params: {
                inputMint,
                outputMint,
                amount,
                slippageBps,
                // userPublicKey,
            },
        });
        // console.log()
        // const quoteResponse = await (
        //     await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}\
        //   &outputMint${outputMint}\
        //   &amount=${amount}\
        //   &slippageBps=${slippageBps}`
        //     )
        //   ).json();
        console.log(response.data)
        return response.data;
        // return quoteResponse
    }

    async swap(publicKey:string, quoteResponse: any): Promise<any> {
        const url = `${this.apiUrl}/swap`;
        // const response = await axios.post(url, {
        //     route,
        //     userPublicKey: publicKey,
        //     wrapUnwrapSOL: true,
        // },{
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }
        // });
        // return response.data;
        const  swapTransaction  = await (
            await fetch('https://quote-api.jup.ag/v6/swap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                quoteResponse,
                userPublicKey: publicKey,
                wrapAndUnwrapSol: true,
              })
            })
          ).json();
          console.log(swapTransaction, "swap Res")
    }

    /**
     * Test the Jupiter API and log the call and response times.
     */
    async testApi(params: SwapParams, decimals:number): Promise<number | undefined> {
        const callTime = new Date();
        console.log('API call time:', callTime.toISOString());

        try {
            const route = await this.getRoutes(params);
            // console.log(route, "routes")
            // const swap = await this.swap(params.userPublicKey, route)
            const responseTime = new Date();
            const price = (route.inAmount/LAMPORTS_PER_SOL)/(route.outAmount/Math.pow(10, decimals))
            return price
            console.log('API response time:', responseTime.toISOString());
        } catch (error:any) {
            const errorTime = new Date();
            console.log('API error time:', errorTime.toISOString());
            console.error('Error:', error.message);
        }
    }
}