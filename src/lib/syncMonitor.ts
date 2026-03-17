// syncMonitor.ts

// SyncEvent interface to structure sync event data
interface SyncEvent {
    timestamp: string;
    operation: string;
    queryKey: string;
    source: string;
    duration: number;
    error?: string;
}

// Store sync events
const syncEvents: SyncEvent[] = [];

// Function to track sync events
function recordSyncEvent(operation: string, queryKey: string, source: string, duration: number, error?: string): void {
    const event: SyncEvent = {
        timestamp: new Date().toISOString(),
        operation,
        queryKey,
        source,
        duration,
        error
    };
    syncEvents.push(event);
}

// Function to retrieve events from last N hours
function getSyncTimeline(hours: number): SyncEvent[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return syncEvents.filter(event => new Date(event.timestamp) >= cutoffTime);
}

// Function to export sync logs as JSON
function exportSyncLog(): string {
    return JSON.stringify(syncEvents, null, 2);
}

// Function to analyze sync gaps larger than 5 seconds
function analyzeSyncGaps(): { source: string; duration: number; }[] {
    const gaps: { source: string; duration: number; }[] = [];
    for (let i = 1; i < syncEvents.length; i++) {
        const prevEvent = syncEvents[i - 1];
        const currEvent = syncEvents[i];
        const duration = (new Date(currEvent.timestamp).getTime() - new Date(prevEvent.timestamp).getTime()) / 1000;
        if (duration > 5) {
            gaps.push({
                source: prevEvent.source,
                duration
            });
        }
    }
    return gaps;
}
