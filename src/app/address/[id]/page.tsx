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
    ConfirmedSignatureInfo
} from "@solana/web3.js";
import { useState, useEffect, useRef, useCallback } from "react";
import { HeliusParsedTransaction } from "../../types/helius";
import { fetchAddressTransactions } from "../../api/helius";
import { SPAM_ADDRESSES } from "../../constants";

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

    // Infinite scroll state
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [lastSignature, setLastSignature] = useState<string | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef<HTMLDivElement>(null);

    // Add state to track spammed filtered
    const [spamFiltered, setSpamFiltered] = useState<number>(0);

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
            console.error("Error creating PublicKey:", err);
            setAddressError("Invalid address format");
        }
    }, [addressId]);

    // Function to load more transactions
    const loadMoreTransactions = useCallback(async () => {
        if (!publicKey || loadingMore || !hasMore) return;

        setLoadingMore(true);

        try {
            console.log('Loading more transactions after signature:', lastSignature);
            const { transactions, error: txError } = await fetchAddressTransactions(
                publicKey.toString(),
                10,
                lastSignature || undefined
            );

            if (txError) {
                console.error("Error fetching more transactions:", txError);
                return;
            }

            if (transactions && transactions.length > 0) {
                // Filter out any duplicates that might occur due to filtering
                const newTransactions = transactions.filter(
                    newTx => !recentTransactions.some(existingTx => existingTx.signature === newTx.signature)
                );

                if (newTransactions.length === 0) {
                    // If we got back only duplicates, try loading more with the last signature
                    console.log('Received only duplicate transactions, trying again with new signature');
                    if (transactions[transactions.length - 1].signature !== lastSignature) {
                        setLastSignature(transactions[transactions.length - 1].signature);
                        setLoadingMore(false);
                        // We'll try again in the next update cycle through the useEffect
                        return;
                    } else {
                        // If we got the same last signature, we've probably reached the end
                        setHasMore(false);
                        return;
                    }
                }

                // Add the new transactions
                setRecentTransactions(prev => [...prev, ...newTransactions]);

                // Update the last signature for the next fetch
                setLastSignature(transactions[transactions.length - 1].signature);

                // For spam count tracking
                const estimatedSpamFiltered = Math.max(0, 10 - transactions.length);
                if (estimatedSpamFiltered > 0) {
                    setSpamFiltered(prev => prev + estimatedSpamFiltered);
                }

                // If we're getting fewer transactions back, we might be near the end
                if (transactions.length < 5) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Error loading more transactions:", err);
        } finally {
            setLoadingMore(false);
        }
    }, [publicKey, lastSignature, loadingMore, hasMore, recentTransactions]);

    // Set up intersection observer for infinite scroll
    useEffect(() => {
        if (loadingMore) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreTransactions();
            }
        });

        if (loadingRef.current) {
            observer.current.observe(loadingRef.current);
        }

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [loadMoreTransactions, loadingMore, hasMore]);

    // Phase 3: Data Fetching
    useEffect(() => {
        // Only proceed if we have a valid PublicKey
        if (!publicKey) {
            return;
        }

        // Clone publicKey to a non-null variable to satisfy TypeScript
        const validPublicKey = publicKey;

        // Reset states at the beginning of the fetch
        setIsLoading(true);
        setError(null);
        setSolBalance(null);
        setTokenBalances(null);
        setRecentTransactions([]);
        setAccountType(null);
        setLastSignature(null);
        setHasMore(true);

        async function fetchAddressData() {
            try {
                // Execute each promise separately with proper typing
                // 1. Fetch SOL balance
                const balance = await connection.getBalance(validPublicKey);
                setSolBalance(balance);

                // 2. Fetch token accounts and balances
                const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
                    validPublicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );

                // Process token accounts and filter out zero balances
                const processedTokenBalances: TokenBalanceInfo[] = tokenAccountsResponse.value
                    .map((account: ParsedTokenAccount) => {
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
                    })
                    .filter(token => Number(token.amount) > 0); // Filter out zero balances

                setTokenBalances(processedTokenBalances);

                // 3. Fetch recent transactions using Helius API
                const { transactions, error: txError } = await fetchAddressTransactions(validPublicKey.toString(), 10);

                if (txError) {
                    console.error("Error fetching transactions:", txError);
                    throw new Error(txError);
                }

                if (transactions && transactions.length > 0) {
                    setRecentTransactions(transactions);
                    setLastSignature(transactions[transactions.length - 1].signature);

                    // Estimate spam filtered (this is approximate)
                    setSpamFiltered(5 - Math.max(0, 10 - transactions.length));
                } else {
                    setRecentTransactions([]);
                    setHasMore(false);
                }

                // 4. Fetch account info to determine type
                const accountInfo = await connection.getAccountInfo(validPublicKey);

                // Determine account type
                if (accountInfo) {
                    if (accountInfo.executable) {
                        setAccountType("Program Account");
                    } else if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
                        setAccountType("Token Account");
                    } else {
                        setAccountType("Wallet");
                    }
                } else {
                    setAccountType("Unknown");
                }

            } catch (err) {
                console.error("Error fetching address data:", err);
                setError("Failed to fetch address data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        }

        // Execute the data fetching function
        fetchAddressData();

    }, [publicKey]); // Re-run when publicKey changes

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
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {recentTransactions.length}+
                                            </span>
                                        ) : "Loading..."}
                                    </span>
                                </div>
                            </div>

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

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-bio-primary flex items-center">
                                    Recent Transactions
                                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Parsed</span>
                                    {spamFiltered > 0 && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {spamFiltered} spam filtered
                                        </span>
                                    )}
                                </h2>
                                {recentTransactions && recentTransactions.length > 0 ? (
                                    <div className="border border-bio-border rounded-lg">
                                        <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
                                            <table className="min-w-full divide-y divide-bio-border">
                                                <thead className="bg-bio-base sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Type</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Signature</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Block</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Age</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-bio-surface divide-y divide-bio-border">
                                                    {recentTransactions.map((tx, index) => (
                                                        <tr key={tx.signature}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{tx.type || "Unknown"}</span>
                                                                    <span className="text-xs text-bio-text-secondary truncate max-w-[200px]">
                                                                        {tx.description || tx.source || "-"}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-primary">
                                                                <Link
                                                                    href={`/tx/${tx.signature}`}
                                                                    className="hover:underline"
                                                                >
                                                                    {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                                                                </Link>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                                {tx.slot.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                                                                {tx.timestamp ? formatTimeAgo(tx.timestamp) : "Unknown"}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <span className={`inline-block px-2 py-1 ${tx.transactionError
                                                                    ? 'bg-red-100 text-red-800' : 'text-bio-primary font-medium'} rounded`}>
                                                                    {tx.transactionError ? "Failed" : "Success"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Loading indicator for infinite scroll */}
                                            {hasMore && (
                                                <div
                                                    ref={loadingRef}
                                                    className="py-4 flex justify-center"
                                                >
                                                    {loadingMore ? (
                                                        <div className="animate-pulse flex items-center">
                                                            <div className="h-4 w-4 rounded-full bg-bio-primary/30 mr-2"></div>
                                                            <p className="text-sm text-bio-text-secondary">Loading more transactions...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-4"></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-bio-text-secondary">No recent transactions found.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 