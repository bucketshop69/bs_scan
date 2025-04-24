/**
 * Basic mapping of common token mint addresses to their symbols
 * In a production app, this would be expanded or connected to an API
 */
export const TOKEN_MINTS: Record<string, { symbol: string, decimals: number }> = {
    'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', decimals: 6 },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', decimals: 5 },
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', decimals: 9 },
    'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ': { symbol: 'DUST', decimals: 9 },
    '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx': { symbol: 'GMT', decimals: 9 },
    'EPeUFDgHRxs9xxEPVaL6kfGQvCon7jmAWKVUHuux1Tpz': { symbol: 'BAT', decimals: 8 },
    'J7KzeAgcSWbAnLXQXiTfCy4gNa28YSRwiXJKE5dP51kS': { symbol: 'PUNK', decimals: 9 },
    // Add more tokens as needed
};

/**
 * Get token symbol and format amount based on mint address
 * @param mintAddress The token mint address
 * @param amount Raw token amount
 * @returns Formatted token amount with symbol
 */
export function formatTokenAmount(mintAddress: string, amount: number): string {
    const tokenInfo = TOKEN_MINTS[mintAddress];

    if (tokenInfo) {
        const formattedAmount = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(tokenInfo.decimals);
        return `${formattedAmount} ${tokenInfo.symbol}`;
    }

    // If token not in our mapping, return abbreviated format
    return `${amount.toLocaleString()} [${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}]`;
}

/**
 * Get token symbol from mint address
 * @param mintAddress The token mint address
 * @returns Token symbol or abbreviated address
 */
export function getTokenSymbol(mintAddress: string): string {
    const tokenInfo = TOKEN_MINTS[mintAddress];
    return tokenInfo ? tokenInfo.symbol : `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
} 