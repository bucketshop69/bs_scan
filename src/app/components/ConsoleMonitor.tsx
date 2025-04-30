"use client";

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
    type: 'log' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
}

export default function ConsoleMonitor() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [hasCapturedError, setHasCapturedError] = useState(false);
    const maxLogs = 50; // Maximum number of logs to keep
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Original console methods
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        };

        // Override console methods to capture logs
        console.log = function (...args) {
            addLogEntry('log', args);
            originalConsole.log.apply(console, args);
        };

        console.info = function (...args) {
            addLogEntry('info', args);
            originalConsole.info.apply(console, args);
        };

        console.warn = function (...args) {
            addLogEntry('warn', args);
            originalConsole.warn.apply(console, args);
        };

        console.error = function (...args) {
            addLogEntry('error', args);
            setHasCapturedError(true);
            originalConsole.error.apply(console, args);
        };

        // Global error handler
        const handleGlobalError = (event: ErrorEvent) => {
            addLogEntry('error', [`Uncaught: ${event.message}`, `at ${event.filename}:${event.lineno}:${event.colno}`]);
            setHasCapturedError(true);
        };

        // Unhandled promise rejection handler
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            addLogEntry('error', [`Unhandled Promise Rejection: ${event.reason}`]);
            setHasCapturedError(true);
        };

        // Add event listeners
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // Helper to add a log entry
        function addLogEntry(type: 'log' | 'info' | 'warn' | 'error', args: any[]) {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            setLogs(prevLogs => {
                const newLogs = [
                    { type, message, timestamp: new Date() },
                    ...prevLogs
                ].slice(0, maxLogs); // Keep only the most recent logs
                return newLogs;
            });
        }

        // Clean up
        return () => {
            console.log = originalConsole.log;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (logContainerRef.current && isVisible) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs, isVisible]);

    // Format timestamp
    const formatTime = (date: Date) => {
        return date.toTimeString().split(' ')[0] + '.' +
            date.getMilliseconds().toString().padStart(3, '0');
    };

    // Get background color based on log type
    const getLogStyle = (type: string) => {
        switch (type) {
            case 'error': return 'bg-red-100 text-red-800 border-red-300';
            case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    if (!isVisible && !hasCapturedError) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-md shadow-lg z-50 opacity-70 hover:opacity-100"
            >
                Show Console
            </button>
        );
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${isVisible ? '' : 'pointer-events-none'}`}>
            <div
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? 'opacity-50' : 'opacity-0'}`}
                onClick={() => setIsVisible(false)}
            ></div>

            <div className={`relative w-full max-w-4xl h-3/4 bg-white rounded-lg shadow-xl transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Browser Console Monitor</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLogs([])}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Logs container */}
                <div
                    ref={logContainerRef}
                    className="p-4 h-[calc(100%-64px)] overflow-auto font-mono text-sm"
                >
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic">No console entries captured yet.</div>
                    ) : (
                        logs.map((log, i) => (
                            <div
                                key={i}
                                className={`mb-2 p-2 rounded border ${getLogStyle(log.type)} whitespace-pre-wrap`}
                            >
                                <div className="text-xs opacity-70 mb-1">[{formatTime(log.timestamp)}] {log.type.toUpperCase()}</div>
                                {log.message}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {!isVisible && hasCapturedError && (
                <button
                    onClick={() => setIsVisible(true)}
                    className="fixed bottom-4 right-4 bg-red-600 text-white p-2 rounded-md shadow-lg z-50 animate-pulse"
                >
                    View Errors ({logs.filter(log => log.type === 'error').length})
                </button>
            )}
        </div>
    );
} 