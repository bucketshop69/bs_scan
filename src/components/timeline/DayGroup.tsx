import React from 'react';
import { DayGroup as DayGroupType } from '../../utils/timeline/types';
import SourceGroup from './SourceGroup';

interface DayGroupProps {
    dayKey: string;
    data: DayGroupType;
}

export default function DayGroup({ dayKey, data }: DayGroupProps) {
    const getActivityColor = (level: "LOW" | "MEDIUM" | "HIGH") => {
        switch (level) {
            case "HIGH":
                return "bg-green-100 text-green-800";
            case "MEDIUM":
                return "bg-yellow-100 text-yellow-800";
            case "LOW":
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="border border-bio-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <span className="font-medium text-bio-text-primary">{data.label}</span>
                    <span className="text-sm text-bio-text-secondary">{data.dayOfWeek}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getActivityColor(data.activityLevel)}`}>
                        {data.activityLevel}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-bio-text-secondary">
                        {data.totalTransactions} transactions
                    </span>
                    <span className="text-sm text-bio-text-secondary">
                        {data.totalValue.toFixed(2)} SOL
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {Object.entries(data.bySources)
                    .sort(([a], [b]) => b.localeCompare(a)) // Sort sources in descending order
                    .map(([sourceAddress, sourceData]) => (
                        <SourceGroup
                            key={sourceAddress}
                            sourceAddress={sourceAddress}
                            data={sourceData}
                        />
                    ))}
            </div>
        </div>
    );
} 