import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Feedback {
  readonly status = signal('');
  private timeout = 0;

  announce(message: string) {
    clearTimeout(this.timeout);
    this.status.set(message);
    this.timeout = window.setTimeout(() => this.status.set(''), 4200);
  }

  attempt(action: () => void) {
    try {
      action();
    } catch (error) {
      this.announce(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  }
}
