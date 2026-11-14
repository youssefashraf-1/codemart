import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { initial } from '../domain';
import { Store } from '../store';

@Component({
  imports: [RouterLink],
  template: `
    @if (store.user(); as user) {
      <div class="shell page">
        <header class="page-head">
          <p class="eyebrow">Account</p>
          <h1>Your profile.</h1>
        </header>
        <section class="panel profile-panel">
          <div class="profile-heading">
            @if (user.avatar) {
              <img
                class="avatar"
                [src]="user.avatar"
                alt="Profile photo"
                loading="lazy"
                width="80"
                height="80"
              />
            } @else {
              <span class="avatar" aria-hidden="true">{{ initial(user.name) }}</span>
            }
            <div>
              <h2>{{ user.name }}</h2>
              <p>
                &#64;{{ user.username }} <span class="pill">{{ user.role }}</span>
              </p>
            </div>
          </div>
          <dl class="profile-facts">
            <div>
              <dt>Email</dt>
              <dd>{{ user.email }}</dd>
            </div>
            @if (user.role === 'student') {
              <div>
                <dt>Preferred track</dt>
                <dd>{{ user.track }}</dd>
              </div>
              <div>
                <dt>Demo credit card</dt>
                <dd>{{ user.card ? 'Test card · •••• ' + user.card : 'No test card selected' }}</dd>
              </div>
            }
          </dl>
          <a class="button ink" [routerLink]="user.role === 'student' ? '/student' : '/office'"
            >{{ user.role === 'student' ? 'My learning' : 'Finance workspace' }}
            <span aria-hidden="true">↗</span></a
          >
        </section>
      </div>
    }
  `,
})
export class Profile {
  protected readonly store = inject(Store);
  protected readonly initial = initial;
}
