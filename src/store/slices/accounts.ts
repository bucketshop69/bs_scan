import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { PublicKey } from '@solana/web3.js';
import { AccountState, TokenBalanceInfo, HeliusParsedTransaction } from '../types';

// DevTools configuration for account store
const devToolsOptions = {
    name: 'Account Store',
    enabled: process.env.NODE_ENV === 'development',
    serialize: {
        // Custom serialization for account data
        replacer: (key: string, value: any) => {
            if (key === 'publicKey' && value) {
                return value.toString();
            }
            if (key === 'tokenBalances') {
                return value?.map((balance: TokenBalanceInfo) => ({
                    ...balance,
                    // Add any custom serialization for token balances
                }));
            }
            return value;
        }
    },
    actionSanitizer: (action: any) => {
        // Sanitize account actions
        if (action.type?.includes('account')) {
            return {
                ...action,
                // Add any sanitization for account actions
            };
        }
        return action;
    }
};

interface AccountStore extends AccountState {
    // Actions
    setPublicKey: (publicKey: PublicKey | null) => void;
    setSolBalance: (balance: number | null) => void;
    setTokenBalances: (balances: TokenBalanceInfo[] | null) => void;
    setAccountType: (type: string | null) => void;
    setError: (error: string | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    // Transaction-related actions
    addTransactions: (transactions: HeliusParsedTransaction[]) => void;
    setLastSignature: (signature: string | null) => void;
    setHasMore: (hasMore: boolean) => void;
    setLoadingMore: (loadingMore: boolean) => void;
    setSpamFiltered: (count: number) => void;
    reset: () => void;
}

const initialState: AccountState = {
    publicKey: null,
    solBalance: null,
    tokenBalances: null,
    accountType: null,
    error: null,
    isLoading: false,
    recentTransactions: [],
    lastSignature: null,
    hasMore: false,
    loadingMore: false,
    spamFiltered: 0,
};

export const useAccountStore = create<AccountStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setPublicKey: (publicKey) => set({ publicKey }),
            setSolBalance: (solBalance) => set({ solBalance }),
            setTokenBalances: (tokenBalances) => set({ tokenBalances }),
            setAccountType: (accountType) => set({ accountType }),
            setError: (error) => set({ error }),
            setIsLoading: (isLoading) => set({ isLoading }),
            addTransactions: (transactions) =>
                set((state) => ({
                    recentTransactions: [...state.recentTransactions, ...transactions],
                })),
            setLastSignature: (lastSignature) => set({ lastSignature }),
            setHasMore: (hasMore) => set({ hasMore }),
            setLoadingMore: (loadingMore) => set({ loadingMore }),
            setSpamFiltered: (spamFiltered) => set({ spamFiltered }),
            reset: () => set(initialState),
        }),
        devToolsOptions
    )
);

export default useAccountStore; 