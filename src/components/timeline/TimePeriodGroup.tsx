import React from 'react';
import { TimePeriodGroup as TimePeriodGroupType } from '../../utils/timeline/types';
import DayGroup from './DayGroup';

interface TimePeriodGroupProps {
    periodKey: string;
    data: TimePeriodGroupType;
}

export default function TimePeriodGroup({ periodKey, data }: TimePeriodGroupProps) {
    return (
        <div className="bg-bio-surface p-6 border-2 border-bio-border rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-bio-primary">{data.label}</h2>
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
                {Object.entries(data.days)
                    .sort(([a], [b]) => b.localeCompare(a)) // Sort days in descending order
                    .map(([dayKey, dayData]) => (
                        <DayGroup
                            key={dayKey}
                            dayKey={dayKey}
                            data={dayData}
                        />
                    ))}
            </div>
        </div>
    );
} 