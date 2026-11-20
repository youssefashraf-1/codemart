import { Injectable, signal } from '@angular/core';

export type Tone = 'success' | 'error';
export const soundKey = 'codemart.sound.v1';

// Notes (Hz) for each feedback tone: a rising pair for success, a falling pair for errors.
const melodies: Record<Tone, number[]> = { success: [660, 880], error: [330, 220] };

@Injectable({ providedIn: 'root' })
export class Feedback {
  readonly status = signal('');
  readonly tone = signal<Tone>('success');
  // Sound preference is a per-device convenience that should survive restarts → local storage.
  readonly sound = signal(this.readSound());
  private timeout = 0;
  private audio?: AudioContext;

  announce(message: string, tone: Tone = 'success') {
    clearTimeout(this.timeout);
    this.status.set(message);
    this.tone.set(tone);
    this.play(tone);
    this.timeout = window.setTimeout(() => this.status.set(''), 4200);
  }

  attempt(action: () => void) {
    try {
      action();
    } catch (error) {
      this.announce(
        error instanceof Error ? error.message : 'Something went wrong. Try again.',
        'error',
      );
    }
  }

  toggleSound() {
    const next = !this.sound();
    this.sound.set(next);
    try {
      localStorage.setItem(soundKey, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
    if (next) this.play('success');
  }

  private readSound(): boolean {
    try {
      return localStorage.getItem(soundKey) !== 'false';
    } catch {
      return true;
    }
  }

  private play(tone: Tone) {
    if (!this.sound() || typeof AudioContext === 'undefined') return;
    try {
      this.audio ??= new AudioContext();
      const context = this.audio;
      if (context.state === 'suspended') void context.resume();
      melodies[tone].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.09;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = tone === 'success' ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.17);
      });
    } catch {
      // Audio is an enhancement only; ignore failures.
    }
  }
}
