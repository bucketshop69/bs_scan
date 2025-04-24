"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { HeliusParsedTransaction, NativeTransfer, TokenTransfer } from "@/app/types/helius";
import { fetchTransactionDetails } from "@/app/api/helius";
import { formatSOL, formatTimestamp } from "@/app/utils/formatting";
import { formatTokenAmount, getTokenSymbol } from "@/app/utils/tokenMapping";

/**
 * Generates a human-readable headline for a transaction
 */
const generateTransactionHeadline = (txData: HeliusParsedTransaction): string => {
    // Use description if available and meaningful
    if (txData.description && txData.description !== "Human readable interpretation of the transaction") {
        return txData.description;
    }

    // Combine type and source
    if (txData.type && txData.source) {
        return `${txData.type.replace('_', ' ')} via ${txData.source}`;
    }

    // Use just the type if available
    if (txData.type) {
        return txData.type.replace('_', ' ');
    }

    // Use just the source if available
    if (txData.source) {
        return `Interaction with ${txData.source}`;
    }

    // Fallback
    return "Transaction";
}

/**
 * Determines if the given address is the main actor in this transaction view
 */
const isMainActor = (address: string, feePayer: string): boolean => {
    // For now, we'll consider the fee payer as the main actor
    return address === feePayer;
}

/**
 * Categorizes transfers as "sent" or "received" from the perspective of the main actor (fee payer)
 */
const categorizeTransfers = (
    txData: HeliusParsedTransaction
) => {
    const feePayer = txData.feePayer;
    const sent: { native: NativeTransfer[], token: TokenTransfer[] } = { native: [], token: [] };
    const received: { native: NativeTransfer[], token: TokenTransfer[] } = { native: [], token: [] };

    // Categorize native transfers
    txData.nativeTransfers?.forEach(transfer => {
        if (isMainActor(transfer.fromUserAccount, feePayer)) {
            sent.native.push(transfer);
        }
        if (isMainActor(transfer.toUserAccount, feePayer)) {
            received.native.push(transfer);
        }
    });

    // Categorize token transfers
    txData.tokenTransfers?.forEach(transfer => {
        if (isMainActor(transfer.fromUserAccount, feePayer)) {
            sent.token.push(transfer);
        }
        if (isMainActor(transfer.toUserAccount, feePayer)) {
            received.token.push(transfer);
        }
    });

    return { sent, received };
}

/**
 * Calculates net balance changes for fee payer based on accountData
 */
const calculateNetBalanceChanges = (
    txData: HeliusParsedTransaction
) => {
    // Get fee payer
    const feePayer = txData.feePayer;

    // Initialize net changes storage
    const netChanges = new Map<string, number>();
    netChanges.set("SOL", 0); // Initialize SOL entry

    // Process accountData to track changes
    if (txData.accountData) {
        txData.accountData.forEach(accountInfo => {
            // Track SOL changes for fee payer
            if (accountInfo.account === feePayer) {
                const currentSolChange = netChanges.get("SOL") || 0;
                netChanges.set("SOL", currentSolChange + accountInfo.nativeBalanceChange);
            }

            // Track token changes for fee payer
            if (accountInfo.tokenBalanceChanges) {
                accountInfo.tokenBalanceChanges.forEach(tokenChange => {
                    if (tokenChange.userAccount === feePayer) {
                        const mintAddress = tokenChange.mint;
                        const rawAmount = tokenChange.rawTokenAmount.tokenAmount;
                        const decimals = tokenChange.rawTokenAmount.decimals;

                        // Calculate decimal value change
                        const decimalValue = parseInt(rawAmount) / (10 ** decimals);

                        // Add to net changes
                        const currentTokenChange = netChanges.get(mintAddress) || 0;
                        netChanges.set(mintAddress, currentTokenChange + decimalValue);
                    }
                });
            }
        });
    }

    // Prepare the result object
    const result = {
        sent: {
            sol: Math.abs(netChanges.get("SOL") || 0) > 0 && (netChanges.get("SOL") || 0) < 0 ?
                Math.abs(netChanges.get("SOL") || 0) : 0,
            tokens: [] as { mint: string, amount: number }[]
        },
        received: {
            sol: (netChanges.get("SOL") || 0) > 0 ? (netChanges.get("SOL") || 0) : 0,
            tokens: [] as { mint: string, amount: number }[]
        },
        fee: txData.fee,
        // Track if changes are only the fee
        onlyFee: Math.abs(netChanges.get("SOL") || 0) === txData.fee && netChanges.size === 1,
        // Used to check if there are any changes at all
        hasChanges: netChanges.size > 1 || Math.abs(netChanges.get("SOL") || 0) > 0
    };

    // Process token changes into sent/received categories
    netChanges.forEach((value, key) => {
        if (key === "SOL") return; // Skip SOL, already handled

        if (value < 0) {
            // Sent tokens (negative change)
            result.sent.tokens.push({
                mint: key,
                amount: Math.abs(value)
            });
        } else if (value > 0) {
            // Received tokens (positive change)
            result.received.tokens.push({
                mint: key,
                amount: value
            });
        }
    });

    return result;
}

