import { HeliusParsedTransaction } from "../../types/helius";
import { TimelineData, TimelineTransaction, SourceGroup, DayGroup, TimePeriodGroup } from "./types";

export function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function getTimePeriodKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

export function getDayOfWeek(date: Date): string {
    return date.toLocaleString('default', { weekday: 'short' });
}

export function calculateActivityLevel(transactionCount: number): "LOW" | "MEDIUM" | "HIGH" {
    if (transactionCount > 20) return "HIGH";
    if (transactionCount > 5) return "MEDIUM";
    return "LOW";
}

export function processTransaction(
    tx: HeliusParsedTransaction,
    currentAddress: string
): TimelineTransaction {
    // Extract basic transaction info
    const processedTx: TimelineTransaction = {
        signature: tx.signature,
        timestamp: tx.timestamp,
        type: tx.type || "UNKNOWN",
        description: tx.description || "",
        source: "",
        status: tx.transactionError ? "FAILED" : "SUCCESS"
    };

    // Determine source address based on transaction type
    if (tx.type === "TRANSFER") {
        // Check if events is an array before using find
        const transferEvent = Array.isArray(tx.events) ? tx.events.find(e => e.type === "transfer") : undefined;
        if (transferEvent) {
            const accounts = transferEvent.accounts || [];
            processedTx.source = accounts.find(a => a !== currentAddress) || "";

            // Calculate SOL amount if available
            if (transferEvent.data?.amount) {
                processedTx.solAmount = transferEvent.data.amount / 1e9; // Convert lamports to SOL
            }
        }
    } else if (tx.type === "SWAP") {
        processedTx.source = tx.programId || "";
    } else {
        // For other transaction types, use the first account that's not the current address
        const accounts = tx.accountData || [];
        processedTx.source = accounts.find(a => a.pubkey !== currentAddress)?.pubkey || "";
    }

    return processedTx;
}

export function processTransactions(
    transactions: HeliusParsedTransaction[],
    currentAddress: string
): TimelineData {
    const timelineData: TimelineData = {
        byTimePeriod: {}
    };

    // Process each transaction
    transactions.forEach(tx => {
        const processedTx = processTransaction(tx, currentAddress);
        const txDate = new Date(tx.timestamp * 1000);

        // Get period and day keys
        const periodKey = getTimePeriodKey(txDate);
        const dayKey = formatDateKey(txDate);

        // Initialize period if it doesn't exist
        if (!timelineData.byTimePeriod[periodKey]) {
            timelineData.byTimePeriod[periodKey] = {
                label: txDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                totalTransactions: 0,
                totalValue: 0,
                days: {}
            };
        }

        // Initialize day if it doesn't exist
        if (!timelineData.byTimePeriod[periodKey].days[dayKey]) {
            timelineData.byTimePeriod[periodKey].days[dayKey] = {
                label: txDate.toLocaleString('default', { month: 'short', day: 'numeric' }),
                date: txDate,
                dayOfWeek: getDayOfWeek(txDate),
                totalTransactions: 0,
                totalValue: 0,
                activityLevel: "LOW",
                bySources: {}
            };
        }

        // Initialize source if it doesn't exist
        if (!timelineData.byTimePeriod[periodKey].days[dayKey].bySources[processedTx.source]) {
            timelineData.byTimePeriod[periodKey].days[dayKey].bySources[processedTx.source] = {
                address: processedTx.source,
                transactions: [],
                totalTransactions: 0,
                solSent: 0,
                solReceived: 0
            };
        }

        // Add transaction to source group
        const sourceGroup = timelineData.byTimePeriod[periodKey].days[dayKey].bySources[processedTx.source];
        sourceGroup.transactions.push(processedTx);
        sourceGroup.totalTransactions++;

        // Update SOL amounts
        if (processedTx.solAmount) {
            if (processedTx.type === "TRANSFER") {
                // Determine if this is a send or receive
                // Check if events is an array before using find
                const transferEvent = Array.isArray(tx.events) ? tx.events.find(e => e.type === "transfer") : undefined;
                if (transferEvent?.data?.source === currentAddress) {
                    sourceGroup.solSent += processedTx.solAmount;
                } else {
                    sourceGroup.solReceived += processedTx.solAmount;
                }
            }
        }

        // Update day totals
        const dayGroup = timelineData.byTimePeriod[periodKey].days[dayKey];
        dayGroup.totalTransactions++;
        dayGroup.totalValue += processedTx.solAmount || 0;

        // Update period totals
        const periodGroup = timelineData.byTimePeriod[periodKey];
        periodGroup.totalTransactions++;
        periodGroup.totalValue += processedTx.solAmount || 0;
    });

    // Calculate activity levels for each day
    Object.values(timelineData.byTimePeriod).forEach(period => {
        Object.values(period.days).forEach(day => {
            day.activityLevel = calculateActivityLevel(day.totalTransactions);
        });
    });

    return timelineData;
}

export interface ActivityData {
    [date: string]: {
        count: number;
        level: "NONE" | "LOW" | "MEDIUM" | "HIGH";
    };
}

// Type for the data structure expected by react-calendar-heatmap
export interface HeatmapValue {
    date: string; // YYYY-MM-DD
    count: number;
    level: "NONE" | "LOW" | "MEDIUM" | "HIGH"; // Keep level for styling
}

// Helper function to get all dates in a range
function getDatesInRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(formatDateKey(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// Updated function to return an array of HeatmapValue
export function prepareActivityData(
    timelineData: TimelineData,
    daysInPast: number = 365
): HeatmapValue[] {
    const activityMap: { [date: string]: { count: number; level: "NONE" | "LOW" | "MEDIUM" | "HIGH" } } = {};

    // Determine date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysInPast + 1);

    // Initialize all dates in the range with 0 count
    const allDates = getDatesInRange(startDate, endDate);
    allDates.forEach(dateStr => {
        activityMap[dateStr] = { count: 0, level: "NONE" };
    });

    // Populate map with actual data from timeline
    Object.values(timelineData.byTimePeriod).forEach(period => {
        Object.entries(period.days).forEach(([dateKey, dayData]) => {
            // Only include dates within our desired range
            if (activityMap.hasOwnProperty(dateKey)) {
                activityMap[dateKey] = {
                    count: dayData.totalTransactions,
                    level: dayData.totalTransactions === 0 ? "NONE" : calculateActivityLevel(dayData.totalTransactions)
                };
            }
        });
    });

    // Convert map to array format required by the heatmap library
    const heatmapValues: HeatmapValue[] = Object.entries(activityMap).map(([date, data]) => ({
        date,
        count: data.count,
        level: data.level
    }));

    return heatmapValues;
} 