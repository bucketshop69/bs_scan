"use client"

import React, { useState, useEffect, useRef } from 'react';
import MenuButton from './MenuButton';

interface Transaction {
    signature: string;
    status: boolean;
    timestamp: number;
    id: string;
}

interface LatestTxProps {
    isNested?: boolean;
    customAccount?: string;
    hideHeader?: boolean;
    className?: string;
}

// Specific account we want to track
const ACCOUNT_TO_TRACK = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

const LatestTx = ({ isNested = false, customAccount, hideHeader = false, className = "" }: LatestTxProps) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [slowMode, setSlowMode] = useState(false);
    const [debugMessage, setDebugMessage] = useState<string>("");
    const lastProcessTimeRef = useRef<number>(Date.now());

    // Check if we want all transactions or a specific account
    const showAllTransactions = customAccount === "";

    // Account to track (if not showing all transactions)
    const accountToTrack = showAllTransactions ? null : (customAccount || ACCOUNT_TO_TRACK);

    // Process and display transactions
    useEffect(() => {
        const TX_RATE_LIMIT = showAllTransactions ? 3 : 10; // Fewer transactions for "all" mode

        if (!slowMode) {
            // If slow mode is off, immediately add pending transactions to the display
            if (pendingTransactions.length > 0) {
                setTransactions(prev => {
                    const updated = [...pendingTransactions, ...prev].slice(0, 10);
                    setPendingTransactions([]);
                    return updated;
                });
            }
            return;
        }

        // Force display of initial transactions immediately
        if (pendingTransactions.length > 0 && transactions.length === 0) {
            // Show up to 5 initial transactions instead of just one
            const initialBatch = pendingTransactions.slice(0, 5);
            const remaining = pendingTransactions.slice(5);
            setTransactions(initialBatch);
            setPendingTransactions(remaining);
            setDebugMessage("Initial batch of " + initialBatch.length + " transactions displayed");
        }

        // In slow mode, update every 3 seconds
        const interval = setInterval(() => {
            setPendingTransactions(prev => {
                if (prev.length === 0) return prev;

                // Take the next few transactions based on the rate limit
                const nextBatch = prev.slice(0, TX_RATE_LIMIT);
                const remaining = prev.slice(TX_RATE_LIMIT);

                // Add them to the displayed transactions
                setTransactions(current => {
                    const updated = [...nextBatch, ...current].slice(0, 10);
                    setDebugMessage("Added " + nextBatch.length + " transactions to display. Total: " + updated.length);
                    return updated;
                });

                // Return remaining pending transactions
                return remaining;
            });
        }, showAllTransactions ? 1000 : 3000); // Faster updates for "all" transactions

        return () => clearInterval(interval);
    }, [slowMode, pendingTransactions, transactions, showAllTransactions]);

    useEffect(() => {
        // Connect to Solana WebSocket endpoint
        const connect = () => {
            try {
                const ws = new WebSocket('wss://mainnet.helius-rpc.com/?api-key=dbf616dd-1870-4cdb-a0d2-754ae58a64f0');
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('Connected to Solana WebSocket');
                    setIsConnected(true);
                    setDebugMessage("WebSocket connected");

                    // Subscribe to transactions
                    if (!showAllTransactions && accountToTrack) {
                        // Subscribe to specific account transactions
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'logsSubscribe',
                            params: [
                                {
                                    "mentions": [accountToTrack]
                                },
                                { commitment: 'processed' }
                            ]
                        }));
                        setDebugMessage(`Subscribed to account: ${accountToTrack.substring(0, 6)}...`);
                    } else {
                        // Subscribe to all transactions
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'logsSubscribe',
                            params: [
                                "all",
                                { commitment: 'processed' }
                            ]
                        }));
                        setDebugMessage("Subscribed to all transactions");
                    }

                    // Also send a ping to make sure connection is working
                    setTimeout(() => {
                        try {
                            ws.send(JSON.stringify({
                                jsonrpc: '2.0',
                                id: 999,
                                method: 'ping'
                            }));
                        } catch (e) {
                            console.error("Error sending ping:", e);
                        }
                    }, 2000);
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        // Check if it's a ping response
                        if (message.id === 999) {
                            setDebugMessage("Ping response received");
                            return;
                        }

                        // Check if it's a subscription confirmation
                        if (message.id === 1 && message.result !== undefined) {
                            setDebugMessage("Subscription confirmed: " + message.result);
                            return;
                        }

                        // For all transactions mode, throttle to avoid overwhelming the UI
                        if (showAllTransactions) {
                            const now = Date.now();
                            // Only process every Nth transaction or if enough time has passed
                            if ((now - lastProcessTimeRef.current) < 500) {
                                return; // Skip this transaction if we're processing too many
                            }
                            lastProcessTimeRef.current = now;
                        }

                        // Check if it's a subscription notification
                        if (message.method === 'logsNotification') {
                            try {
                                // Try to extract the signature
                                let signature = "unknown";
                                let status = true;

                                // Sometimes the notification structure differs
                                if (message.params?.result?.value) {
                                    const { value } = message.params.result;

                                    if (typeof value === 'object') {
                                        signature = value.signature || "unknown";
                                        status = value.err === null;
                                    }
                                }

                                // Only process if we got a valid signature
                                if (signature !== "unknown") {
                                    const newTx = {
                                        signature,
                                        status,
                                        timestamp: Date.now(),
                                        id: `${signature}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                                    };

                                    if (slowMode) {
                                        // In slow mode, add to pending queue
                                        setPendingTransactions(prev => {
                                            const updated = [newTx, ...prev];
                                            return updated;
                                        });
                                    } else {
                                        // In real-time mode, add directly to displayed transactions
                                        setTransactions(prev => {
                                            const updated = [newTx, ...prev].slice(0, 10);
                                            return updated;
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error("Error processing notification:", error);
                            }
                        }
                    } catch (error) {
                        console.error('Error processing WebSocket message:', error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setIsConnected(false);
                };

                ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    setIsConnected(false);
                    // Try to reconnect after a delay
                    setTimeout(connect, 3000);
                };
            } catch (error) {
                console.error("Error creating WebSocket:", error);
                setTimeout(connect, 3000);
            }
        };

        connect();

        // Cleanup on component unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [slowMode, accountToTrack, showAllTransactions]);

    return (
        <div className={`w-full h-full flex flex-col bg-bio-surface border-2 border-bio-border rounded-lg ${isNested ? 'p-2' : 'p-3'} ${className}`}>
            {!hideHeader && (
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className={`${isNested ? 'text-base' : 'text-lg'} font-bold`}>Latest Transactions</h2>
                        {!showAllTransactions && accountToTrack && (
                            <div className="text-xs text-gray-400">Account: {accountToTrack.substring(0, 6)}...{accountToTrack.substring(accountToTrack.length - 4)}</div>
                        )}
                        {showAllTransactions && (
                            <div className="text-xs text-gray-400">All Solana Transactions</div>
                        )}
                    </div>

                    <MenuButton>
                        <div className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Slow Mode</span>
                                <button
                                    onClick={() => setSlowMode(!slowMode)}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${slowMode ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span
                                        className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${slowMode ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {slowMode ? 'Showing 3 tx every 3 seconds' : 'Showing transactions in real-time'}
                            </p>
                            {slowMode && pendingTransactions.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {pendingTransactions.length} transactions in queue
                                </p>
                            )}
                        </div>
                    </MenuButton>
                </div>
            )}

            <div className="flex items-center mb-2">
                <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <div className="space-y-2 flex-grow overflow-y-auto min-h-0">
                {transactions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">Waiting for transactions...</div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="p-1 border border-bio-border rounded-md text-sm">
                            <div className="flex items-center justify-between">
                                <div className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                    Success
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(tx.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                            <div className="mt-1 text-xs font-mono truncate">
                                {tx.signature}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LatestTx; 