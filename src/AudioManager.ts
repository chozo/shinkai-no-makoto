type SoundEffect = "start" | "danger" | "clear" | "fail";

export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private drone?: OscillatorNode;
  private droneGain?: GainNode;
  private filter?: BiquadFilterNode;
  private sequence?: number;
  private muted = localStorage.getItem("shinkai-muted") === "true";
  private step = 0;
  private depthProgress = 0;

  get isMuted() { return this.muted; }

  start(getDepthProgress: () => number) {
    if (!this.context) this.createGraph();
    void this.context?.resume();
    if (!this.sequence) this.sequence = window.setInterval(() => { this.setDepth(getDepthProgress()); this.playStep(); }, 680);
    this.playStep();
  }

  setDepth(progress: number) {
    if (!this.context || !this.droneGain || !this.filter || !this.drone) return;
    this.depthProgress = Math.max(0, Math.min(1, progress));
    const at = this.context.currentTime;
    this.droneGain.gain.setTargetAtTime(0.006 + this.depthProgress * 0.04, at, 0.35);
    this.filter.frequency.setTargetAtTime(1600 - this.depthProgress * 1320, at, 0.35);
    this.drone.frequency.setTargetAtTime(58 - this.depthProgress * 23, at, 0.35);
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem("shinkai-muted", String(this.muted));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.22, this.context.currentTime, 0.06);
    return this.muted;
  }

  play(effect: SoundEffect) {
    if (!this.context || this.muted) return;
    if (effect === "clear") {
      this.playFanfare();
      return;
    }
    const notes: Record<SoundEffect, number[]> = {
      start: [392, 587], danger: [164], clear: [], fail: [190, 130]
    };
    notes[effect].forEach((frequency, index) => this.tone(frequency, 0.12 + index * 0.09, "sine", 0.18));
  }

  private createGraph() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.22;
    this.master.connect(this.context.destination);
    this.filter = this.context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 1600;
    this.droneGain = this.context.createGain();
    this.droneGain.gain.value = 0.01;
    this.drone = this.context.createOscillator();
    this.drone.type = "sine";
    this.drone.frequency.value = 55;
    this.drone.connect(this.filter).connect(this.droneGain).connect(this.master);
    this.drone.start();
  }

  private playStep() {
    if (!this.context || this.muted) return;
    const brightScale = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 392];
    const deepScale = [196, 233.08, 261.63, 293.66, 261.63, 233.08, 174.61, 196];
    const scale = this.depthProgress < 0.42 ? brightScale : deepScale;
    const volume = this.depthProgress < 0.7 ? 0.045 : 0.07;
    this.tone(scale[this.step++ % scale.length], 0, this.depthProgress < 0.62 ? "sine" : "triangle", volume, 0.46);
  }

  private playFanfare() {
    if (!this.context || !this.droneGain) return;
    const at = this.context.currentTime;
    this.droneGain.gain.setTargetAtTime(0.002, at, 0.04);
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    const timings = [0, 0.12, 0.24, 0.39, 0.58];
    melody.forEach((note, index) => this.tone(note, timings[index], "triangle", index === melody.length - 1 ? 0.26 : 0.18, index === melody.length - 1 ? 0.62 : 0.22));
    this.tone(659.25, 0.58, "sine", 0.1, 0.62);
    this.tone(783.99, 0.58, "sine", 0.1, 0.62);
    window.setTimeout(() => this.setDepth(this.depthProgress), 1250);
  }

  private tone(frequency: number, delay: number, type: OscillatorType, volume: number, duration = 0.18) {
    if (!this.context || !this.master) return;
    const at = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.03);
  }
}
