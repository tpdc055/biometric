/**
 * Real-time Sync Service
 *
 * Uses BroadcastChannel for same-device tab sync
 * and WebSocket for multi-device sync when a server is available
 */

import { db, type Citizen, type Household, type Village, type Ward } from "./db";

// Types
export interface SyncMessage {
  type: "sync" | "update" | "delete" | "ping" | "pong";
  table: "citizens" | "households" | "villages" | "wards" | "all";
  data?: unknown;
  timestamp: number;
  deviceId: string;
  messageId: string;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  connectedDevices: number;
  mode: "local" | "websocket" | "offline";
}

export type SyncEventType = "connected" | "disconnected" | "sync" | "error" | "change";

export interface SyncEvent {
  type: SyncEventType;
  data?: unknown;
  timestamp: Date;
}

type SyncEventHandler = (event: SyncEvent) => void;

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Sync Service Class
export class SyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private websocket: WebSocket | null = null;
  private deviceId: string;
  private eventHandlers: Map<SyncEventType, Set<SyncEventHandler>> = new Map();
  private pendingChanges: Map<string, SyncMessage> = new Map();
  private isInitialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private websocketUrl: string | null = null;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem("sync_device_id");
    if (!id) {
      id = `device-${generateId()}`;
      localStorage.setItem("sync_device_id", id);
    }
    return id;
  }

  // Initialize sync service
  async initialize(websocketUrl?: string): Promise<void> {
    if (this.isInitialized) return;

    // Initialize BroadcastChannel for same-device sync
    if (typeof BroadcastChannel !== "undefined") {
      this.broadcastChannel = new BroadcastChannel("citizen-registry-sync");
      this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event.data);
      this.broadcastChannel.onmessageerror = () => {
        this.emit("error", { message: "BroadcastChannel message error" });
      };
    }

    // Initialize WebSocket if URL provided
    if (websocketUrl) {
      this.websocketUrl = websocketUrl;
      await this.connectWebSocket();
    }

    // Set up database change tracking
    this.setupDatabaseHooks();

    this.isInitialized = true;
    this.emit("connected", { mode: this.getMode() });

    // Send ping to discover other tabs/devices
    this.sendPing();
  }

  // Get current sync mode
  private getMode(): "local" | "websocket" | "offline" {
    if (this.websocket?.readyState === WebSocket.OPEN) return "websocket";
    if (this.broadcastChannel) return "local";
    return "offline";
  }

  // Connect to WebSocket server
  private async connectWebSocket(): Promise<void> {
    if (!this.websocketUrl) return;

    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(this.websocketUrl!);

        this.websocket.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit("connected", { mode: "websocket" });

          // Send pending changes
          this.flushPendingChanges();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message: SyncMessage = JSON.parse(event.data);
            this.handleSyncMessage(message);
          } catch (error) {
            console.error("WebSocket message parse error:", error);
          }
        };

        this.websocket.onclose = () => {
          this.emit("disconnected", {});
          this.attemptReconnect();
        };

        this.websocket.onerror = (error) => {
          this.emit("error", { error });
          resolve(); // Resolve anyway to not block initialization
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
        resolve();
      }
    });
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.websocketUrl) {
        this.connectWebSocket();
      }
    }, delay);
  }

  // Set up database change hooks
  private setupDatabaseHooks(): void {
    // Hook into Dexie to track changes
    db.citizens.hook("creating", (_primKey, obj) => {
      this.queueChange("update", "citizens", obj);
    });

    db.citizens.hook("updating", (modifications, _primKey, obj) => {
      this.queueChange("update", "citizens", { ...obj, ...modifications });
    });

    db.citizens.hook("deleting", (primKey) => {
      this.queueChange("delete", "citizens", { id: primKey });
    });

    db.households.hook("creating", (_primKey, obj) => {
      this.queueChange("update", "households", obj);
    });

    db.households.hook("updating", (modifications, _primKey, obj) => {
      this.queueChange("update", "households", { ...obj, ...modifications });
    });

    db.households.hook("deleting", (primKey) => {
      this.queueChange("delete", "households", { id: primKey });
    });
  }

  // Queue a change for sync
  private queueChange(type: "update" | "delete", table: SyncMessage["table"], data: unknown): void {
    const message: SyncMessage = {
      type,
      table,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      messageId: generateId(),
    };

    this.pendingChanges.set(message.messageId, message);
    this.broadcastMessage(message);

    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      this.pendingChanges.delete(message.messageId);
    }

    this.emit("change", { message });
  }

  // Flush pending changes
  private flushPendingChanges(): void {
    if (this.websocket?.readyState !== WebSocket.OPEN) return;

    for (const [id, message] of this.pendingChanges) {
      this.websocket.send(JSON.stringify(message));
      this.pendingChanges.delete(id);
    }
  }

  // Broadcast message to other tabs
  private broadcastMessage(message: SyncMessage): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
  }

  // Handle incoming broadcast message
  private handleBroadcastMessage(message: SyncMessage): void {
    if (message.deviceId === this.deviceId) return; // Ignore own messages
    this.handleSyncMessage(message);
  }

  // Handle sync message
  private async handleSyncMessage(message: SyncMessage): Promise<void> {
    switch (message.type) {
      case "ping":
        this.sendPong();
        break;
      case "pong":
        this.emit("sync", { connectedDevice: message.deviceId });
        break;
      case "update":
        await this.applyUpdate(message);
        break;
      case "delete":
        await this.applyDelete(message);
        break;
      case "sync":
        await this.handleFullSync(message);
        break;
    }
  }

  // Apply update from sync
  private async applyUpdate(message: SyncMessage): Promise<void> {
    const { table, data } = message;
    if (!data) return;

    try {
      switch (table) {
        case "citizens":
          const citizen = data as Citizen;
          if (citizen.id) {
            await db.citizens.put(citizen);
          }
          break;
        case "households":
          const household = data as Household;
          if (household.id) {
            await db.households.put(household);
          }
          break;
        case "villages":
          const village = data as Village;
          if (village.id) {
            await db.villages.put(village);
          }
          break;
        case "wards":
          const ward = data as Ward;
          if (ward.id) {
            await db.wards.put(ward);
          }
          break;
      }
      this.emit("sync", { applied: message });
    } catch (error) {
      console.error("Failed to apply update:", error);
      this.emit("error", { error, message });
    }
  }

  // Apply delete from sync
  private async applyDelete(message: SyncMessage): Promise<void> {
    const { table, data } = message;
    const id = (data as { id: number })?.id;
    if (!id) return;

    try {
      switch (table) {
        case "citizens":
          await db.citizens.delete(id);
          break;
        case "households":
          await db.households.delete(id);
          break;
        case "villages":
          await db.villages.delete(id);
          break;
        case "wards":
          await db.wards.delete(id);
          break;
      }
      this.emit("sync", { deleted: message });
    } catch (error) {
      console.error("Failed to apply delete:", error);
      this.emit("error", { error, message });
    }
  }

  // Handle full sync request
  private async handleFullSync(message: SyncMessage): Promise<void> {
    // If requested, send all our data
    if (message.table === "all") {
      await this.sendFullSync();
    }
  }

  // Send ping to discover other devices
  private sendPing(): void {
    const message: SyncMessage = {
      type: "ping",
      table: "all",
      timestamp: Date.now(),
      deviceId: this.deviceId,
      messageId: generateId(),
    };
    this.broadcastMessage(message);
  }

  // Send pong response
  private sendPong(): void {
    const message: SyncMessage = {
      type: "pong",
      table: "all",
      timestamp: Date.now(),
      deviceId: this.deviceId,
      messageId: generateId(),
    };
    this.broadcastMessage(message);
  }

  // Send full sync data
  async sendFullSync(): Promise<void> {
    const [wards, villages, households, citizens] = await Promise.all([
      db.wards.toArray(),
      db.villages.toArray(),
      db.households.toArray(),
      db.citizens.toArray(),
    ]);

    const message: SyncMessage = {
      type: "sync",
      table: "all",
      data: { wards, villages, households, citizens },
      timestamp: Date.now(),
      deviceId: this.deviceId,
      messageId: generateId(),
    };

    this.broadcastMessage(message);
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  // Request full sync from other devices
  requestFullSync(): void {
    const message: SyncMessage = {
      type: "sync",
      table: "all",
      timestamp: Date.now(),
      deviceId: this.deviceId,
      messageId: generateId(),
    };
    this.broadcastMessage(message);
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  // Event handling
  on(event: SyncEventType, handler: SyncEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  private emit(type: SyncEventType, data: unknown): void {
    const event: SyncEvent = { type, data, timestamp: new Date() };
    this.eventHandlers.get(type)?.forEach(handler => handler(event));
  }

  // Get current status
  getStatus(): SyncStatus {
    return {
      isConnected: this.getMode() !== "offline",
      lastSync: null, // Would need to track this
      pendingChanges: this.pendingChanges.size,
      connectedDevices: 0, // Would need to track pongs
      mode: this.getMode(),
    };
  }

  // Cleanup
  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.eventHandlers.clear();
    this.pendingChanges.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

export function initializeSyncService(websocketUrl?: string): Promise<void> {
  return getSyncService().initialize(websocketUrl);
}
