import React from 'react';
import { SourceGroup as SourceGroupType } from '../../utils/timeline/types';
import Link from 'next/link';

interface SourceGroupProps {
    sourceAddress: string;
    data: SourceGroupType;
}

export default function SourceGroup({ sourceAddress, data }: SourceGroupProps) {
    return (
        <div className="border border-bio-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <Link
                        href={`/address/${sourceAddress}`}
                        className="text-bio-primary hover:text-bio-secondary transition-colors"
                    >
                        {data.label || `${sourceAddress.slice(0, 8)}...${sourceAddress.slice(-8)}`}
                    </Link>
                    {data.type && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {data.type}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-bio-text-secondary">
                        <span className="text-green-600">+{data.solReceived.toFixed(2)} SOL</span>
                        <span className="mx-2">/</span>
                        <span className="text-red-600">-{data.solSent.toFixed(2)} SOL</span>
                    </div>
                    <span className="text-sm text-bio-text-secondary">
                        {data.totalTransactions} transactions
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {data.transactions.map((tx) => (
                    <div
                        key={tx.signature}
                        className="flex items-center justify-between p-2 hover:bg-bio-base rounded"
                    >
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${tx.status === "SUCCESS" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}>
                                {tx.status}
                            </span>
                            <span className="text-sm text-bio-text-primary">{tx.type}</span>
                            <span className="text-sm text-bio-text-secondary">{tx.description}</span>
                        </div>
                        <Link
                            href={`/tx/${tx.signature}`}
                            className="text-sm text-bio-primary hover:text-bio-secondary transition-colors"
                        >
                            {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
} 