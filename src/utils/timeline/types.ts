import { HeliusParsedTransaction } from "../../types/helius";

export interface TimelineTransaction {
    signature: string;
    timestamp: number;
    type: string;
    description: string;
    source: string;
    solAmount?: number;
    status: "SUCCESS" | "FAILED";
}

export interface SourceGroup {
    address: string;
    label?: string;
    type?: string;
    transactions: TimelineTransaction[];
    totalTransactions: number;
    solSent: number;
    solReceived: number;
}

export interface DayGroup {
    label: string;
    date: Date;
    dayOfWeek: string;
    totalTransactions: number;
    totalValue: number;
    activityLevel: "LOW" | "MEDIUM" | "HIGH";
    bySources: {
        [sourceAddress: string]: SourceGroup;
    };
}

export interface TimePeriodGroup {
    label: string;
    totalTransactions: number;
    totalValue: number;
    days: {
        [dateKey: string]: DayGroup;
    };
}

export interface TimelineData {
    byTimePeriod: {
        [timePeriodKey: string]: TimePeriodGroup;
    };
} 