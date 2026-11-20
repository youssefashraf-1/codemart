import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Assistant } from './assistant/assistant';
import { Feedback } from './feedback';
import { Store } from './store';

@Component({
  selector: 'app-root',
  imports: [Assistant, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(Store);
  protected readonly feedback = inject(Feedback);
  private readonly router = inject(Router);

  skip(event: Event) {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  logout() {
    this.store.logout();
    void this.router.navigate(['/']);
    this.feedback.announce('You signed out.');
  }
}
