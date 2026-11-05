import { useState, useEffect, useCallback, useRef } from 'react';
import type { WatchedPlayer, WatchlistNotificationEvent } from '../types/watchlist.ts';
import type { InjuryAlert, Sport } from '../types/dfs.ts';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendNativeNotification,
  notifyWatchlistInjury,
  notifyWatchlistPriceChange,
} from '../utils/browserNotifications.ts';
import { soundManager } from '../utils/audio.ts';

const WATCHLIST_STORAGE_KEY = 'dfs_starred_watchlist_players';
const NOTIFICATIONS_STORAGE_KEY = 'dfs_watchlist_notifications_history';

// Initial pre-starred players so user immediately has players on watchlist to test
const INITIAL_WATCHLIST_PLAYERS: WatchedPlayer[] = [
  {
    id: 'wat-lamar-jackson',
    name: 'Lamar Jackson',
    sport: 'nfl',
    team: 'Baltimore Ravens',
    teamAbbr: 'BAL',
    position: 'QB',
    salaryDK: 11600,
    salaryFD: 16500,
    previousSalaryDK: 11200,
    priceChangeDK: 400,
    priceChangeDate: 'Today',
    status: 'HEALTHY',
    gameMatchup: 'JAX @ BAL',
    gameTime: '8:15 PM ET',
    starredAt: Date.now() - 3600000,
  },
  {
    id: 'wat-franz-wagner',
    name: 'Franz Wagner',
    sport: 'nba',
    team: 'Orlando Magic',
    teamAbbr: 'ORL',
    position: 'SF',
    salaryDK: 8400,
    salaryFD: 8800,
    previousSalaryDK: 7800,
    priceChangeDK: 600,
    priceChangeDate: 'Today',
    status: 'BENEFICIARY',
    beneficiaryNote: 'Alpha 34% usage with Paolo Banchero OUT',
    gameMatchup: 'ORL @ PHX',
    gameTime: '7:00 PM ET',
    starredAt: Date.now() - 7200000,
  },
  {
    id: 'wat-brian-thomas-jr',
    name: 'Brian Thomas Jr.',
    sport: 'nfl',
    team: 'Jacksonville Jaguars',
    teamAbbr: 'JAX',
    position: 'WR',
    salaryDK: 7800,
    salaryFD: 11000,
    previousSalaryDK: 7300,
    priceChangeDK: 500,
    priceChangeDate: 'Today',
    status: 'HEALTHY',
    gameMatchup: 'JAX @ BAL',
    gameTime: '8:15 PM ET',
    starredAt: Date.now() - 10800000,
  },
  {
    id: 'wat-anthony-black',
    name: 'Anthony Black',
    sport: 'nba',
    team: 'Orlando Magic',
    teamAbbr: 'ORL',
    position: 'PG',
    salaryDK: 4400,
    salaryFD: 4800,
    status: 'BENEFICIARY',
    beneficiaryNote: 'Expanded 31+ minutes playmaking value',
    gameMatchup: 'ORL @ PHX',
    gameTime: '7:00 PM ET',
    starredAt: Date.now() - 14400000,
  },
];

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchedPlayer[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return INITIAL_WATCHLIST_PLAYERS;
  });

  const [notificationHistory, setNotificationHistory] = useState<WatchlistNotificationEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission()
  );

  const [lastNotificationAlert, setLastNotificationAlert] = useState<WatchlistNotificationEvent | null>(null);

  // Track processed injury alert IDs for watchlist to avoid spamming
  const notifiedInjuryKeysRef = useRef<Set<string>>(new Set());

  // Keep permission state fresh
  useEffect(() => {
    setBrowserPermission(getBrowserNotificationPermission());
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
      } catch {
        // ignore
      }
    }
  }, [watchlist]);

  // Save notification history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationHistory.slice(0, 50)));
      } catch {
        // ignore
      }
    }
  }, [notificationHistory]);

  // Request browser permission
  const handleRequestPermission = useCallback(async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    return perm;
  }, []);

  // Helper: Normalize player name for matching
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check if a player is starred
  const isStarred = useCallback(
    (playerNameOrId: string) => {
      const target = normalize(playerNameOrId);
      return watchlist.some(
        (p) => normalize(p.name) === target || normalize(p.id) === target
      );
    },
    [watchlist]
  );

  // Toggle star status for a player
  const toggleStar = useCallback(
    async (playerData: {
      name: string;
      position: string;
      team: string;
      teamAbbr?: string;
      sport: Sport;
      salaryDK?: number;
      salaryFD?: number;
      status?: any;
      injuryNote?: string;
      beneficiaryNote?: string;
      gameMatchup?: string;
      gameTime?: string;
    }) => {
      const targetNorm = normalize(playerData.name);
      const existing = watchlist.find((p) => normalize(p.name) === targetNorm);

      if (existing) {
        // Unstar
        setWatchlist((prev) => prev.filter((p) => p.id !== existing.id));
        soundManager.playChime(440.0, 330.0);
        return false;
      } else {
        // Star - add new
        const newPlayer: WatchedPlayer = {
          id: `wat-${targetNorm}-${Date.now()}`,
          name: playerData.name,
          sport: playerData.sport,
          team: playerData.team,
          teamAbbr: playerData.teamAbbr || playerData.team.slice(0, 3).toUpperCase(),
          position: playerData.position,
          salaryDK: playerData.salaryDK || 6000,
          salaryFD: playerData.salaryFD || 6500,
          status: playerData.status || 'HEALTHY',
          injuryNote: playerData.injuryNote,
          beneficiaryNote: playerData.beneficiaryNote,
          gameMatchup: playerData.gameMatchup,
          gameTime: playerData.gameTime,
          starredAt: Date.now(),
        };

        setWatchlist((prev) => [newPlayer, ...prev]);
        soundManager.playChime(587.33, 880.0);

        // Prompt user for browser notifications if not yet granted or denied
        if (getBrowserNotificationPermission() === 'default') {
          handleRequestPermission();
        }

        return true;
      }
    },
    [watchlist, handleRequestPermission]
  );

  // Check watchlist against incoming injury alerts
  const checkWatchlistInjuries = useCallback(
    (alerts: InjuryAlert[]) => {
      for (const alert of alerts) {
        const outPlayerNorm = normalize(alert.playerOut);

        // Find match in watchlist
        const matched = watchlist.find((p) => normalize(p.name) === outPlayerNorm);

        if (matched) {
          const key = `inj-${matched.id}-${alert.id}`;
          if (!notifiedInjuryKeysRef.current.has(key)) {
            notifiedInjuryKeysRef.current.add(key);

            // Trigger immediate browser notification!
            const notif = notifyWatchlistInjury(
              matched,
              alert.officialStatus || 'OUT',
              alert.injuryDetail || 'Ruled OUT for tonight'
            );

            // Update player status in watchlist state
            setWatchlist((prev) =>
              prev.map((p) =>
                p.id === matched.id
                  ? {
                      ...p,
                      status: (alert.officialStatus as any) || 'OUT',
                      injuryNote: alert.injuryDetail,
                      lastNotifiedAt: Date.now(),
                    }
                  : p
              )
            );

            // Log notification
            setNotificationHistory((prev) => [notif, ...prev]);
            setLastNotificationAlert(notif);
          }
        }
      }
    },
    [watchlist]
  );

  // Simulate a price change on a watched player (for immediate testing)
  const simulatePriceChange = useCallback(
    (playerId?: string) => {
      const target = playerId
        ? watchlist.find((p) => p.id === playerId)
        : watchlist[Math.floor(Math.random() * watchlist.length)];

      if (!target) return;

      const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 2) * 100; // e.g. +$400, -$300
      const newSalaryDK = Math.max(3000, target.salaryDK + delta);

      // Trigger immediate browser notification
      const notif = notifyWatchlistPriceChange(target, delta, newSalaryDK, 'DraftKings');

      // Update in state
      setWatchlist((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? {
                ...p,
                previousSalaryDK: target.salaryDK,
                salaryDK: newSalaryDK,
                priceChangeDK: delta,
                priceChangeDate: 'Just Now',
                lastNotifiedAt: Date.now(),
              }
            : p
        )
      );

      setNotificationHistory((prev) => [notif, ...prev]);
      setLastNotificationAlert(notif);
    },
    [watchlist]
  );

  // Simulate an injury alert on a watched player (for immediate testing)
  const simulateWatchlistInjury = useCallback(
    (playerId?: string) => {
      const target = playerId
        ? watchlist.find((p) => p.id === playerId)
        : watchlist[0];

      if (!target) return;

      const injuryReasons = [
        'Hamstring tightness (Late scratch 10m before lock)',
        'Ankle sprain during warmups',
        'Knee soreness (Ruled OUT)',
        'Illness (Late Inactive)',
      ];
      const reason = injuryReasons[Math.floor(Math.random() * injuryReasons.length)];

      // Trigger immediate browser notification
      const notif = notifyWatchlistInjury(target, 'OUT', reason);

      // Update in state
      setWatchlist((prev) =>
        prev.map((p) =>
          p.id === target.id
            ? {
                ...p,
                status: 'OUT',
                injuryNote: reason,
                lastNotifiedAt: Date.now(),
              }
            : p
        )
      );

      setNotificationHistory((prev) => [notif, ...prev]);
      setLastNotificationAlert(notif);
    },
    [watchlist]
  );

  // Send a test browser notification to verify permissions on user's device
  const sendTestNotification = useCallback(async () => {
    let perm = getBrowserNotificationPermission();
    if (perm === 'default') {
      perm = await handleRequestPermission();
    }

    if (perm === 'granted') {
      sendNativeNotification('🔔 DFS Watchlist Notifications Active', {
        body: 'Browser push notifications are connected! You will receive instant alerts when your starred players are ruled OUT or experience DFS price shifts.',
        tag: `test-${Date.now()}`,
      });
      soundManager.playChime(587.33, 880.0);
    } else {
      alert('Browser notifications are currently blocked in your browser settings. Please enable notifications for this site to receive native popups.');
    }
  }, [handleRequestPermission]);

  const removePlayer = useCallback((playerId: string) => {
    setWatchlist((prev) => prev.filter((p) => p.id !== playerId));
    soundManager.playChime(440.0, 330.0);
  }, []);

  const clearAllWatchlist = useCallback(() => {
    setWatchlist([]);
    localStorage.removeItem(WATCHLIST_STORAGE_KEY);
  }, []);

  const clearNotificationHistory = useCallback(() => {
    setNotificationHistory([]);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  }, []);

  return {
    watchlist,
    isStarred,
    toggleStar,
    removePlayer,
    clearAllWatchlist,
    notificationHistory,
    clearNotificationHistory,
    browserPermission,
    requestPermission: handleRequestPermission,
    checkWatchlistInjuries,
    simulatePriceChange,
    simulateWatchlistInjury,
    sendTestNotification,
    lastNotificationAlert,
    dismissNotificationAlert: () => setLastNotificationAlert(null),
  };
}
