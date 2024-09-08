import { format as timeagoFormat } from "timeago.js";

function normalizeTimestamp(timestamp: number | string): number {
    const timestampNumber = parseInt(timestamp.toString(), 10);
    return timestampNumber < 1e12 ? timestampNumber * 1000 : timestampNumber;
}

export function formatTimestamp(timestamp: number | string | undefined): string {
    if (!timestamp) {
        return "Never or Unknown";
    }

    const millisTimestamp = normalizeTimestamp(timestamp);

    return timeagoFormat(new Date(millisTimestamp));
}