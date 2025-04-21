"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Connection, clusterApiUrl, ParsedTransactionWithMeta } from "@solana/web3.js";
import { useState, useEffect } from "react";

// Configure the Solana connection
const rpcEndpoint = "https://mainnet.helius-rpc.com/?api-key=dbf616dd-1870-4cdb-a0d2-754ae58a64f0";
const connection = new Connection(rpcEndpoint);

// Helper function to format timestamp
const formatTimestamp = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
    return date.toLocaleString();
};

// Helper function to format SOL amount (convert lamports to SOL)
const formatSOL = (lamports: number): string => {
    return (lamports / 1_000_000_000).toFixed(9) + " SOL";
};

export default function TransactionDetails() {
    const params = useParams();
    const txId = params.id as string;

    // State variables for Phase 2
    const [txDetails, setTxDetails] = useState<ParsedTransactionWithMeta | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Phase 3: Data Fetching
    useEffect(() => {
        // Function to fetch transaction details
        async function fetchTransactionDetails() {
            // Reset states at the beginning of fetch
            setLoading(true);
            setError(null);

            // Validate signature existence
            if (!txId || txId.trim() === '') {
                setError("Invalid transaction signature");
                setLoading(false);
                return;
            }

            try {
                // Make RPC call to fetch transaction details
                const transactionDetails = await connection.getParsedTransaction(
                    txId,
                    { maxSupportedTransactionVersion: 0 }
                );

                // Check if transaction was found
                if (!transactionDetails) {
                    setError("Transaction not found");
                    setLoading(false);
                    return;
                }

                // Update transaction details state
                setTxDetails(transactionDetails);
                setLoading(false);
            } catch (err) {
                // Handle any errors during fetch
                console.error("Error fetching transaction:", err);
                setError("Failed to fetch transaction details. Please try again later.");
                setLoading(false);
            }
        }

        // Call the fetch function
        fetchTransactionDetails();
    }, [txId]); // Re-run when txId changes

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

                    {/* Transaction details */}
                    {!loading && !error && txDetails && (
                        <>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Transaction ID:</span>
                                    <span className="text-bio-text-primary break-all">{txId}</span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Status:</span>
                                    <span className="text-bio-text-primary">
                                        {txDetails.meta?.err ? (
                                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded">
                                                Failed
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
                                                Success
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Block:</span>
                                    <span className="text-bio-text-primary">{txDetails.slot.toLocaleString()}</span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Timestamp:</span>
                                    <span className="text-bio-text-primary">
                                        {txDetails.blockTime ? formatTimestamp(txDetails.blockTime) : "Not available"}
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-start border-b border-bio-border pb-3">
                                    <span className="text-bio-text-secondary font-medium w-40">Fee:</span>
                                    <span className="text-bio-text-primary">
                                        {formatSOL(txDetails.meta?.fee || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-bio-primary">Transaction Details</h2>
                                <div className="bg-bio-base p-4 rounded overflow-x-auto">
                                    <pre className="text-bio-text-primary whitespace-pre-wrap">
                                        {JSON.stringify(txDetails, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 