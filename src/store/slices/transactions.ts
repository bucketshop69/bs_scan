import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TransactionState, Transaction, HeliusParsedTransaction } from '../types';

// DevTools configuration for transaction store
const devToolsOptions = {
    name: 'Transaction Store',
    enabled: process.env.NODE_ENV === 'development',
    serialize: {
        // Custom serialization for transactions
        replacer: (key: string, value: any) => {
            if (key === 'transactions' || key === 'pendingTransactions') {
                return value.map((tx: Transaction) => ({
                    ...tx,
                    // Add any custom serialization for transactions
                }));
            }
            return value;
        }
    },
    actionSanitizer: (action: any) => {
        // Sanitize transaction actions
        if (action.type?.includes('transaction')) {
            return {
                ...action,
                // Add any sanitization for transaction actions
            };
        }
        return action;
    }
};

interface TransactionStore extends TransactionState {
    // Actions
    addTransaction: (transaction: Transaction) => void;
    addPendingTransaction: (transaction: Transaction) => void;
    setSlowMode: (mode: boolean) => void;
    clearTransactions: () => void;
    setConnected: (connected: boolean) => void;
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
    setDebugMessage: (message: string) => void;
    updateLastProcessTime: () => void;
    processPendingTransactions: (rateLimit: number) => void;
    processInitialBatch: () => void;
}

const initialState: TransactionState = {
    transactions: [],
    pendingTransactions: [],
    isConnected: false,
    slowMode: false,
    error: null,
    isLoading: false,
    debugMessage: '',
    lastProcessTime: 0,
};

export const useTransactionStore = create<TransactionStore>()(
    devtools(
        (set, get) => ({
            ...initialState,
            addTransaction: (transaction) =>
                set((state) => ({
                    transactions: [...state.transactions, transaction],
                })),
            addPendingTransaction: (transaction) =>
                set((state) => ({
                    pendingTransactions: [...state.pendingTransactions, transaction],
                })),
            setSlowMode: (slowMode) => set({ slowMode }),
            clearTransactions: () => set({ transactions: [], pendingTransactions: [] }),
            setConnected: (isConnected) => set({ isConnected }),
            setError: (error) => set({ error }),
            setLoading: (isLoading) => set({ isLoading }),
            setDebugMessage: (debugMessage) => set({ debugMessage }),
            updateLastProcessTime: () => set({ lastProcessTime: Date.now() }),
            processPendingTransactions: (rateLimit) => {
                const state = get();
                const now = Date.now();
                if (now - state.lastProcessTime < rateLimit) return;

                const batch = state.pendingTransactions.slice(0, 10);
                if (batch.length === 0) return;

                set((state) => ({
                    transactions: [...state.transactions, ...batch],
                    pendingTransactions: state.pendingTransactions.slice(10),
                    lastProcessTime: now,
                }));
            },
            processInitialBatch: () => {
                const state = get();
                const batch = state.pendingTransactions.slice(0, 20);
                if (batch.length === 0) return;

                set((state) => ({
                    transactions: [...state.transactions, ...batch],
                    pendingTransactions: state.pendingTransactions.slice(20),
                    lastProcessTime: Date.now(),
                }));
            },
        }),
        devToolsOptions
    )
);

export default useTransactionStore; 