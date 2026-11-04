import { useState, useEffect, useRef, useCallback } from 'react';
import type { InjuryAlert, Sport } from '../types/dfs.ts';
import { INITIAL_INJURY_ALERTS } from '../data/fallbackInjuries.ts';
import { soundManager } from '../utils/audio.ts';

const STORAGE_KEY = 'dfs_injury_alerts_log';

export function useInjuryPoller(currentSport: Sport) {
  const [alerts, setAlerts] = useState<InjuryAlert[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return INITIAL_INJURY_ALERTS;
  });

  const [activeBannerAlert, setActiveBannerAlert] = useState<InjuryAlert | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isPreLockUrgent, setIsPreLockUrgent] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Just now');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  // Keep track of alert IDs we've already sounded the siren for
  const seenAlertIdsRef = useRef<Set<string>>(
    new Set(INITIAL_INJURY_ALERTS.map((a) => a.id))
  );

  const lastPollTimestampRef = useRef<number>(Date.now() - 60 * 1000);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync alerts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 50)));
      } catch {
        // ignore
      }
    }
  }, [alerts]);

  // Check audio unlock state
  useEffect(() => {
    const checkAudio = () => {
      setAudioUnlocked(soundManager.isAudioUnlocked());
    };
    checkAudio();
    const interval = setInterval(checkAudio, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dispatch a new breaking out alert (plays loud siren + shows banner)
  const triggerBreakingAlert = useCallback((newAlert: InjuryAlert) => {
    // 1. Play loud, attention-grabbing alert sound!
    soundManager.playLoudInjurySiren();

    // 2. Show big top banner
    setActiveBannerAlert(newAlert);

    // 3. Add to alerts log
    setAlerts((prev) => {
      const filtered = prev.filter((a) => a.id !== newAlert.id);
      return [newAlert, ...filtered];
    });

    setUnreadCount((c) => c + 1);
    seenAlertIdsRef.current.add(newAlert.id);
  }, []);

  // User unlocks audio
  const handleUnlockAudio = async () => {
    const success = await soundManager.unlockAudio();
    if (success) {
      soundManager.playUnlockConfirmation();
      setAudioUnlocked(true);
    }
  };

  // Test siren trigger
  const handleTestSiren = () => {
    soundManager.playLoudInjurySiren();
  };

  // Poll server for new injury updates
  const pollInjuries = useCallback(async () => {
    setIsPolling(true);
    try {
      const res = await fetch(`/api/dfs/injuries/poll?since=${lastPollTimestampRef.current}`);
      if (res.ok) {
        const data = await res.json();
        setLastCheckedTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
        setIsPreLockUrgent(data.hasCriticalPreLock);

        if (data.newAlerts && data.newAlerts.length > 0) {
          data.newAlerts.forEach((alert: InjuryAlert) => {
            if (!seenAlertIdsRef.current.has(alert.id)) {
              triggerBreakingAlert(alert);
            }
          });
        }

        if (data.serverTimestamp) {
          lastPollTimestampRef.current = data.serverTimestamp;
        }
      }
    } catch (err) {
      console.warn('Injury poll check momentarily paused:', err);
    } finally {
      setIsPolling(false);
    }
  }, [triggerBreakingAlert]);

  // Adaptive Polling Interval:
  // Check more often (every 10s) in the last 10 minutes before game starts!
  useEffect(() => {
    // Determine interval: 10 seconds if pre-lock games, otherwise 40 seconds
    const intervalMs = isPreLockUrgent ? 10000 : 40000;

    pollTimerRef.current = setInterval(() => {
      pollInjuries();
    }, intervalMs);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [isPreLockUrgent, pollInjuries]);

  // Simulate a late scratch alert for demo/testing
  const simulateLateScratch = async (sport?: Sport) => {
    const targetSport = sport || currentSport;
    try {
      const res = await fetch('/api/dfs/injuries/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: targetSport }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alert) {
          triggerBreakingAlert(data.alert);
        }
      }
    } catch {
      // Local fallback simulation if offline
      const fallbackAlert: InjuryAlert = {
        id: `inj-local-${Date.now()}`,
        sport: targetSport,
        sportName: targetSport.toUpperCase(),
        playerOut: 'Star Player',
        team: 'Team A',
        teamAbbr: 'TMA',
        position: 'STAR',
        injuryDetail: 'Ruled OUT (Late scratch 8 mins before lock)',
        officialStatus: 'OUT',
        gameMatchup: 'TMA @ TMB',
        gameTime: '7:30 PM ET',
        minutesToStart: 8,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        createdAt: Date.now(),
        urgency: 'CRITICAL_PRE_LOCK',
        fillIns: [
          {
            name: 'Backup Stud',
            position: 'STAR',
            team: 'TMA',
            role: 'New Starter',
            projectedMinutes: '34 mins (+14)',
            salaryDK: 4500,
            salaryFD: 5100,
            dfsImpactNote: 'Takes over starting spot and usage. Huge salary saver value.',
          },
        ],
      };
      triggerBreakingAlert(fallbackAlert);
    }
  };

  const dismissBanner = () => {
    soundManager.stopCurrentSiren();
    setActiveBannerAlert(null);
  };

  const clearAlertsLog = () => {
    setAlerts([]);
    localStorage.removeItem(STORAGE_KEY);
    setUnreadCount(0);
  };

  return {
    alerts,
    activeBannerAlert,
    unreadCount,
    setUnreadCount,
    isPreLockUrgent,
    isPolling,
    lastCheckedTime,
    audioUnlocked,
    handleUnlockAudio,
    handleTestSiren,
    simulateLateScratch,
    dismissBanner,
    clearAlertsLog,
    triggerBreakingAlert,
    pollInjuries,
  };
}
