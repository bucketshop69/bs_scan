import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UIState } from '../types';

// DevTools configuration for UI store
const devToolsOptions = {
    name: 'UI Store',
    enabled: process.env.NODE_ENV === 'development',
    serialize: {
        // Custom serialization for UI state
        replacer: (key: string, value: any) => {
            if (key === 'theme') {
                return value;
            }
            return value;
        }
    },
    actionSanitizer: (action: any) => {
        // Sanitize UI actions
        if (action.type?.includes('ui')) {
            return {
                ...action,
                // Add any sanitization for UI actions
            };
        }
        return action;
    }
};

interface UIStore extends UIState {
    // Actions
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setShowRawData: (show: boolean) => void;
    setShowAccounts: (show: boolean) => void;
    setShowPrograms: (show: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    reset: () => void;
}

const initialState: UIState = {
    isLoading: false,
    error: null,
    showRawData: false,
    showAccounts: false,
    showPrograms: false,
    theme: 'light',
};

export const useUIStore = create<UIStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setIsLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setShowRawData: (showRawData) => set({ showRawData }),
            setShowAccounts: (showAccounts) => set({ showAccounts }),
            setShowPrograms: (showPrograms) => set({ showPrograms }),
            setTheme: (theme) => set({ theme }),
            reset: () => set(initialState),
        }),
        devToolsOptions
    )
);

export default useUIStore; 