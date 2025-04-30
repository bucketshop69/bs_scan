"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    AccountInfo,
    ParsedAccountData,
    RpcResponseAndContext,
} from "@solana/web3.js";
import { useState, useEffect, useRef } from "react";
import { fetchAddressTransactions, FundingSource } from "../../api/helius";
import { SPAM_ADDRESSES } from "../../constants";
import { TOKEN_MINTS, getTokenSymbol } from "../../utils/tokenMapping";
import ConsoleMonitor from "../../components/ConsoleMonitor";
import { TimelineData } from "@/utils/timeline/types";
import { processTransactions, prepareActivityData, ActivityData, HeatmapValue } from "@/utils/timeline/processors";
import TimelineView from "@/components/timeline/TimelineView";
import { HeliusParsedTransaction } from "@/types/helius";
import ActivityCalendar from '@/components/timeline/ActivityCalendar';


// Configure the Solana connection - same endpoint as used in tx details
const rpcEndpoint = "https://mainnet.helius-rpc.com/?api-key=dbf616dd-1870-4cdb-a0d2-754ae58a64f0";
const connection = new Connection(rpcEndpoint);

// Token Program ID for SPL tokens
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// Define interfaces for token balances
interface TokenBalanceInfo {
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
    uiAmount: number;
}

// Define interface for transaction signatures
interface TransactionSignatureInfo {
    signature: string;
    slot: number;
    blockTime: number | null;
    err: object | null;
}

// Interface for parsed token account
interface ParsedTokenAccount {
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData>;
}

// Helper function to format SOL amount
const formatSOL = (lamports: number): string => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(9) + " SOL";
};

