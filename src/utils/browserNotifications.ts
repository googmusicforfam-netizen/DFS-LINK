import { soundManager } from './audio.ts';
import type { WatchedPlayer, WatchlistNotificationEvent } from '../types/watchlist.ts';

/**
 * Checks if the browser supports the Web Notification API.
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission state ('default' | 'granted' | 'denied').
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests browser permission for notifications.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      soundManager.playChime(659.25, 880.0);
    }
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission || 'denied';
  }
}

/**
 * Sends a native browser desktop/mobile push notification.
 */
export function sendNativeNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isBrowserNotificationSupported()) return null;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag || `dfs-notif-${Date.now()}`,
        requireInteraction: true,
        ...options,
      });

      // Auto close after 12 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch {
          // ignore
        }
      }, 12000);

      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        notification.close();
      };

      return notification;
    } catch (err) {
      console.warn('Failed to spawn browser notification:', err);
    }
  }

  return null;
}

/**
 * Dispatches an immediate browser notification when a starred player is in an injury alert.
 */
export function notifyWatchlistInjury(
  player: WatchedPlayer,
  status: string,
  injuryDetail: string
): WatchlistNotificationEvent {
  const title = `🚨 WATCHLIST ALERT: ${player.name} (${player.team}) is ${status}!`;
  const message = `${player.name} (${player.position}, ${player.team}) was ruled ${status}: ${injuryDetail}. Immediate DFS lineup adjustment recommended!`;

  // 1. Send native browser notification
  sendNativeNotification(title, {
    body: message,
    tag: `inj-${player.id}-${Date.now()}`,
    renotify: true,
  });

  // 2. Play audible attention-grabbing chime/siren
  soundManager.playLoudInjurySiren();

  return {
    id: `notif-inj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'INJURY',
    playerId: player.id,
    playerName: player.name,
    sport: player.sport,
    team: player.team,
    position: player.position,
    title,
    message,
    details: injuryDetail,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    createdAt: Date.now(),
    read: false,
  };
}

/**
 * Dispatches an immediate browser notification when a starred player has a DFS price change.
 */
export function notifyWatchlistPriceChange(
  player: WatchedPlayer,
  delta: number,
  newPrice: number,
  site: 'DraftKings' | 'FanDuel' = 'DraftKings'
): WatchlistNotificationEvent {
  const sign = delta > 0 ? '+' : '';
  const dirWord = delta > 0 ? 'increased' : 'decreased';
  const title = `💰 WATCHLIST PRICE CHANGE: ${player.name} (${sign}$${Math.abs(delta)})`;
  const message = `${player.name} (${player.position}, ${player.team}) ${site} salary ${dirWord} to $${newPrice.toLocaleString()} (${sign}$${Math.abs(delta)} shift).`;

  // 1. Send native browser notification
  sendNativeNotification(title, {
    body: message,
    tag: `price-${player.id}-${Date.now()}`,
    renotify: true,
  });

  // 2. Play celebratory/informative sound
  soundManager.playChime(783.99, 1046.5);

  return {
    id: `notif-price-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'PRICE_CHANGE',
    playerId: player.id,
    playerName: player.name,
    sport: player.sport,
    team: player.team,
    position: player.position,
    title,
    message,
    details: `${site} Salary: $${newPrice.toLocaleString()} (${sign}$${Math.abs(delta)})`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    createdAt: Date.now(),
    read: false,
  };
}
