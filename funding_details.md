# Funding Sources Feature Implementation Plan

## Overview
This feature will extract, process, and display the recent funding sources for a Solana address, tracking both SOL and token transfers sent TO the viewed address. This will help users quickly identify where funds came from.

## Implementation Phases

### Phase 1: Data Extraction and Filtering

```typescript
interface FundingInflow {
  source: string;         // Source wallet address 
  amount: number;         // Amount in raw form (lamports for SOL, tokens for SPL)
  type: 'SOL' | 'Token';  // Type of transfer 
  mint?: string;          // Token mint address (only for token transfers)
  timestamp: number;      // Transaction timestamp
  signature: string;      // Transaction signature for linking
}
```

Implementation approach:
- Create a new state variable: `const [fundingInflows, setFundingInflows] = useState<FundingInflow[]>([]);`
- Create a new useEffect that triggers when `recentTransactions` changes
- Process function will:
  ```typescript
  const processFundingInflows = useCallback(() => {
    if (!recentTransactions || !publicKey) return;
    
    const inflows: FundingInflow[] = [];
    const addressString = publicKey.toString();
    
    // Loop through each transaction
    recentTransactions.forEach(tx => {
      // Check native SOL transfers
      tx.nativeTransfers?.forEach(transfer => {
        if (transfer.toUserAccount === addressString) {
          inflows.push({
            source: transfer.fromUserAccount,
            amount: transfer.amount,
            type: 'SOL',
            timestamp: tx.timestamp,
            signature: tx.signature
          });
        }
      });
      
      // Check token transfers
      tx.tokenTransfers?.forEach(transfer => {
        if (transfer.toUserAccount === addressString) {
          inflows.push({
            source: transfer.fromUserAccount,
            amount: transfer.tokenAmount,
            type: 'Token',
            mint: transfer.mint,
            timestamp: tx.timestamp,
            signature: tx.signature
          });
        }
      });
    });
    
    // Sort by timestamp (newest first)
    inflows.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply minimum threshold filter (optional)
    const filteredInflows = inflows.filter(inflow => 
      inflow.type === 'SOL' ? inflow.amount > 10000 : true
    );
    
    // Set state
    setFundingInflows(filteredInflows);
  }, [recentTransactions, publicKey]);
  ```

### Phase 2: UI Component

Add a new section to the UI:

```tsx
<div className="mt-8">
  <h2 className="text-xl font-semibold mb-4 text-bio-primary">
    Recent Funding Sources
  </h2>
  
  {fundingInflows && fundingInflows.length > 0 ? (
    <div className="border border-bio-border rounded-lg">
      <table className="min-w-full divide-y divide-bio-border">
        <thead className="bg-bio-base">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">From</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Asset</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-bio-text-secondary uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody className="bg-bio-surface divide-y divide-bio-border">
          {fundingInflows.map((inflow, index) => (
            <tr key={`${inflow.signature}-${index}`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-primary">
                <Link
                  href={`/address/${inflow.source}`}
                  className="hover:underline"
                >
                  {inflow.source.slice(0, 8)}...{inflow.source.slice(-8)}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                {inflow.type === 'SOL' 
                  ? formatSOL(inflow.amount)
                  : formatTokenAmount(inflow.amount, inflow.mint ? TOKEN_MINTS[inflow.mint]?.decimals || 0 : 0)
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                {inflow.type === 'SOL' 
                  ? 'SOL'
                  : getTokenSymbol(inflow.mint || '')
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-bio-text-primary">
                {formatTimeAgo(inflow.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-bio-text-secondary">No significant funding sources found in the transaction history.</p>
  )}
</div>
```

## Technical Considerations and Answers to Previous Questions

1. **HeliusParsedTransaction structure**: From the code exploration, we've confirmed the HeliusParsedTransaction type does include the `nativeTransfers` and `tokenTransfers` arrays we need.

2. **Token formatting utilities**: The codebase has:
   - `formatSOL(lamports)` for formatting SOL amounts
   - `formatTokenAmount(amount, decimals)` for formatting token amounts
   - `getTokenSymbol(mintAddress)` for getting token symbols

3. **Address formatting**: No existing `getLabel` utility was found, but the codebase consistently uses the pattern `address.slice(0, 8)}...{address.slice(-8)` for shortening addresses.

4. **Transaction processing**: We'll process directly from the `recentTransactions` array, which already contains parsed transaction data from Helius API.

5. **Dust filtering thresholds**: We'll implement a filtering approach that ignores SOL transfers below 10,000 lamports (0.00001 SOL) to filter out dust transactions.

## Implementation Approach

1. Add the new state variable for funding inflows
2. Implement the processing function in a useEffect
3. Add the UI component to display the data
4. Apply formatting and filtering
5. Style according to the existing UI patterns

This feature should require minimal changes to existing code and can be implemented as an enhancement to the address details page. 