// Helper function to format timestamp to relative time
const formatTimeAgo = (timestamp: number): string => {
    const now = new Date();
    const txTime = new Date(timestamp * 1000); // Convert to milliseconds
    const diffInSeconds = Math.floor((now.getTime() - txTime.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
};

// Helper function to format token amount with proper decimals
const formatTokenAmount = (amount: number, decimals: number): string => {
    const divisor = Math.pow(10, decimals);
    return (amount / divisor).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
};

export default function AddressDetails() {
    const params = useParams();
    const addressId = params.id as string;

    // Phase 1: Validate and convert address
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [addressError, setAddressError] = useState<string | null>(null);

    // Phase 2: State variables for data
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [tokenBalances, setTokenBalances] = useState<TokenBalanceInfo[] | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<HeliusParsedTransaction[]>([]);
    const [accountType, setAccountType] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for funding sources with pagination
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [loadingFundingSources, setLoadingFundingSources] = useState<boolean>(false);

    // Infinite scroll state
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [lastSignature, setLastSignature] = useState<string | null>(null);

    // Add state to track spammed filtered
    const [spamFiltered, setSpamFiltered] = useState<number>(0);

    // Add new state for timeline data
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
    // Add state for activity calendar data
    const [activityData, setActivityData] = useState<HeatmapValue[] | null>(null);
    const [isLoadingMoreTx, setIsLoadingMoreTx] = useState<boolean>(false);
    const fetchedSignatures = useRef<Set<string>>(new Set());

    // Phase 1: Address validation
    useEffect(() => {
        // Reset error state
        setAddressError(null);

        // Basic validation: Check if address exists and has a reasonable length
        if (!addressId || addressId.trim() === '') {
            setAddressError("Invalid address: Address is empty");
            return;
        }

        // Convert address string to PublicKey object
        try {
            const pubKey = new PublicKey(addressId.trim());
            setPublicKey(pubKey);
        } catch (err) {
            setAddressError("Invalid address format");
        }
    }, [addressId]);

    // Phase 3: Data Fetching and Background Fetch
    useEffect(() => {
        if (!publicKey) {
            return;
        }

        const validPublicKey = publicKey;
        let isMounted = true; // Track component mount status

        // Reset states
        setIsLoading(true);
        setError(null);
        setSolBalance(null);
        setTokenBalances(null);
        setRecentTransactions([]);
        setAccountType(null);
        setLastSignature(null);
        // Keep hasMore = true initially for background fetch
        setHasMore(true);
        setFundingSources([]);
        setTimelineData(null);
        setActivityData(null);
        fetchedSignatures.current.clear(); // Clear fetched signatures on new address
        setIsLoadingMoreTx(false); // Reset background loading state

        async function fetchInitialData() {
            try {
                // Initial fetch for balance, tokens, first 50 txs
                const balancePromise = connection.getBalance(validPublicKey);
                const tokenAccountsPromise = connection.getParsedTokenAccountsByOwner(
                    validPublicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );
                const transactionsPromise = fetchAddressTransactions(validPublicKey.toString(), 50);
                const accountInfoPromise = connection.getAccountInfo(validPublicKey);
                // Fetch funding sources later if needed, or integrate into main tx processing

                const [balance, tokenAccountsResponse, { transactions, error: txError }, accountInfo] = await Promise.all([
                    balancePromise,
                    tokenAccountsPromise,
                    transactionsPromise,
                    accountInfoPromise
                ]);

                if (!isMounted) return; // Don't update state if component unmounted

                setSolBalance(balance);

                // Process tokens
                const processedTokenBalances = tokenAccountsResponse.value.map((account: ParsedTokenAccount) => {
                    const parsedInfo = account.account.data.parsed.info;
                    const mintAddress = parsedInfo.mint;
                    const tokenAmount = parsedInfo.tokenAmount;

                    return {
                        mint: mintAddress,
                        symbol: mintAddress.slice(0, 5) + "...", // Placeholder until we implement token list lookup
                        amount: tokenAmount.amount,
                        decimals: tokenAmount.decimals,
                        uiAmount: tokenAmount.uiAmount
                    };
                }).filter(token => Number(token.amount) > 0); // Filter out zero balances
                setTokenBalances(processedTokenBalances);

                // Process account type
                if (accountInfo) {
                    if (accountInfo.executable) {
                        setAccountType("Program Account");
                    } else {
                        setAccountType("Wallet");
                    }
                } else {
                    setAccountType("Unknown");
                }

                // Process initial transactions
                if (txError) {
                    console.error("Error fetching initial transactions:", txError);
                    setError("Failed to fetch initial transactions.");
                    setHasMore(false); // Stop background fetch if initial fails
                } else if (transactions && transactions.length > 0) {
                    transactions.forEach(tx => fetchedSignatures.current.add(tx.signature));
                    setRecentTransactions(transactions);
                    setLastSignature(transactions[transactions.length - 1].signature);

                    const processedData = processTransactions(transactions, validPublicKey.toString());
                    setTimelineData(processedData);
                    setActivityData(prepareActivityData(processedData));
                    setSpamFiltered(Math.max(0, 50 - transactions.length)); // Approx spam for first batch

                    // If we got less than 50, no need to fetch more
                    if (transactions.length < 50) {
                        setHasMore(false);
                    }

                } else {
                    setRecentTransactions([]);
                    setHasMore(false);
                }

            } catch (err) { // Catch errors from Promise.all or processing
                console.error("Error during initial data fetch:", err);
                if (isMounted) {
                    setError("Failed to fetch initial address data.");
                    setHasMore(false);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false); // Stop initial loading indicator
                }
            }
        }

        async function fetchRemainingDataInBackground(initialLastSig: string | null) {
            if (!isMounted || !hasMore || !initialLastSig) {
                if (isMounted) setIsLoadingMoreTx(false);
                return;
            }

            setIsLoadingMoreTx(true);
            let currentLastSig = initialLastSig;
            let accumulatedTransactions: HeliusParsedTransaction[] = [];
            let remainingToFetch = 150;
            let attempts = 0;
            const maxAttempts = 4; // Limit attempts to prevent infinite loops

            while (remainingToFetch > 0 && attempts < maxAttempts && isMounted) {
                attempts++;
                try {
                    const fetchBatchSize = Math.min(remainingToFetch, 50); // Fetch in batches of 50
                    const { transactions: batch, error: batchError } = await fetchAddressTransactions(
                        validPublicKey.toString(),
                        fetchBatchSize, // Fetch limit for this batch
                        currentLastSig
                    );

                    if (!isMounted) break; // Exit if unmounted during fetch

                    if (batchError) {
                        console.error(`Background fetch error (Attempt ${attempts}):`, batchError);
                        // Decide if error is fatal or retryable? For now, stop.
                        break;
                    }

                    if (batch && batch.length > 0) {
                        const newUniqueTxs = batch.filter(tx => !fetchedSignatures.current.has(tx.signature));
                        newUniqueTxs.forEach(tx => fetchedSignatures.current.add(tx.signature));
                        accumulatedTransactions = [...accumulatedTransactions, ...newUniqueTxs];
                        remainingToFetch -= newUniqueTxs.length;
                        currentLastSig = batch[batch.length - 1].signature;

                        // If we received fewer than requested, assume end of history
                        if (batch.length < fetchBatchSize) {
                            break;
                        }
                    } else {
                        // No more transactions found
                        break;
                    }
                } catch (err) {
                    console.error(`Error during background fetch loop (Attempt ${attempts}):`, err);
                    // Stop background fetch on error
                    break;
                }
            }

            if (!isMounted) return;

            if (accumulatedTransactions.length > 0) {
                // Combine with existing and re-process
                setRecentTransactions(prev => {
                    const combined = [...prev, ...accumulatedTransactions];
                    // Sort just in case, though should be mostly chronological
                    combined.sort((a, b) => b.timestamp - a.timestamp);

                    // Update timeline and activity data based on combined list
                    const processedData = processTransactions(combined, validPublicKey.toString());
                    setTimelineData(processedData);
                    setActivityData(prepareActivityData(processedData));

                    return combined;
                });
                // Update spam count based on total fetched (approx)
                setSpamFiltered(prev => prev + Math.max(0, 150 - accumulatedTransactions.length));
            }

            setIsLoadingMoreTx(false); // Done loading background
            setHasMore(false); // Assume we fetched all needed or reached end
        }

        // Start initial fetch
        fetchInitialData().then(() => {
            // Once initial data is processed, start background fetch if needed
            if (isMounted && hasMore && lastSignature) {
                // Use a small delay to allow initial render to complete
                setTimeout(() => fetchRemainingDataInBackground(lastSignature), 500);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };

    }, [publicKey]); // Rerun only when publicKey changes

    return (
        <div className="bg-bio-base min-h-screen w-full flex justify-center p-4">
            <div className="max-w-6xl w-full flex flex-col">
                <div className="mb-4">
                    <Link
                        href="/"
                        className="text-bio-primary hover:text-bio-secondary transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>

                <div className="bg-bio-surface p-6 border-2 border-bio-border rounded-lg">
                    <h1 className="text-2xl font-bold mb-4 text-bio-primary">Address Details</h1>

                    {/* Display address error if validation failed */}
                    {addressError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{addressError}</span>
                        </div>
                    )}

                    {/* Display data fetch error if it occurred */}
                    {error && !addressError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && publicKey && !error && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-bio-primary/30 mb-4"></div>
                                <p className="text-bio-text-secondary">Loading address details...</p>
                            </div>
                        </div>
                    )}

                    {/* Display actual data when not loading and no errors */}
                    {!isLoading && !error && !addressError && (
                        <>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Address:</span>
                                    <span className="text-bio-text-primary break-all">{addressId}</span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Balance:</span>
                                    <span className="text-bio-text-primary">
                                        <span className="font-medium">
                                            {solBalance !== null ? formatSOL(solBalance) : "Loading..."}
                                        </span>
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Type:</span>
                                    <span className="text-bio-text-primary">
                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                            {accountType || "Unknown"}
                                        </span>
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Transactions:</span>
                                    <span className="text-bio-text-primary">
                                        {recentTransactions ? (
                                            <span className="inline-flex items-center">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {recentTransactions.length}
                                                </span>
                                                {isLoadingMoreTx && (
                                                    <span className="ml-2 inline-flex items-center text-xs text-bio-text-secondary">
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-bio-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Loading more transactions...
                                                    </span>
                                                )}
                                            </span>
                                        ) : "Loading..."}
                                    </span>
                                </div>
                            </div>

                            {/* Add Activity Calendar here */}
                            {activityData && (
                                <ActivityCalendar data={activityData} />
                            )}

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-bio-primary">Token Balances</h2>
                                {tokenBalances && tokenBalances.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-bio-border">
                                            <thead className="bg-bio-base">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Token</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Amount</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Value (USD)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-bio-surface divide-y divide-bio-border">
                                                {tokenBalances.map((token, index) => (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                            {token.symbol}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                            {formatTokenAmount(token.amount, token.decimals)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                            {/* USD value will be implemented in Phase 5 */}
                                                            -
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-bio-text-secondary">No token balances found.</p>
                                )}
                            </div>

                            {/* Recent Funding Sources Section - UPDATED */}
                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-bio-primary flex items-center">
                                    Recent Funding Sources
                                    {fundingSources.length > 0 && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                            {fundingSources.length}
                                        </span>
                                    )}
                                </h2>

                                {loadingFundingSources && fundingSources.length === 0 ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="animate-pulse flex items-center">
                                            <div className="h-4 w-4 rounded-full bg-bio-primary/30 mr-2"></div>
                                            <p className="text-sm text-bio-text-secondary">Loading funding sources...</p>
                                        </div>
                                    </div>
                                ) : fundingSources.length > 0 ? (
                                    <div className="border border-bio-border rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-bio-border">
                                                <thead className="bg-bio-base sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Source</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">SOL Amount</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Token Transfers</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Last Activity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Recent TX</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-bio-surface divide-y divide-bio-border">
                                                    {fundingSources.map((source, index) => {
                                                        // Get most recent transaction 
                                                        const recentTx = source.transactions.sort((a, b) => b.timestamp - a.timestamp)[0];

                                                        // Get token summary
                                                        const tokenSummary = Object.entries(source.tokenTransfers);

                                                        return (
                                                            <tr key={`${source.address}-${index}`}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-primary">
                                                                    <Link
                                                                        href={`/address/${source.address}`}
                                                                        className="hover:underline"
                                                                    >
                                                                        {source.address.slice(0, 8)}...{source.address.slice(-8)}
                                                                    </Link>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                                    {source.totalSol > 0 ? formatSOL(source.totalSol) : "-"}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-bio-text-primary">
                                                                    {tokenSummary.length > 0 ? (
                                                                        <div className="flex flex-col space-y-1">
                                                                            {tokenSummary.slice(0, 2).map(([mint, amount]) => (
                                                                                <div key={mint} className="flex items-center">
                                                                                    <span className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded mr-2">
                                                                                        {getTokenSymbol(mint)}
                                                                                    </span>
                                                                                    <span>
                                                                                        {formatTokenAmount(
                                                                                            amount,
                                                                                            TOKEN_MINTS[mint]?.decimals || 0
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                            {tokenSummary.length > 2 && (
                                                                                <span className="text-xs text-bio-text-secondary">
                                                                                    +{tokenSummary.length - 2} more
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                                    {formatTimeAgo(source.lastTimestamp)}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-primary">
                                                                    <Link
                                                                        href={`/tx/${recentTx.signature}`}
                                                                        className="hover:underline"
                                                                    >
                                                                        {recentTx.signature.slice(0, 8)}...
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-bio-text-secondary">No significant funding sources found in the transaction history.</p>
                                )}
                            </div>

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-bio-primary flex items-center">
                                    Transaction Timeline
                                    {isLoadingMoreTx && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-bio-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading more in background...
                                        </span>
                                    )}
                                    {spamFiltered > 0 && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {spamFiltered} spam filtered
                                        </span>
                                    )}
                                </h2>

                                {timelineData ? (
                                    <TimelineView
                                        data={timelineData}
                                        isLoading={false}
                                        error={null}
                                    />
                                ) : (
                                    <p className="text-bio-text-secondary">No transactions found.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 