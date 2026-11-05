/**
 * Web Audio API synthesizer for DFS alert sounds.
 * Includes a loud, attention-grabbing emergency injury siren
 * and initial user-tap unlocking for mobile/browser autoplay compliance.
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private beneficiarySoundEnabled: boolean = true;
  private isUnlocked: boolean = false;
  private currentSirenNodes: { stop: () => void }[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dfs_sound_alerts_enabled');
      this.soundEnabled = stored !== null ? stored === 'true' : true;

      const storedBeneficiary = localStorage.getItem('dfs_beneficiary_sound_alerts_enabled');
      this.beneficiarySoundEnabled = storedBeneficiary !== null ? storedBeneficiary === 'true' : true;

      // Listen for initial user interaction to unlock audio
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlockHandler, { once: false });
      window.addEventListener('touchstart', unlockHandler, { once: false });
      window.addEventListener('keydown', unlockHandler, { once: false });
    }
  }

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Called when user taps the "Enable Sound" button or anywhere on screen
   */
  public async unlockAudio(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    if (ctx.state === 'running') {
      this.isUnlocked = true;
      return true;
    }
    return false;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && this.audioCtx !== null && this.audioCtx.state === 'running';
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dfs_sound_alerts_enabled', String(enabled));
    }
    if (enabled) {
      this.playChime(660, 880);
    }
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    return next;
  }

  public isBeneficiarySoundEnabled(): boolean {
    return this.beneficiarySoundEnabled;
  }

  public setBeneficiarySoundEnabled(enabled: boolean): void {
    this.beneficiarySoundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dfs_beneficiary_sound_alerts_enabled', String(enabled));
    }
    if (enabled) {
      this.playBeneficiaryAlertTone();
    }
  }

  public toggleBeneficiarySound(): boolean {
    const next = !this.beneficiarySoundEnabled;
    this.setBeneficiarySoundEnabled(next);
    return next;
  }

  /**
   * ⚡ BENEFICIARY ALERT SOUND
   * An energetic 4-note ascending fanfare chime with harmonics
   * signaling a new injury beneficiary opportunity has been flagged.
   */
  public playBeneficiaryAlertTone(): void {
    if (!this.beneficiarySoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Ascending fanfare chords: F5 (698.46Hz), A5 (880Hz), C6 (1046.5Hz), E6 (1318.51Hz)
      const notes = [698.46, 880.0, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {
      console.warn('Could not play beneficiary alert sound:', e);
    }
  }

  /**
   * Stop any actively playing siren/alarm
   */
  public stopCurrentSiren(): void {
    while (this.currentSirenNodes.length > 0) {
      const node = this.currentSirenNodes.pop();
      try {
        node?.stop();
      } catch {
        // ignore
      }
    }
  }

  /**
   * 🚨 LOUD, ATTENTION-GRABBING INJURY SIREN
   * Designed specifically to pierce through background noise before game lock.
   * Alternates rapid alarm pulses (880Hz / 1200Hz) with high gain and rich harmonics.
   */
  public playLoudInjurySiren(): void {
    if (!this.soundEnabled) return;
    this.stopCurrentSiren();

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const totalDuration = 2.4; // 2.4 seconds alert sequence

      // Create main gain node with strong volume
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.01, now);
      masterGain.gain.linearRampToValueAtTime(0.38, now + 0.05); // High attention-grabbing volume
      masterGain.gain.setValueAtTime(0.38, now + totalDuration - 0.2);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
      masterGain.connect(ctx.destination);

      // Klaxon Siren Oscillators (Dual tones for urgent broadcast feel)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sawtooth'; // rich penetrating harmonics
      osc2.type = 'square';   // urgent klaxon punch

      // Modulate frequency to create an alternating alarm pattern: 4 rapid sirens
      const pulseCount = 6;
      const pulseDuration = (totalDuration - 0.4) / pulseCount;

      for (let i = 0; i < pulseCount; i++) {
        const pulseStart = now + i * pulseDuration;
        const pulseMid = pulseStart + pulseDuration * 0.5;

        // Oscillate between 784Hz (G5) and 1174.66Hz (D6)
        if (i % 2 === 0) {
          osc1.frequency.setValueAtTime(880, pulseStart); // A5
          osc1.frequency.exponentialRampToValueAtTime(1174.66, pulseMid);
          osc2.frequency.setValueAtTime(440, pulseStart);
          osc2.frequency.exponentialRampToValueAtTime(587.33, pulseMid);
        } else {
          osc1.frequency.setValueAtTime(1174.66, pulseStart);
          osc1.frequency.exponentialRampToValueAtTime(880, pulseMid);
          osc2.frequency.setValueAtTime(587.33, pulseStart);
          osc2.frequency.exponentialRampToValueAtTime(440, pulseMid);
        }
      }

      // Final chime hit at end of siren
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(1318.51, now + totalDuration - 0.5); // E6
      chimeGain.gain.setValueAtTime(0.001, now + totalDuration - 0.5);
      chimeGain.gain.exponentialRampToValueAtTime(0.4, now + totalDuration - 0.45);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      osc1.connect(masterGain);
      osc2.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      chimeOsc.start(now + totalDuration - 0.5);

      osc1.stop(now + totalDuration - 0.2);
      osc2.stop(now + totalDuration - 0.2);
      chimeOsc.stop(now + totalDuration);

      this.currentSirenNodes.push({
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
            chimeOsc.stop();
            masterGain.disconnect();
          } catch {
            // ignore
          }
        },
      });
    } catch (e) {
      console.warn('Could not play injury siren:', e);
    }
  }

  /**
   * Confirmation beep when user enables sound
   */
  public playUnlockConfirmation(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  /**
   * Plays a pleasant dual-tone chime for slate updates
   */
  public playChime(freq1: number = 523.25, freq2: number = 659.25): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);

      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  /**
   * High-value pick alert chime
   */
  public playLockAlert(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.0]; // D5, F#5, A5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Subtle copy notification tone
   */
  public playCopyTone(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundAlertManager();
