"use client";

import { DB } from "@/lib/storage";
import { logger } from "./utils";

const OFFLINE_QUEUE_KEY = "magic_tea_offline_queue";

export interface QueuedTransaction {
  type: "sale" | "stock" | "expense";
  data: Record<string, unknown>;
  id: string;
  timestamp: number;
}

export function queueOfflineAction(
  type: "sale" | "stock" | "expense",
  data: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  try {
    const queue: QueuedTransaction[] = JSON.parse(
      localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"
    );

    const isDuplicate = queue.some(
      (item) =>
        item.type === type &&
        JSON.stringify(item.data) === JSON.stringify(data)
    );

    if (isDuplicate) {
      logger.warn("Duplicate offline action ignored.");
      return;
    }

    queue.push({
      type,
      data,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    logger.log(`Action queued: ${type}`);

    if (navigator.onLine) {
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
          () => void syncOfflineQueue()
        );
      } else {
        setTimeout(syncOfflineQueue, 2000);
      }
    }
  } catch (e) {
    logger.error("Failed to queue offline action:", e);
  }
}

export async function syncOfflineQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return false;

  const queue: QueuedTransaction[] = JSON.parse(
    localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"
  );
  if (queue.length === 0) return true;

  logger.log(`Syncing ${queue.length} offline transactions...`);

  try {
    for (const item of queue) {
      const col =
        item.type === "sale"
          ? "sales_transactions"
          : item.type === "expense"
            ? "expenses"
            : "stock_transactions";

      DB.push(col, {
        ...item.data,
        isOfflineSynced: true,
        syncTimestamp: new Date().toISOString(),
        createdAt: item.data.createdAt || new Date().toISOString(),
      });
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, "[]");
    logger.log("Sync completed successfully.");
    return true;
  } catch (error) {
    logger.error("Sync failed:", error);
    return false;
  }
}
