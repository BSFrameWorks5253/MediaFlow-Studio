// Audio sound effects engine using Web Audio API
// 100% self-contained, offline-first, zero asset dependencies

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a warm, harmonic completion chime (C5 -> E5 -> G5 -> C6)
   * Designed for high-end studio applications
   */
  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Elegant 4-note major ascending arpeggio with warm decay
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.28, gain: 0.14 }, // C5
        { freq: 659.25, time: 0.09, dur: 0.30, gain: 0.16 }, // E5
        { freq: 783.99, time: 0.18, dur: 0.35, gain: 0.18 }, // G5
        { freq: 1046.50, time: 0.28, dur: 0.65, gain: 0.22 }, // C6
      ];

      notes.forEach(({ freq, time, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Soft overtone layer for pleasant presence
        const oscOvertone = ctx.createOscillator();
        oscOvertone.type = 'triangle';
        oscOvertone.frequency.setValueAtTime(freq * 2, now + time);
        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(gain * 0.1, now + time);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur * 0.75);

        gainNode.gain.setValueAtTime(0.0001, now + time);
        gainNode.gain.linearRampToValueAtTime(gain, now + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscOvertone.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
        oscOvertone.start(now + time);
        oscOvertone.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio playback not supported or blocked:', e);
    }
  }

  /**
   * Subtle refresh tone for UI re-scan confirmation
   */
  playRefresh() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }
}

export const soundEffects = new SoundEngine();
export const playSuccessSound = () => soundEffects.playSuccess();
export const playRefreshSound = () => soundEffects.playRefresh();
