import axios from 'axios';

interface SwapRequest {
    inputToken: string;
    outputToken: string;
    amount: number;
    slippage: number;
    userAddress: string;
}

interface SwapResponse {
    transactionId: string;
    status: string;
}

export class JupiterSwapService {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    public async swapToken(request: SwapRequest): Promise<SwapResponse> {
        try {
            const response = await axios.post(`${this.apiUrl}/swap`, {
                inputToken: request.inputToken,
                outputToken: request.outputToken,
                amount: request.amount,
                slippage: request.slippage,
                userAddress: request.userAddress,
            });

            return {
                transactionId: response.data.transactionId,
                status: response.data.status,
            };
        } catch (error) {
            console.error('Error during token swap:', error);
            throw new Error('Failed to swap tokens');
        }
    }
}