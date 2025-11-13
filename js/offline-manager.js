// Offline Manager - Handles network detection and automatic fallback

import { isOnlineMode, LocalStorage } from './storage-service.js';

// Constants
const OFFLINE_QUEUE_KEY = 'offline_queue';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const OFFLINE_BACKUP_PREFIX = 'offline_backup_';

/**
 * Check if device has network connectivity
 */
export function isNetworkOnline() {
  return navigator.onLine;
}

/**
 * Get offline queue
 */
function getOfflineQueue() {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('[ERROR] Failed to get offline queue:', error);
    return [];
  }
}

/**
 * Add operation to offline queue
 */
function addToOfflineQueue(operation) {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...operation,
      timestamp: Date.now()
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[INFO] Added to offline queue:', operation.type);
  } catch (error) {
    console.error('[ERROR] Failed to add to offline queue:', error);
  }
}

/**
 * Clear offline queue
 */
function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  console.log('[INFO] Offline queue cleared');
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime() {
  const timestamp = localStorage.getItem(LAST_SYNC_KEY);
  return timestamp ? parseInt(timestamp) : null;
}

/**
 * Update last sync timestamp
 */
function updateLastSyncTime() {
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

/**
 * Backup current data to localStorage (for offline fallback)
 */
export async function backupCurrentData(userId, garageId, fieldKey, value) {
  if (!userId || !isOnlineMode()) return;

  try {
    const backupKey = `${OFFLINE_BACKUP_PREFIX}${garageId}_${fieldKey}`;
    const backupData = {
      value,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    console.log('[INFO] Backed up to localStorage:', backupKey);
  } catch (error) {
    console.error('[ERROR] Backup failed:', error);
  }
}

/**
 * Save with offline fallback
 * Attempts Firebase save, falls back to localStorage if offline
 */
export async function saveWithFallback(userId, garageId, fieldKey, value) {
  // Backup to localStorage first (belt and suspenders approach)
  await backupCurrentData(userId, garageId, fieldKey, value);

  if (!isNetworkOnline()) {
    console.log('[INFO] Offline detected, saving to localStorage only');
    await LocalStorage.saveStroke(garageId, fieldKey, value);

    // Add to sync queue for later
    addToOfflineQueue({
      type: 'saveStroke',
      userId,
      garageId,
      fieldKey,
      value
    });

    return { offline: true };
  }

  try {
    // Attempt online save
    const { saveStroke } = await import('./firestore-crud.js');
    await saveStroke(userId, garageId, fieldKey, value);

    // Also save to localStorage as cache
    await LocalStorage.saveStroke(garageId, fieldKey, value);

    updateLastSyncTime();
    return { offline: false };
  } catch (error) {
    console.warn('[WARN] Online save failed, falling back to localStorage:', error);

    // Fallback to localStorage
    await LocalStorage.saveStroke(garageId, fieldKey, value);

    // Add to sync queue
    addToOfflineQueue({
      type: 'saveStroke',
      userId,
      garageId,
      fieldKey,
      value
    });

    return { offline: true, error };
  }
}

/**
 * Delete with offline fallback
 */
export async function deleteWithFallback(userId, garageId, fieldKey) {
  // Save locally first
  await LocalStorage.deleteStroke(garageId, fieldKey);

  if (!isNetworkOnline()) {
    console.log('[INFO] Offline detected, deleting from localStorage only');

    addToOfflineQueue({
      type: 'deleteStroke',
      userId,
      garageId,
      fieldKey
    });

    return { offline: true };
  }

  try {
    const { deleteStroke } = await import('./firestore-crud.js');
    await deleteStroke(userId, garageId, fieldKey);
    updateLastSyncTime();
    return { offline: false };
  } catch (error) {
    console.warn('[WARN] Online delete failed, queued for later:', error);

    addToOfflineQueue({
      type: 'deleteStroke',
      userId,
      garageId,
      fieldKey
    });

    return { offline: true, error };
  }
}

/**
 * Delete garage with offline fallback
 */
export async function deleteGarageWithFallback(userId, garageId) {
  // Delete locally first
  await LocalStorage.deleteGarage(garageId);

  if (!isNetworkOnline()) {
    console.log('[INFO] Offline detected, deleting garage from localStorage only');

    addToOfflineQueue({
      type: 'deleteGarage',
      userId,
      garageId
    });

    return { offline: true };
  }

  try {
    const { deleteGarage } = await import('./firestore-crud.js');
    await deleteGarage(userId, garageId);
    updateLastSyncTime();
    return { offline: false };
  } catch (error) {
    console.warn('[WARN] Online garage delete failed, queued for later:', error);

    addToOfflineQueue({
      type: 'deleteGarage',
      userId,
      garageId
    });

    return { offline: true, error };
  }
}

/**
 * Sync offline queue to Firebase when back online
 */
export async function syncOfflineQueue(userId) {
  if (!isNetworkOnline() || !userId) {
    console.log('[INFO] Cannot sync: offline or no user ID');
    return { synced: false };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    console.log('[INFO] No offline operations to sync');
    return { synced: true, count: 0 };
  }

  console.log(`[INFO] Syncing ${queue.length} offline operations...`);

  let successCount = 0;
  let failCount = 0;

  for (const operation of queue) {
    try {
      switch (operation.type) {
        case 'saveStroke': {
          const { saveStroke } = await import('./firestore-crud.js');
          await saveStroke(operation.userId, operation.garageId, operation.fieldKey, operation.value);
          successCount++;
          break;
        }
        case 'deleteStroke': {
          const { deleteStroke } = await import('./firestore-crud.js');
          await deleteStroke(operation.userId, operation.garageId, operation.fieldKey);
          successCount++;
          break;
        }
        case 'deleteGarage': {
          const { deleteGarage } = await import('./firestore-crud.js');
          await deleteGarage(operation.userId, operation.garageId);
          successCount++;
          break;
        }
        default:
          console.warn('[WARN] Unknown operation type:', operation.type);
      }
    } catch (error) {
      console.error('[ERROR] Failed to sync operation:', operation, error);
      failCount++;
    }
  }

  if (failCount === 0) {
    clearOfflineQueue();
    updateLastSyncTime();
    console.log(`[SUCCESS] Synced ${successCount} operations`);
  } else {
    console.warn(`[WARN] Sync completed with errors: ${successCount} succeeded, ${failCount} failed`);
  }

  return {
    synced: failCount === 0,
    successCount,
    failCount,
    total: queue.length
  };
}

/**
 * Initialize offline manager
 * Sets up network status listeners
 */
export function initializeOfflineManager(onStatusChange) {
  console.log('[INFO] Initializing offline manager');

  // Initial status
  const initialStatus = isNetworkOnline();
  console.log(`[INFO] Initial network status: ${initialStatus ? 'online' : 'offline'}`);

  if (onStatusChange) {
    onStatusChange(initialStatus);
  }

  // Listen for online event
  window.addEventListener('online', async () => {
    console.log('[INFO] Network came online');
    if (onStatusChange) {
      onStatusChange(true);
    }

    // Attempt to sync offline queue
    const userId = getCurrentUserId();
    if (userId && isOnlineMode()) {
      const result = await syncOfflineQueue(userId);
      if (result.synced && result.count > 0) {
        showSyncNotification(`Synced ${result.successCount} changes`);
      }
    }
  });

  // Listen for offline event
  window.addEventListener('offline', () => {
    console.log('[INFO] Network went offline');
    if (onStatusChange) {
      onStatusChange(false);
    }
  });

  // Periodic connectivity check (every 30 seconds)
  setInterval(() => {
    const online = isNetworkOnline();
    if (onStatusChange) {
      onStatusChange(online);
    }
  }, 30000);
}

/**
 * Get current user ID from auth
 */
function getCurrentUserId() {
  try {
    // This would need to be imported from auth.js
    const userIdElement = document.querySelector('[data-user-id]');
    return userIdElement ? userIdElement.dataset.userId : null;
  } catch (error) {
    return null;
  }
}

/**
 * Show sync notification to user
 */
function showSyncNotification(message) {
  const existingNotif = document.getElementById('sync-notification');
  if (existingNotif) {
    existingNotif.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'sync-notification';
  notification.className = 'sync-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Get offline queue count
 */
export function getOfflineQueueCount() {
  return getOfflineQueue().length;
}
