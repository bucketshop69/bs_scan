# Solana Blockchain Explorer

A modern web application for exploring the Solana blockchain.

## Features

- Real-time transaction monitoring
- Account details and token balances
- Transaction history and analysis
- Modern UI with theme support
- Error handling and recovery

## State Management

This project uses Zustand for state management. The state is divided into three main slices:

1. **Transaction Store**: Manages transaction-related state and actions
2. **Account Store**: Handles account details and token balances
3. **UI Store**: Controls UI state and theme preferences

For detailed documentation on state management, see [docs/state-management.md](docs/state-management.md).

### Key Features

- Type-safe state management
- Performance-optimized selectors
- Batch processing for transactions
- Error boundaries for graceful error handling
- Theme support with persistence

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### State Management

When working with state:

1. Use the appropriate store slice for your needs
2. Follow the TypeScript interfaces
3. Use memoized selectors for performance
4. Implement error boundaries where needed

Example:
```typescript
import { useAccountData, useUIState } from '@/store';

function MyComponent() {
    const { publicKey, solBalance } = useAccountData();
    const { theme } = useUIState();
    // ...
}
```

### Error Handling

Use the error boundary component for graceful error handling:

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
