# State Management Documentation

## Overview
This document describes the state management implementation using Zustand in the Solana blockchain explorer application. The state is divided into three main slices: transactions, accounts, and UI.

## Store Structure

### Transaction Store
Manages transaction-related state and actions.

```typescript
interface TransactionStore {
    // State
    transactions: Transaction[];
    pendingTransactions: Transaction[];
    isConnected: boolean;
    slowMode: boolean;
    error: string | null;
    isLoading: boolean;
    debugMessage: string;
    lastProcessTime: number;

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
```

### Account Store
Manages account-related state and actions.

```typescript
interface AccountStore {
    // State
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

    // Actions
    setPublicKey: (publicKey: PublicKey | null) => void;
    setSolBalance: (balance: number | null) => void;
    setTokenBalances: (balances: TokenBalanceInfo[] | null) => void;
    setAccountType: (type: string | null) => void;
    setError: (error: string | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    addTransactions: (transactions: HeliusParsedTransaction[]) => void;
    setLastSignature: (signature: string | null) => void;
    setHasMore: (hasMore: boolean) => void;
    setLoadingMore: (loadingMore: boolean) => void;
    setSpamFiltered: (count: number) => void;
    reset: () => void;
}
```

### UI Store
Manages UI-related state and actions.

```typescript
interface UIStore {
    // State
    isLoading: boolean;
    error: string | null;
    showRawData: boolean;
    showAccounts: boolean;
    showPrograms: boolean;
    theme: 'light' | 'dark';

    // Actions
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setShowRawData: (show: boolean) => void;
    setShowAccounts: (show: boolean) => void;
    setShowPrograms: (show: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    reset: () => void;
}
```

## Usage Examples

### Using Store Slices
```typescript
import { useTransactionStore, useAccountStore, useUIStore } from '@/store';

function MyComponent() {
    // Transaction store
    const { transactions, addTransaction } = useTransactionStore();
    
    // Account store
    const { publicKey, solBalance } = useAccountStore();
    
    // UI store
    const { theme, setTheme } = useUIStore();
}
```

### Using Memoized Selectors
```typescript
import { useAccountData, useUIState, useRecentTransactions } from '@/store';

function MyComponent() {
    const { publicKey, solBalance } = useAccountData();
    const { theme, showRawData } = useUIState();
    const transactions = useRecentTransactions();
}
```

### Using Error Boundary
```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <YourApp />
        </ErrorBoundary>
    );
}
```

## Performance Optimizations

1. **Memoized Selectors**
   - Use `useAccountData`, `useUIState`, and `useRecentTransactions` for efficient state access
   - These selectors prevent unnecessary re-renders

2. **Batch Processing**
   - Transactions are processed in batches to optimize performance
   - Rate limiting is implemented to prevent overwhelming the UI

3. **Error Handling**
   - Global error state management
   - Error boundaries for graceful error recovery
   - Debug messages for development

## Best Practices

1. **State Updates**
   - Use the provided actions instead of directly modifying state
   - Batch related state updates together
   - Use the reset actions to clear state when needed

2. **Performance**
   - Use memoized selectors for derived state
   - Avoid unnecessary state updates
   - Use the error boundary for error handling

3. **Type Safety**
   - All state and actions are fully typed
   - Use TypeScript for type checking
   - Follow the provided interfaces

## Migration Guide

When migrating components to use the Zustand store:

1. Identify the state being managed
2. Choose the appropriate store slice
3. Replace local state with store state
4. Use the provided actions for state updates
5. Add error handling using the error boundary
6. Test the component thoroughly

## Troubleshooting

Common issues and solutions:

1. **State Not Updating**
   - Ensure you're using the correct action
   - Check for type mismatches
   - Verify the store slice is properly imported

2. **Performance Issues**
   - Use memoized selectors
   - Check for unnecessary re-renders
   - Implement batch processing where appropriate

3. **Error Handling**
   - Use the error boundary
   - Check the global error state
   - Review debug messages 