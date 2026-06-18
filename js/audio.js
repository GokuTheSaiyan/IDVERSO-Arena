// ============================================================
//  AUDIO MANAGER
//  Handles dynamic loading of character-specific sounds.
//  Falls back to global sounds, then programmatic Web Audio API.
// ============================================================
class AudioManager {
  constructor() {
    this.ctx = null;
    this.cache = {};
  }

  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { /* Audio not available */ }
    }
  }

  // Generate simple programmatic tones as ultimate fallback
  playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Loads a sound file and caches it. Returns true if successful.
  async loadSound(url) {
    if (this.cache[url] !== undefined) return this.cache[url] !== null;
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = url;
      audio.load();
      audio.addEventListener('canplaythrough', () => {
        this.cache[url] = audio;
        resolve(true);
      }, { once: true });
      audio.addEventListener('error', () => {
        this.cache[url] = null;
        resolve(false);
      }, { once: true });
    });
  }

  // Plays a cached sound file
  playSound(url) {
    if (this.cache[url]) {
      const sound = this.cache[url].cloneNode();
      sound.volume = 0.5;
      sound.play().catch(() => {});
      return true;
    }
    return false;
  }

  // Core playback logic: Character specific -> Global -> Programmatic
  async play(action, charFolder = null, fallbackTone = null) {
    if (!this.ctx) return;

    let played = false;

    // 1. Try character-specific sound
    if (charFolder) {
      const charUrl = `audio/${charFolder}/${action}.wav`;
      if (this.cache[charUrl] === undefined) await this.loadSound(charUrl);
      played = this.playSound(charUrl);
    }

    // 2. Try global fallback sound
    if (!played) {
      const globalUrl = `audio/global/${action}.wav`;
      if (this.cache[globalUrl] === undefined) await this.loadSound(globalUrl);
      played = this.playSound(globalUrl);
    }

    // 3. Fallback to programmatic tone
    if (!played && fallbackTone) {
      fallbackTone();
    }
  }

  // Action-specific methods
  hit() {
    this.play('hit', null, () => this.playTone(120, 0.04, 'sawtooth', 0.1));
  }

  slash(charFolder) {
    this.play('attack', charFolder, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    });
  }

  parry(charFolder) {
    this.play('parry', charFolder, () => {
      this.playTone(880, 0.06, 'sine', 0.15);
      setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.15), 60);
    });
  }

  shieldOn(charFolder) {
    this.play('shield_on', charFolder, () => this.playTone(400, 0.2, 'sine', 0.15));
  }

  shieldOff(charFolder) {
    this.play('shield_off', charFolder, () => this.playTone(200, 0.2, 'sine', 0.15));
  }

  detFull(charFolder) {
    this.play('determination_full', charFolder, () => this.playTone(800, 0.15, 'square', 0.15));
  }

  victory(charFolder) {
    this.play('victory', charFolder, () => {
      this.playTone(523, 0.12);
      setTimeout(() => this.playTone(659, 0.12), 120);
      setTimeout(() => this.playTone(784, 0.3), 240);
    });
  }

  hateGain() {
    this.play('hate_gain', null, () => this.playTone(60, 0.05, 'sawtooth', 0.04));
  }

  hateFull() {
    this.play('hate_full', null, () => {
      this.playTone(80, 0.3, 'sawtooth', 0.15);
      setTimeout(() => this.playTone(50, 0.4, 'sawtooth', 0.15), 100);
    });
  }

  hateSlashPrep() {
    this.play('hate_slash_prep', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(250, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    });
  }

  hateSlashLaunch() {
    this.play('hate_slash_launch', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    });
  }

  hateSlashHit() {
    this.play('hate_slash_hit', null, () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    });
  }

  countdown() { this.playTone(440, 0.15); }
  
  fight() {
    this.playTone(660, 0.1);
    setTimeout(() => this.playTone(880, 0.3), 100);
  }
}

const Sound = new AudioManager();