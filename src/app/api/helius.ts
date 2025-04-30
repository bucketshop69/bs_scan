import { HeliusParsedTransaction } from "../../types/helius";
import { isSpamTransaction } from "../constants";

// API key and endpoints
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || "dbf616dd-1870-4cdb-a0d2-754ae58a64f0"; // In production, use environment variables

// Helius Transactions API endpoint
export const HELIUS_PARSE_URL = `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`;

// Helius Address Transactions API endpoint
export const HELIUS_ADDRESS_URL = `https://api.helius.xyz/v0/addresses`;

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

/**
 * Fetches parsed transactions for a specific address
 * @param address The Solana address to fetch transactions for
 * @param limit Optional limit of transactions to return (default: 10)
 * @param before Optional signature to fetch transactions before (for pagination)
 * @returns An object containing the parsed transactions or error
 */
export async function fetchAddressTransactions(address: string, limit: number = 10, before?: string) {
    // Default return values
    let transactions: HeliusParsedTransaction[] = [];
    let error: string | null = null;

    try {
        // Get a higher limit to compensate for filtered spam
        // We need to fetch more transactions because we might filter out many spam ones
        // Allow up to 200 for larger requests
        const fetchLimit = Math.min(limit * 2, 200);

        // Build the URL with query parameters
        let url = `${HELIUS_ADDRESS_URL}/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=${fetchLimit}`;

        // Add before parameter if provided (for pagination)
        if (before) {
            url += `&before=${before}`;
        }

        console.log('Fetching address transactions from Helius API:', url);

        const apiResponse = await fetch(url);

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Helius API Error Response:', errorText);
            throw new Error(`Helius API returned ${apiResponse.status}: ${apiResponse.statusText}. ${errorText}`);
        }

        const apiData = await apiResponse.json();

        if (apiData && apiData.length > 0) {
            console.log('Helius API Response (first transaction):', apiData);
            console.log(`Received ${apiData.length} transactions from API`);
        }

        // Check if we got valid parsed data from Helius API
        if (apiData && Array.isArray(apiData)) {
            // Filter out spam transactions
            const filteredTransactions = apiData.filter(tx => !isSpamTransaction(tx));

            // Log stats for monitoring
            console.log(`Filtered out ${apiData.length - filteredTransactions.length} spam transactions`);
            console.log(`Returning ${Math.min(filteredTransactions.length, limit)} transactions`);

            // We want to return exactly 'limit' transactions if possible
            // But ensure we have at least 1 transaction to make progress with pagination
            if (filteredTransactions.length > 0) {
                transactions = filteredTransactions.slice(0, Math.max(limit, 1));
            }
        } else {
            console.warn('Helius API returned empty or invalid data');
            throw new Error("No transaction data found for this address");
        }
    } catch (err) {
        // Handle any errors during fetch
        console.error("Error fetching address transactions:", err);
        error = `${err instanceof Error ? err.message : 'Unknown error'}`;
    }

    // Return the data
    return {
        transactions,
        error
    };
}

/**
 * Interface for a funding transfer
 */
interface FundingTransfer {
    signature: string;
    timestamp: number;
    amount: number;
    type: 'SOL' | 'Token';
    mint?: string;
}

/**
 * Interface for a funding source
 */
export interface FundingSource {
    address: string;
    totalSol: number;
    tokenTransfers: Record<string, number>;
    transactions: FundingTransfer[];
    lastTimestamp: number;
}

/**
 * Fetches and processes funding sources for an address
 * @param address The Solana address to fetch funding sources for
 * @param limit Optional limit of transactions to analyze (default: 30)
 * @param before Optional signature to fetch transactions before (for pagination)
 * @returns An object containing the grouped funding sources and any error
 */
export async function fetchAddressFundingSources(
    address: string,
    limit: number = 30,
    before?: string
) {
    // Default return values
    let fundingSources: FundingSource[] = [];
    let error: string | null = null;

    try {
        // First fetch transactions using existing function
        // Use the provided limit
        const { transactions, error: txError } = await fetchAddressTransactions(
            address,
            limit,
            before
        );

        if (txError) throw new Error(txError);

        // Group by source address
        const sourceGroups: Record<string, FundingSource> = {};

        // Process each transaction
        transactions.forEach(tx => {
            // Check if this is a program interaction (complex transaction) vs. direct transfer
            // Program interactions typically have multiple instructions or specific types
            const isProgramInteraction =
                (tx.instructions && tx.instructions.length > 1) || // Multiple instructions
                tx.type === 'SWAP' ||                            // Swap transaction
                tx.type === 'STAKE' ||                           // Staking transaction
                tx.type === 'NFT_SALE' ||                        // NFT transaction
                tx.type === 'BURN' ||                            // Token burn
                tx.type === 'INITIALIZE' ||                      // Initialization
                (tx.events && Object.keys(tx.events).length > 0); // Has events from program execution

            // Skip program interactions
            if (isProgramInteraction) {
                console.log(`Skipping program interaction tx: ${tx.signature} of type ${tx.type}`);
                return;
            }

            // Check SOL transfers - only for direct transfers
            tx.nativeTransfers?.forEach(transfer => {
                if (transfer.toUserAccount === address && transfer.amount > 10000) { // Filter dust (<0.00001 SOL)
                    const source = transfer.fromUserAccount;

                    if (!sourceGroups[source]) {
                        sourceGroups[source] = {
                            address: source,
                            totalSol: 0,
                            tokenTransfers: {},
                            transactions: [],
                            lastTimestamp: 0
                        };
                    }

                    sourceGroups[source].totalSol += transfer.amount;
                    sourceGroups[source].transactions.push({
                        signature: tx.signature,
                        timestamp: tx.timestamp,
                        amount: transfer.amount,
                        type: 'SOL'
                    });

                    if (tx.timestamp > sourceGroups[source].lastTimestamp) {
                        sourceGroups[source].lastTimestamp = tx.timestamp;
                    }
                }
            });

            // Check token transfers - only for direct token transfers
            if (tx.type === 'TOKEN_TRANSFER' || tx.type === 'TRANSFER') {
                tx.tokenTransfers?.forEach(transfer => {
                    if (transfer.toUserAccount === address) {
                        const source = transfer.fromUserAccount;

                        if (!sourceGroups[source]) {
                            sourceGroups[source] = {
                                address: source,
                                totalSol: 0,
                                tokenTransfers: {},
                                transactions: [],
                                lastTimestamp: 0
                            };
                        }

                        if (!sourceGroups[source].tokenTransfers[transfer.mint]) {
                            sourceGroups[source].tokenTransfers[transfer.mint] = 0;
                        }

                        sourceGroups[source].tokenTransfers[transfer.mint] += transfer.tokenAmount;
                        sourceGroups[source].transactions.push({
                            signature: tx.signature,
                            timestamp: tx.timestamp,
                            amount: transfer.tokenAmount,
                            type: 'Token',
                            mint: transfer.mint
                        });

                        if (tx.timestamp > sourceGroups[source].lastTimestamp) {
                            sourceGroups[source].lastTimestamp = tx.timestamp;
                        }
                    }
                });
            }
        });

        // Sort sources by most recent activity
        fundingSources = Object.values(sourceGroups)
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    } catch (err) {
        console.error("Error processing funding sources:", err);
        error = `${err instanceof Error ? err.message : 'Unknown error'}`;
    }

    return {
        fundingSources,
        error
    };
} 