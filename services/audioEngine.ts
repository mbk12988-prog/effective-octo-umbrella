import { MelodyData, Note, PlaybackState } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private schedulerTimer: number | null = null;
  private startTime: number = 0;
  private melody: MelodyData | null = null;
  private onStateChange: (state: PlaybackState, time: number) => void;
  private activeOscillators: Set<OscillatorNode> = new Set();
  
  // Lookahead settings
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds
  private nextNoteIndex = 0;

  constructor(onStateChange: (state: PlaybackState, time: number) => void) {
    this.onStateChange = onStateChange;
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async loadMelody(melody: MelodyData) {
    this.melody = melody;
    this.stop();
  }

  public async play() {
    this.initContext();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextNoteIndex = 0;
    this.startTime = this.ctx!.currentTime;
    
    this.onStateChange(PlaybackState.PLAYING, 0);
    this.scheduler();
    this.startProgressTracker();
  }

  public pause() {
    this.isPlaying = false;
    this.stopAllSound();
    if (this.schedulerTimer) window.clearTimeout(this.schedulerTimer);
    this.onStateChange(PlaybackState.PAUSED, this.ctx ? this.ctx.currentTime - this.startTime : 0);
  }

  public stop() {
    this.isPlaying = false;
    this.stopAllSound();
    if (this.schedulerTimer) window.clearTimeout(this.schedulerTimer);
    this.nextNoteIndex = 0;
    this.onStateChange(PlaybackState.STOPPED, 0);
  }

  private stopAllSound() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.activeOscillators.clear();
  }

  private startProgressTracker() {
    const update = () => {
      if (!this.isPlaying || !this.ctx || !this.melody) return;
      
      const elapsed = this.ctx.currentTime - this.startTime;
      const totalDuration = this.melody.notes[this.melody.notes.length - 1].startTime + 
                           this.melody.notes[this.melody.notes.length - 1].duration + 0.5;

      if (elapsed > totalDuration) {
        this.stop();
      } else {
        this.onStateChange(PlaybackState.PLAYING, elapsed);
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  private scheduler() {
    if (!this.isPlaying || !this.ctx || !this.melody) return;

    while (this.nextNoteIndex < this.melody.notes.length &&
           this.melody.notes[this.nextNoteIndex].startTime < this.ctx.currentTime - this.startTime + this.scheduleAheadTime) {
      this.scheduleNote(this.melody.notes[this.nextNoteIndex]);
      this.nextNoteIndex++;
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private scheduleNote(note: Note) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    // Simple piano simulation using Sine/Triangle mix
    // In a real app, we would use a ConvolutionReverb and multiple oscillators with filters
    osc.type = 'triangle';
    osc.frequency.value = this.noteToFreq(note.pitch);

    // Envelope
    const time = this.startTime + note.startTime;
    const length = note.duration;
    
    // Attack
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(note.velocity * 0.6, time + 0.02);
    // Decay/Sustain
    gainNode.gain.exponentialRampToValueAtTime(note.velocity * 0.3, time + 0.1);
    // Release
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + length);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + length + 0.1); // Stop slightly after release

    this.activeOscillators.add(osc);
    osc.onended = () => {
      this.activeOscillators.delete(osc);
      gainNode.disconnect();
    };
  }

  private noteToFreq(note: string): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const key = note.slice(0, -1);
    const index = notes.indexOf(key);
    
    if (index === -1) return 440;

    // A4 is 440Hz, index 9 in octave 4
    // MIDI note number
    const midi = (octave * 12) + index + 12;
    const a4 = 69;
    return 440 * Math.pow(2, (midi - a4) / 12);
  }
}
