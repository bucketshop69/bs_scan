import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TransactionState, AccountState, UIState } from './types';
import { useAccountStore } from './slices/accounts';
import { useUIStore } from './slices/ui';
import { useTransactionStore } from './slices/transactions';
import { shallow } from 'zustand/shallow';

// Type definition for Redux DevTools Extension
declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: any;
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any;
    }
}

// DevTools configuration
const devToolsOptions = {
    name: 'Solana Explorer Store',
    enabled: process.env.NODE_ENV === 'development',
    // Add any additional DevTools options here
    serialize: {
        // Custom serialization options if needed
    },
    actionSanitizer: (action: any) => {
        // Sanitize actions if needed
        return action;
    },
    stateSanitizer: (state: any) => {
        // Sanitize state if needed
        return state;
    }
};

// Create the store with devtools middleware
export const useStore = create<TransactionState & AccountState & UIState>()(
    devtools(
        (set) => ({
            // Transaction State
            transactions: [],
            pendingTransactions: [],
            isConnected: false,
            slowMode: false,

            // Account State
            publicKey: null,
            solBalance: null,
            tokenBalances: null,
            accountType: null,

            // UI State
            isLoading: false,
            error: null,
            showRawData: false,
            showAccounts: true,
            showPrograms: true,
            theme: 'dark',
        }),
        devToolsOptions
    )
);

// Export all store slices
export { useAccountStore, useUIStore, useTransactionStore };

// Performance optimized selectors
export const useIsLoading = () => {
    const accountLoading = useAccountStore((state) => state.isLoading);
    const uiLoading = useUIStore((state) => state.isLoading);
    const txLoading = useTransactionStore((state) => state.isLoading);
    return accountLoading || uiLoading || txLoading;
};

export const useError = () => {
    const accountError = useAccountStore((state) => state.error);
    const uiError = useUIStore((state) => state.error);
    const txError = useTransactionStore((state) => state.error);
    return accountError || uiError || txError;
};

// Memoized selectors for transaction data
export const useRecentTransactions = () => {
    return useTransactionStore((state) => state.transactions);
};

export const usePendingTransactions = () => {
    return useTransactionStore((state) => state.pendingTransactions);
};

// Memoized selectors for account data
export const useAccountData = () => {
    return useAccountStore((state) => ({
        publicKey: state.publicKey,
        solBalance: state.solBalance,
        tokenBalances: state.tokenBalances,
        accountType: state.accountType,
    }));
};

// Memoized selectors for UI state
export const useUIState = () => {
    return useUIStore((state) => ({
        showRawData: state.showRawData,
        showAccounts: state.showAccounts,
        showPrograms: state.showPrograms,
        theme: state.theme,
    }));
}; 