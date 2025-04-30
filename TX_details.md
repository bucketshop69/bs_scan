# Transaction Timeline Implementation Plan

## Phase 1: Data Structure & Processing
- [ ] Define core interfaces for timeline data structure
- [ ] Implement transaction processing function
- [ ] Add helper functions for:
  - Time period grouping (month/week/day)
  - Source address identification
  - Transaction type classification
  - Financial calculations

## Phase 2: Basic Timeline View
- [ ] Create Timeline component structure
- [ ] Implement month/week grouping
- [ ] Add basic transaction list per day
- [ ] Add loading states and error handling
- [ ] Implement basic styling for timeline view

## Phase 3: Source Grouping & Activity
- [ ] Add source grouping within days
- [ ] Implement activity level indicators
- [ ] Add transaction type icons/indicators
- [ ] Show basic financial summaries per source
- [ ] Add source address labels/identifiers

## Phase 4: Enhanced UI & Interactions
- [ ] Add GitHub-style activity calendar
- [ ] Implement source relationship indicators
- [ ] Add transaction filtering options
- [ ] Implement expandable transaction details
- [ ] Add tooltips and hover states

## Phase 5: Performance & Optimization
- [ ] Implement virtual scrolling for large lists
- [ ] Add data caching
- [ ] Optimize re-renders
- [ ] Add loading states for large data sets
- [ ] Implement progressive loading

## Phase 6: Additional Features
- [ ] Add transaction search
- [ ] Implement transaction filtering by type
- [ ] Add date range selection
- [ ] Add export functionality
- [ ] Implement transaction tagging

## Technical Notes

### Data Structure
```typescript
interface TimelineData {
  byTimePeriod: {
    [timePeriodKey: string]: {
      label: string;
      totalTransactions: number;
      days: {
        [dateKey: string]: {
          label: string;
          date: Date;
          bySources: {
            [sourceAddress: string]: {
              address: string;
              transactions: HeliusParsedTransaction[];
            }
          }
        }
      }
    }
  }
}
```

### Key Functions
1. `processTransactions`: Convert raw transactions to timeline structure
2. `groupByTimePeriod`: Organize transactions by month/week
3. `identifySource`: Determine the relevant source address for a transaction
4. `calculateActivityLevel`: Determine activity level for a day/period

### UI Components
1. `TimelineView`: Main container component
2. `TimePeriodGroup`: Renders a month/week of transactions
3. `DayGroup`: Renders a single day's transactions
4. `SourceGroup`: Renders transactions from a single source
5. `TransactionItem`: Renders individual transaction details

### Styling Approach
- Use Tailwind CSS for consistent styling
- Implement GitHub-style activity indicators
- Add responsive design for mobile view
- Use consistent color scheme for transaction types
- Add smooth transitions and animations 