export default function TransactionDetails() {
    const params = useParams();
    const txId = params.id as string;

    // State variables
    const [heliusTxDetails, setHeliusTxDetails] = useState<HeliusParsedTransaction | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Toggle state variables for collapsible sections
    const [showRawData, setShowRawData] = useState<boolean>(false);
    const [showAccounts, setShowAccounts] = useState<boolean>(true);
    const [showPrograms, setShowPrograms] = useState<boolean>(true);

    // Copy tooltip state
    const [showCopyTooltip, setShowCopyTooltip] = useState<boolean>(false);

    // Data Fetching
    useEffect(() => {
        // Function to fetch transaction details
        async function loadTransactionDetails() {
            // Reset states at the beginning of fetch
            setLoading(true);
            setError(null);

            // Validate signature existence
            if (!txId || txId.trim() === '') {
                setError("Invalid transaction signature");
                setLoading(false);
                return;
            }

            // Call our API function
            const { heliusTxDetails, error: apiError } = await fetchTransactionDetails(txId);

            // Update state based on API response
            if (apiError) {
                setError(apiError);
            } else if (heliusTxDetails) {
                console.log('Helius Tx Details:', heliusTxDetails);
                setHeliusTxDetails(heliusTxDetails);
            } else {
                setError("Failed to fetch transaction details");
            }

            setLoading(false);
        }

        // Call the fetch function
        loadTransactionDetails();
    }, [txId]); // Re-run when txId changes

    // Toggle function for sections
    const toggleSection = (section: 'rawData' | 'accounts' | 'programs') => {
        switch (section) {
            case 'rawData':
                setShowRawData(!showRawData);
                break;
            case 'accounts':
                setShowAccounts(!showAccounts);
                break;
            case 'programs':
                setShowPrograms(!showPrograms);
                break;
        }
    };

    // Copy raw data to clipboard
    const copyRawData = () => {
        if (!heliusTxDetails) return;

        // Copy to clipboard
        navigator.clipboard.writeText(JSON.stringify(heliusTxDetails, null, 2))
            .then(() => {
                // Show tooltip
                setShowCopyTooltip(true);

                // Hide tooltip after 2 seconds
                setTimeout(() => {
                    setShowCopyTooltip(false);
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

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
                    <h1 className="text-2xl font-bold mb-4 text-bio-primary">Transaction Details</h1>

                    {/* Loading state */}
                    {loading && (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-12 w-12 rounded-full bg-bio-primary/30 mb-4"></div>
                                <p className="text-bio-text-secondary">Loading transaction details...</p>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {!loading && error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {/* Transaction details - Helius Enhanced Data */}
                    {!loading && !error && heliusTxDetails && (
                        <>
                            {/* Section 1: Header/Summary Block */}
                            <div className="mb-8">
                                {/* Transaction headline */}
                                <h2 className="text-xl font-bold text-bio-primary mb-2">
                                    {generateTransactionHeadline(heliusTxDetails)}
                                </h2>

                                {/* Transaction status and signature */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                    <div className="flex items-center">
                                        <span className="mr-2">Status:</span>
                                        {heliusTxDetails.transactionError ? (
                                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded">
                                                Failed
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
                                                Success
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-bio-text-secondary">Signature:</span>
                                        <span className="ml-2 font-mono text-sm text-bio-text-primary">{txId}</span>
                                    </div>
                                </div>

                                {/* Transaction error message, if any */}
                                {heliusTxDetails.transactionError && (
                                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                                        <p className="text-red-700">
                                            Error: {heliusTxDetails.transactionError.error}
                                        </p>
                                    </div>
                                )}

                                {/* Transaction metadata */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bio-base rounded-lg">
                                    <div>
                                        <h3 className="text-sm font-medium text-bio-text-secondary">Timestamp</h3>
                                        <p className="text-bio-text-primary">{formatTimestamp(heliusTxDetails.timestamp)}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-bio-text-secondary">Block</h3>
                                        <p className="text-bio-text-primary">{heliusTxDetails.slot.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-bio-text-secondary">Fee</h3>
                                        <p className="text-bio-text-primary">{formatSOL(heliusTxDetails.fee)}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-bio-text-secondary">Fee Payer</h3>
                                        <p className="text-bio-text-primary truncate">
                                            <Link
                                                href={`/address/${heliusTxDetails.feePayer}`}
                                                className="hover:text-bio-primary hover:underline"
                                            >
                                                {heliusTxDetails.feePayer}
                                            </Link>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Financial Impact */}
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-4 border-b border-bio-border pb-2">Financial Impact</h2>

                                {/* Calculate and display net balance changes */}
                                {(() => {
                                    const balanceChanges = calculateNetBalanceChanges(heliusTxDetails);

                                    // No significant changes case - only fee or no changes at all
                                    if (balanceChanges.onlyFee || !balanceChanges.hasChanges) {
                                        return (
                                            <div className="text-bio-text-secondary">
                                                <p>No significant balance changes for fee payer in this transaction.</p>
                                                <p className="mt-2 text-red-600 text-sm">
                                                    Only transaction fee: {formatSOL(balanceChanges.fee)}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Assets Sent */}
                                            <div className="p-4 bg-bio-base rounded-lg border border-bio-border">
                                                <h3 className="text-red-800 font-medium mb-3">
                                                    <span className="mr-2">📤</span>
                                                    Assets Sent
                                                </h3>

                                                {balanceChanges.sent.sol === 0 && balanceChanges.sent.tokens.length === 0 ? (
                                                    <p className="text-bio-text-secondary">No assets sent</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {/* SOL transfer (excluding fee) */}
                                                        {balanceChanges.sent.sol > 0 && balanceChanges.sent.sol > balanceChanges.fee && (
                                                            <li className="flex justify-between items-center p-2 border-b border-bio-border">
                                                                <div className="flex items-center">
                                                                    <span className="text-red-600 font-medium">-</span>
                                                                    <span className="ml-2">{formatSOL(balanceChanges.sent.sol)}</span>
                                                                </div>
                                                                <div className="text-xs text-bio-text-secondary">
                                                                    SOL outflow (excluding fee)
                                                                </div>
                                                            </li>
                                                        )}

                                                        {/* Fee displayed separately */}
                                                        <li className="flex justify-between items-center p-2 border-b border-bio-border">
                                                            <div className="flex items-center">
                                                                <span className="text-red-600 font-medium">-</span>
                                                                <span className="ml-2">{formatSOL(balanceChanges.fee)}</span>
                                                            </div>
                                                            <div className="text-xs text-bio-text-secondary">
                                                                Transaction fee
                                                            </div>
                                                        </li>

                                                        {/* Token transfers sent */}
                                                        {balanceChanges.sent.tokens.map((token, idx) => (
                                                            <li key={`sent-token-${idx}`} className="flex justify-between items-center p-2 border-b border-bio-border">
                                                                <div className="flex items-center">
                                                                    <span className="text-red-600 font-medium">-</span>
                                                                    <span className="ml-2">{token.amount.toFixed(6)} {getTokenSymbol(token.mint)}</span>
                                                                </div>
                                                                <div className="text-xs text-bio-text-secondary truncate max-w-[120px]">
                                                                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Assets Received */}
                                            <div className="p-4 bg-bio-base rounded-lg border border-bio-border">
                                                <h3 className="text-green-800 font-medium mb-3">
                                                    <span className="mr-2">📥</span>
                                                    Assets Received
                                                </h3>

                                                {balanceChanges.received.sol === 0 && balanceChanges.received.tokens.length === 0 ? (
                                                    <p className="text-bio-text-secondary">No assets received</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {/* SOL received */}
                                                        {balanceChanges.received.sol > 0 && (
                                                            <li className="flex justify-between items-center p-2 border-b border-bio-border">
                                                                <div className="flex items-center">
                                                                    <span className="text-green-600 font-medium">+</span>
                                                                    <span className="ml-2">{formatSOL(balanceChanges.received.sol)}</span>
                                                                </div>
                                                                <div className="text-xs text-bio-text-secondary">
                                                                    SOL inflow
                                                                </div>
                                                            </li>
                                                        )}

                                                        {/* Token transfers received */}
                                                        {balanceChanges.received.tokens.map((token, idx) => (
                                                            <li key={`received-token-${idx}`} className="flex justify-between items-center p-2 border-b border-bio-border">
                                                                <div className="flex items-center">
                                                                    <span className="text-green-600 font-medium">+</span>
                                                                    <span className="ml-2">{token.amount.toFixed(6)} {getTokenSymbol(token.mint)}</span>
                                                                </div>
                                                                <div className="text-xs text-bio-text-secondary truncate max-w-[120px]">
                                                                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Section 3: Detailed Events - only shown if events exist */}
                            {(() => {
                                const events = heliusTxDetails.events;

                                // Check if there are any events
                                const hasEvents = events && (
                                    events.nft ||
                                    events.swap ||
                                    events.compressed ||
                                    events.setAuthority
                                );

                                // If no events, don't render this section
                                if (!hasEvents) {
                                    return null;
                                }

                                return (
                                    <div className="mb-8">
                                        <h2 className="text-lg font-semibold mb-4 border-b border-bio-border pb-2">Detailed Events</h2>

                                        <div className="space-y-6">
                                            {/* Swap Event */}
                                            {events.swap && (
                                                <div className="bg-bio-base p-4 rounded-lg border border-bio-border">
                                                    <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                                                        <span className="mr-2">🔄</span>
                                                        Swap Details
                                                    </h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Input tokens */}
                                                        <div className="bg-bio-base p-3 rounded-lg">
                                                            <h4 className="text-sm font-medium text-bio-text-secondary mb-2">Swapped From</h4>
                                                            <div className="space-y-2">
                                                                {/* Native input (SOL) if present */}
                                                                {events.swap.nativeInput && (
                                                                    <div className="flex items-center justify-between p-2 border-b border-bio-border">
                                                                        <span>{formatSOL(parseInt(events.swap.nativeInput.amount))}</span>
                                                                        <span className="text-xs text-bio-text-secondary">
                                                                            {events.swap.nativeInput.account.slice(0, 4)}...{events.swap.nativeInput.account.slice(-4)}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Token inputs */}
                                                                {events.swap.tokenInputs && events.swap.tokenInputs.map((input, idx) => (
                                                                    <div key={`input-${idx}`} className="flex items-center justify-between p-2 border-b border-bio-border">
                                                                        <span>
                                                                            {formatTokenAmount(
                                                                                input.mint,
                                                                                parseInt(input.rawTokenAmount.tokenAmount)
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-bio-text-secondary">
                                                                            {input.userAccount.slice(0, 4)}...{input.userAccount.slice(-4)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Output tokens */}
                                                        <div className="bg-bio-base p-3 rounded-lg">
                                                            <h4 className="text-sm font-medium text-bio-text-secondary mb-2">Swapped To</h4>
                                                            <div className="space-y-2">
                                                                {/* Native output (SOL) if present */}
                                                                {events.swap.nativeOutput && (
                                                                    <div className="flex items-center justify-between p-2 border-b border-bio-border">
                                                                        <span>{formatSOL(parseInt(events.swap.nativeOutput.amount))}</span>
                                                                        <span className="text-xs text-bio-text-secondary">
                                                                            {events.swap.nativeOutput.account.slice(0, 4)}...{events.swap.nativeOutput.account.slice(-4)}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Token outputs */}
                                                                {events.swap.tokenOutputs && events.swap.tokenOutputs.map((output, idx) => (
                                                                    <div key={`output-${idx}`} className="flex items-center justify-between p-2 border-b border-bio-border">
                                                                        <span>
                                                                            {formatTokenAmount(
                                                                                output.mint,
                                                                                parseInt(output.rawTokenAmount.tokenAmount)
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-bio-text-secondary">
                                                                            {output.userAccount.slice(0, 4)}...{output.userAccount.slice(-4)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Exchange/Protocol info */}
                                                    {events.swap.innerSwaps && events.swap.innerSwaps.length > 0 && events.swap.innerSwaps[0].programInfo && (
                                                        <div className="mt-3 pt-2 border-t border-bio-border">
                                                            <span className="text-xs text-bio-text-secondary">
                                                                Protocol: <span className="font-medium text-bio-text-primary">
                                                                    {events.swap.innerSwaps[0].programInfo.source}
                                                                </span>
                                                                {events.swap.innerSwaps[0].programInfo.programName && (
                                                                    <> - {events.swap.innerSwaps[0].programInfo.programName}</>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* NFT Event */}
                                            {events.nft && (
                                                <div className="bg-bio-base p-4 rounded-lg border border-bio-border">
                                                    <h3 className="font-medium text-purple-800 mb-3 flex items-center">
                                                        <span className="mr-2">🖼️</span>
                                                        NFT {events.nft.type.replace('NFT_', '')} Details
                                                    </h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* NFT information */}
                                                        <div className="bg-bio-base p-3 rounded-lg">
                                                            <h4 className="text-sm font-medium text-bio-text-secondary mb-2">NFT Information</h4>

                                                            {events.nft.nfts && events.nft.nfts.length > 0 ? (
                                                                <ul className="space-y-2">
                                                                    {events.nft.nfts.map((nft, idx) => (
                                                                        <li key={`nft-${idx}`} className="p-2 border-b border-bio-border">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-xs text-bio-text-secondary">Mint:</span>
                                                                                <span className="text-sm font-mono">{nft.mint.slice(0, 6)}...{nft.mint.slice(-6)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-xs text-bio-text-secondary">Standard:</span>
                                                                                <span>{nft.tokenStandard}</span>
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-bio-text-secondary">No NFT information available</p>
                                                            )}
                                                        </div>

                                                        {/* Transaction details */}
                                                        <div className="bg-bio-base p-3 rounded-lg">
                                                            <h4 className="text-sm font-medium text-bio-text-secondary mb-2">Transaction Details</h4>

                                                            <div className="space-y-3">
                                                                {/* Type */}
                                                                <div className="flex justify-between">
                                                                    <span className="text-xs text-bio-text-secondary">Event Type:</span>
                                                                    <span>
                                                                        <span className="px-2 py-1 bg-bio-base text-purple-800 rounded text-xs">
                                                                            {events.nft.type.replace('NFT_', '')}
                                                                        </span>
                                                                    </span>
                                                                </div>

                                                                {/* Amount if present */}
                                                                {events.nft.amount > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-xs text-bio-text-secondary">Amount:</span>
                                                                        <span>{formatSOL(events.nft.amount)}</span>
                                                                    </div>
                                                                )}

                                                                {/* Buyer if present */}
                                                                {events.nft.buyer && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-xs text-bio-text-secondary">Buyer:</span>
                                                                        <Link href={`/address/${events.nft.buyer}`} className="text-sm font-mono hover:underline">
                                                                            {events.nft.buyer.slice(0, 4)}...{events.nft.buyer.slice(-4)}
                                                                        </Link>
                                                                    </div>
                                                                )}

                                                                {/* Seller if present */}
                                                                {events.nft.seller && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-xs text-bio-text-secondary">Seller:</span>
                                                                        <Link href={`/address/${events.nft.seller}`} className="text-sm font-mono hover:underline">
                                                                            {events.nft.seller.slice(0, 4)}...{events.nft.seller.slice(-4)}
                                                                        </Link>
                                                                    </div>
                                                                )}

                                                                {/* Source marketplace */}
                                                                {events.nft.source && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-xs text-bio-text-secondary">Marketplace:</span>
                                                                        <span>{events.nft.source}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Compressed NFT Event (simplified version) */}
                                            {events.compressed && (
                                                <div className="bg-bio-base p-4 rounded-lg border border-bio-border">
                                                    <h3 className="font-medium text-indigo-800 mb-3 flex items-center">
                                                        <span className="mr-2">📦</span>
                                                        Compressed NFT {events.compressed.type.replace('COMPRESSED_NFT_', '')}
                                                    </h3>

                                                    <div className="bg-bio-base p-3 rounded-lg">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <div className="flex justify-between mb-2">
                                                                    <span className="text-xs text-bio-text-secondary">Tree ID:</span>
                                                                    <span className="text-sm font-mono">{events.compressed.treeId.slice(0, 6)}...{events.compressed.treeId.slice(-6)}</span>
                                                                </div>

                                                                <div className="flex justify-between mb-2">
                                                                    <span className="text-xs text-bio-text-secondary">Asset ID:</span>
                                                                    <span className="text-sm font-mono">{events.compressed.assetId.slice(0, 6)}...{events.compressed.assetId.slice(-6)}</span>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                {events.compressed.newLeafOwner && (
                                                                    <div className="flex justify-between mb-2">
                                                                        <span className="text-xs text-bio-text-secondary">New Owner:</span>
                                                                        <Link href={`/address/${events.compressed.newLeafOwner}`} className="text-sm font-mono hover:underline">
                                                                            {events.compressed.newLeafOwner.slice(0, 4)}...{events.compressed.newLeafOwner.slice(-4)}
                                                                        </Link>
                                                                    </div>
                                                                )}

                                                                {events.compressed.oldLeafOwner && (
                                                                    <div className="flex justify-between mb-2">
                                                                        <span className="text-xs text-bio-text-secondary">Previous Owner:</span>
                                                                        <Link href={`/address/${events.compressed.oldLeafOwner}`} className="text-sm font-mono hover:underline">
                                                                            {events.compressed.oldLeafOwner.slice(0, 4)}...{events.compressed.oldLeafOwner.slice(-4)}
                                                                        </Link>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Section 4: Involved Accounts & Programs with toggles */}
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-4 border-b border-bio-border pb-2">Involved Accounts & Programs</h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Accounts Section with toggle */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-md font-medium text-bio-text-primary flex items-center">
                                                <span className="mr-2">👤</span>
                                                Accounts ({heliusTxDetails.accountData?.length || 0})
                                            </h3>
                                            <button
                                                onClick={() => toggleSection('accounts')}
                                                className="text-bio-text-secondary hover:text-bio-primary focus:outline-none transition-colors"
                                            >
                                                {showAccounts ? '▼' : '▶'}
                                            </button>
                                        </div>

                                        {showAccounts && (
                                            <div className="bg-bio-base border border-bio-border rounded-lg overflow-hidden">
                                                {heliusTxDetails.accountData && heliusTxDetails.accountData.length > 0 ? (
                                                    <div className="divide-y divide-bio-border">
                                                        {heliusTxDetails.accountData.map((account: any, idx) => (
                                                            <div key={`account-${idx}`} className="p-3 hover:bg-bio-base/60">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="w-full">
                                                                        {/* Account address with link */}
                                                                        <div className="flex items-center mb-1">
                                                                            <Link
                                                                                href={`/address/${account.account}`}
                                                                                className="font-mono text-bio-primary hover:underline truncate text-sm"
                                                                            >
                                                                                {account.account}
                                                                            </Link>

                                                                            {/* Mark if fee payer */}
                                                                            {account.account === heliusTxDetails.feePayer && (
                                                                                <span className="ml-2 px-1.5 py-0.5 bg-bio-primary/10 text-bio-primary rounded text-xs">
                                                                                    Fee Payer
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Account metadata if available */}
                                                                        {account.name && (
                                                                            <div className="text-sm text-bio-text-secondary mb-1">
                                                                                {account.name}
                                                                            </div>
                                                                        )}

                                                                        {/* Account roles */}
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {account.signer && (
                                                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                                                    Signer
                                                                                </span>
                                                                            )}
                                                                            {account.writable && (
                                                                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                                                                                    Writable
                                                                                </span>
                                                                            )}
                                                                            {account.owner && (
                                                                                <div className="text-xs text-bio-text-secondary mt-1">
                                                                                    Owner: <span className="font-mono">{account.owner}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-bio-text-secondary">
                                                        No account data available
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Programs Section with toggle */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-md font-medium text-bio-text-primary flex items-center">
                                                <span className="mr-2">⚙️</span>
                                                Programs Invoked
                                            </h3>
                                            <button
                                                onClick={() => toggleSection('programs')}
                                                className="text-bio-text-secondary hover:text-bio-primary focus:outline-none transition-colors"
                                            >
                                                {showPrograms ? '▼' : '▶'}
                                            </button>
                                        </div>

                                        {showPrograms && (
                                            <div className="bg-bio-base border border-bio-border rounded-lg overflow-hidden">
                                                {heliusTxDetails.instructions && heliusTxDetails.instructions.length > 0 ? (
                                                    <div className="divide-y divide-bio-border">
                                                        {Array.from(new Set(heliusTxDetails.instructions.map(instr => instr.programId))).map((programId, idx) => {
                                                            return (
                                                                <div key={`program-${idx}`} className="p-3 hover:bg-bio-base/60">
                                                                    {/* Program address */}
                                                                    <div className="flex items-center">
                                                                        <Link
                                                                            href={`/address/${programId}`}
                                                                            className="font-mono text-bio-primary hover:underline truncate text-sm"
                                                                        >
                                                                            {programId}
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-bio-text-secondary">
                                                        No program data available
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Raw Transaction Data with toggle */}
                            <div className="mt-8">
                                <div className="flex justify-between items-center mb-4 border-b border-bio-border pb-2">
                                    <h2 className="text-lg font-semibold">Raw Transaction Data</h2>
                                    <div className="flex items-center gap-3">
                                        {/* Copy button with tooltip */}
                                        <div className="relative">
                                            <button
                                                onClick={copyRawData}
                                                className="text-bio-text-secondary hover:text-bio-primary focus:outline-none transition-colors p-1"
                                                title="Copy to clipboard"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                            </button>

                                            {/* Tooltip */}
                                            {showCopyTooltip && (
                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-bio-primary text-white text-xs py-1 px-2 rounded shadow-md whitespace-nowrap">
                                                    Copied to clipboard!
                                                </div>
                                            )}
                                        </div>

                                        {/* Toggle button */}
                                        <button
                                            onClick={() => toggleSection('rawData')}
                                            className="text-bio-text-secondary hover:text-bio-primary focus:outline-none transition-colors"
                                        >
                                            {showRawData ? '▼ Hide' : '▶ Show'}
                                        </button>
                                    </div>
                                </div>

                                {showRawData && (
                                    <div className="bg-bio-base p-4 rounded overflow-x-auto border border-bio-border">
                                        <pre className="text-bio-text-primary whitespace-pre-wrap">
                                            {JSON.stringify(heliusTxDetails, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 