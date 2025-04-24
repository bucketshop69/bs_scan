import { HeliusParsedTransaction } from "../types/helius";

// API key and endpoints
const HELIUS_API_KEY = "dbf616dd-1870-4cdb-a0d2-754ae58a64f0"; // In production, use environment variables

// Helius Transactions API endpoint
export const HELIUS_PARSE_URL = `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`;

export async function fetchTransactionDetails(signature: string) {
    // Default return values
    let heliusTxDetails: HeliusParsedTransaction | null = null;
    let error: string | null = null;

    try {
        // Fetch enhanced parsed data using Helius Parse API
        console.log('Fetching transaction data from Helius API...');
        const apiResponse = await fetch(HELIUS_PARSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transactions: [signature]
            })
        });

        // For debugging
        console.log('Helius API Request:', {
            url: HELIUS_PARSE_URL,
            body: { transactions: [signature] }
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Helius API Error Response:', errorText);
            throw new Error(`Helius API returned ${apiResponse.status}: ${apiResponse.statusText}. ${errorText}`);
        }

        const apiData = await apiResponse.json();
        console.log('Helius API Response:', apiData);

        // Check if we got valid parsed data from Helius API
        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            // Use the enhanced parsed data (first result)
            heliusTxDetails = apiData[0];
        } else {
            console.warn('Helius API returned empty or invalid data');
            throw new Error("No transaction data found");
        }
    } catch (err) {
        // Handle any errors during fetch
        console.error("Error fetching transaction:", err);
        error = `${err instanceof Error ? err.message : 'Unknown error'}`;
    }

    // Return the data
    return {
        heliusTxDetails,
        error
    };
} 