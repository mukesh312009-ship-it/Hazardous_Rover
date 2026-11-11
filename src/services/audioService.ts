// Web Audio API synthesized SCADA telemetry sounds & Cinematic Soundtrack Generator

class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicNodes: { [key: string]: AudioNode | number } = {};
  private isMusicPlaying: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopCinematicMusic();
      this.stopNarration();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  public playSonarPing() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {}
  }

  public playWarning() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.setValueAtTime(820, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    } catch {}
  }

  public playCriticalAlarm() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [0, 0.18, 0.36].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, now + delay);
        osc.frequency.linearRampToValueAtTime(1400, now + delay + 0.12);
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.005, now + delay + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } catch {}
  }

  // --- CINEMATIC AMBIENT SOUNDTRACK GENERATOR ---
  public startCinematicMusic(intensity: 'ambient' | 'tension' | 'heroic' = 'ambient') {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      this.stopCinematicMusic();

      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.01, now);
      masterGain.gain.exponentialRampToValueAtTime(0.14, now + 2.0);
      masterGain.connect(this.ctx.destination);

      // 1. Sub Bass Drone (C2 - 65.4 Hz)
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(intensity === 'heroic' ? 73.4 : 65.4, now);
      const subFilter = this.ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(140, now);
      subOsc.connect(subFilter);
      subFilter.connect(masterGain);
      subOsc.start(now);

      // 2. Industrial Pad / Harmony (Eb / G)
      const padOsc1 = this.ctx.createOscillator();
      const padOsc2 = this.ctx.createOscillator();
      padOsc1.type = 'sawtooth';
      padOsc2.type = 'triangle';
      padOsc1.frequency.setValueAtTime(intensity === 'heroic' ? 220 : 155.56, now); // Eb3 or A3
      padOsc2.frequency.setValueAtTime(intensity === 'heroic' ? 277 : 196.00, now); // G3 or C#4
      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(intensity === 'tension' ? 800 : 450, now);
      padFilter.Q.setValueAtTime(4, now);

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.06, now);

      padOsc1.connect(padFilter);
      padOsc2.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(masterGain);
      padOsc1.start(now);
      padOsc2.start(now);

      // 3. Rhythmic Industrial Pulse LFO
      const pulseOsc = this.ctx.createOscillator();
      pulseOsc.type = 'sine';
      pulseOsc.frequency.setValueAtTime(intensity === 'tension' ? 4 : 2, now); // 2Hz or 4Hz pulse
      const pulseGain = this.ctx.createGain();
      pulseGain.gain.setValueAtTime(50, now);
      pulseOsc.connect(pulseGain);
      pulseGain.connect(padFilter.frequency);
      pulseOsc.start(now);

      this.musicNodes = {
        masterGain,
        subOsc,
        padOsc1,
        padOsc2,
        pulseOsc
      };
      this.isMusicPlaying = true;
    } catch {}
  }

  public stopCinematicMusic() {
    try {
      if (!this.ctx || !this.isMusicPlaying) return;
      const now = this.ctx.currentTime;
      const master = this.musicNodes.masterGain as GainNode | undefined;
      if (master) {
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        setTimeout(() => {
          try {
            (this.musicNodes.subOsc as OscillatorNode)?.stop();
            (this.musicNodes.padOsc1 as OscillatorNode)?.stop();
            (this.musicNodes.padOsc2 as OscillatorNode)?.stop();
            (this.musicNodes.pulseOsc as OscillatorNode)?.stop();
          } catch {}
          this.musicNodes = {};
          this.isMusicPlaying = false;
        }, 850);
      }
    } catch {
      this.musicNodes = {};
      this.isMusicPlaying = false;
    }
  }

  // --- ENGLISH VOICE NARRATION SYNTHESIZER ---
  public speakNarration(text: string, onEnd?: () => void) {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) setTimeout(onEnd, 2000);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96; // measured professional documentary pace
      utterance.pitch = 0.95; // slightly deeper authoritative timbre
      utterance.volume = 1.0;

      // Select high quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('James')) && v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) setTimeout(onEnd, 2000);
    }
  }

  public stopNarration() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const audioService = new AudioService();
