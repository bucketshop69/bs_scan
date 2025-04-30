"use client"

import React, { useEffect } from 'react';
import MenuButton from './MenuButton';
import TransactionWebSocket from './TransactionWebSocket';
import { useTransactionStore } from '../../store/slices/transactions';
import { Transaction } from '../../store/types';

interface LatestTxProps {
    isNested?: boolean;
    customAccount?: string;
    hideHeader?: boolean;
    className?: string;
}

// Specific account we want to track
const ACCOUNT_TO_TRACK = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

const LatestTx = ({ isNested = false, customAccount, hideHeader = false, className = "" }: LatestTxProps) => {
    // Check if we want all transactions or a specific account
    const showAllTransactions = customAccount === "";

    // Account to track (if not showing all transactions)
    const accountToTrack = showAllTransactions ? null : (customAccount || ACCOUNT_TO_TRACK);

    // Get state and actions from the store
    const {
        transactions,
        pendingTransactions,
        isConnected,
        slowMode,
        debugMessage,
        setSlowMode,
        processPendingTransactions,
        processInitialBatch
    } = useTransactionStore();

    // Process and display transactions
    useEffect(() => {
        const TX_RATE_LIMIT = showAllTransactions ? 3 : 10; // Fewer transactions for "all" mode

        if (!slowMode) {
            // If slow mode is off, immediately add pending transactions to the display
            if (pendingTransactions.length > 0) {
                processPendingTransactions(pendingTransactions.length);
            }
            return;
        }

        // Force display of initial transactions immediately
        if (pendingTransactions.length > 0 && transactions.length === 0) {
            processInitialBatch();
        }

        // In slow mode, update every 3 seconds
        const interval = setInterval(() => {
            if (pendingTransactions.length > 0) {
                processPendingTransactions(TX_RATE_LIMIT);
            }
        }, showAllTransactions ? 1000 : 3000);

        return () => clearInterval(interval);
    }, [slowMode, pendingTransactions, transactions, showAllTransactions]);

    return (
        <div className={`w-full h-full flex flex-col bg-bio-surface border-2 border-bio-border rounded-lg ${isNested ? 'p-2' : 'p-3'} ${className}`}>
            {!hideHeader && (
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className={`${isNested ? 'text-base' : 'text-lg'} font-bold`}>Latest Transactions</h2>
                        {debugMessage && (
                            <p className="text-xs text-gray-500">{debugMessage}</p>
                        )}
                    </div>
                    <MenuButton>
                        <button
                            onClick={() => setSlowMode(!slowMode)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                            {slowMode ? 'Disable Slow Mode' : 'Enable Slow Mode'}
                        </button>
                    </MenuButton>
                </div>
            )}

            {/* Transaction WebSocket Component */}
            <TransactionWebSocket
                showAllTransactions={showAllTransactions}
                accountToTrack={accountToTrack}
            />

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">
                            {isConnected ? 'No transactions yet' : 'Connecting...'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {transactions.map((tx: Transaction) => (
                            <li
                                key={tx.id}
                                className={`p-2 rounded ${tx.status ? 'bg-green-50' : 'bg-red-50'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm">
                                        {tx.signature.substring(0, 8)}...
                                        {tx.signature.substring(tx.signature.length - 8)}
                                    </span>
                                    <span
                                        className={`text-xs ${tx.status ? 'text-green-600' : 'text-red-600'
                                            }`}
                                    >
                                        {tx.status ? 'Success' : 'Failed'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(tx.timestamp).toLocaleTimeString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default LatestTx; 