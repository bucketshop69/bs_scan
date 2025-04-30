import { PublicKey } from '@solana/web3.js';

export interface Transaction {
    signature: string;
    status: boolean;
    timestamp: number;
    id: string;
}

export interface HeliusParsedTransaction {
    signature: string;
    timestamp: number;
    type: string;
    fee: number;
    feePayer: string;
    status: string;
    instructions: any[];
    events: any[];
}

export interface TokenBalanceInfo {
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
    uiAmount: number;
}

export interface AccountState {
    publicKey: PublicKey | null;
    solBalance: number | null;
    tokenBalances: TokenBalanceInfo[] | null;
    accountType: string | null;
    error: string | null;
    isLoading: boolean;
    recentTransactions: HeliusParsedTransaction[];
    lastSignature: string | null;
    hasMore: boolean;
    loadingMore: boolean;
    spamFiltered: number;
}

export interface UIState {
    isLoading: boolean;
    error: string | null;
    showRawData: boolean;
    showAccounts: boolean;
    showPrograms: boolean;
    theme: 'light' | 'dark';
}

export interface TransactionState {
    transactions: Transaction[];
    pendingTransactions: Transaction[];
    isConnected: boolean;
    slowMode: boolean;
    error: string | null;
    isLoading: boolean;
    debugMessage: string;
    lastProcessTime: number;

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