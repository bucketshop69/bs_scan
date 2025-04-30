"use client";

import { useEffect, useRef } from 'react';
import { useTransactionStore } from '../../store/slices/transactions';

interface TransactionWebSocketProps {
    showAllTransactions: boolean;
    accountToTrack?: string | null;
}

const TransactionWebSocket = ({ showAllTransactions, accountToTrack }: TransactionWebSocketProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const {
        setConnected,
        setError,
        setDebugMessage,
        addTransaction,
        addPendingTransaction,
        updateLastProcessTime,
        slowMode,
        lastProcessTime
    } = useTransactionStore();

    useEffect(() => {
        const connect = () => {
            try {
                const ws = new WebSocket('wss://mainnet.helius-rpc.com/?api-key=dbf616dd-1870-4cdb-a0d2-754ae58a64f0');
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('Connected to Solana WebSocket');
                    setConnected(true);
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

                    // Send ping to verify connection
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

                        // Handle ping response
                        if (message.id === 999) {
                            setDebugMessage("Ping response received");
                            return;
                        }

                        // Handle subscription confirmation
                        if (message.id === 1 && message.result !== undefined) {
                            setDebugMessage("Subscription confirmed: " + message.result);
                            return;
                        }

                        // Throttle processing for all transactions mode
                        if (showAllTransactions) {
                            const now = Date.now();
                            if ((now - lastProcessTime) < 500) {
                                return;
                            }
                            updateLastProcessTime();
                        }

                        // Process transaction notification
                        if (message.method === 'logsNotification') {
                            try {
                                let signature = "unknown";
                                let status = true;

                                if (message.params?.result?.value) {
                                    const { value } = message.params.result;
                                    if (typeof value === 'object') {
                                        signature = value.signature || "unknown";
                                        status = value.err === null;
                                    }
                                }

                                if (signature !== "unknown") {
                                    const newTx = {
                                        signature,
                                        status,
                                        timestamp: Date.now(),
                                        id: `${signature}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                                    };

                                    if (slowMode) {
                                        addPendingTransaction(newTx);
                                    } else {
                                        addTransaction(newTx);
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
                    setConnected(false);
                };

                ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    setConnected(false);
                    setTimeout(connect, 3000);
                };
            } catch (error) {
                console.error("Error creating WebSocket:", error);
                setError("Failed to connect to WebSocket");
                setTimeout(connect, 3000);
            }
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [showAllTransactions, accountToTrack, slowMode, lastProcessTime]);

    return null; // This component doesn't render anything
};

export default TransactionWebSocket; 