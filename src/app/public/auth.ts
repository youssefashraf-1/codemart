import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { demoPassword, demos, tracks } from '../domain';
import { Feedback } from '../feedback';
import { Registration, Store } from '../store';

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.html',
})
export class Auth {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  private readonly route = inject(ActivatedRoute);
  protected readonly joining = this.route.snapshot.routeConfig?.path === 'signup';
  protected readonly demos = demos;
  protected readonly tracks = tracks;
  protected readonly busy = signal(false);
  protected readonly loadingPhoto = signal(false);
  protected readonly error = signal('');
  protected readonly next = this.route.snapshot.queryParamMap.get('next');
  protected readonly form: Registration = {
    name: '',
    username: '',
    email: '',
    password: '',
    track: this.store.preferredTrack() ?? 'Web',
    card: '',
    avatar: '',
  };

  protected fillDemo(username: string) {
    this.form.username = username;
    this.form.password = demoPassword;
    this.error.set('');
  }

  protected photo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.avatar = '';
    this.error.set('');
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 250 * 1024) {
      this.error.set('Choose a PNG, JPG or WebP photo under 250 KB.');
      input.value = '';
      return;
    }
    this.loadingPhoto.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.form.avatar = String(reader.result);
    };
    reader.onerror = () => {
      this.error.set('This photo could not be read.');
      input.value = '';
    };
    reader.onloadend = () => this.loadingPhoto.set(false);
    reader.readAsDataURL(file);
  }

  protected async submit() {
    if (this.busy() || this.loadingPhoto()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.joining) await this.store.signup(this.form);
      else await this.store.login(this.form.username, this.form.password);
      const role = this.store.user()?.role;
      const target = this.next?.split('?')[0];
      const allowed =
        role === 'student' ? ['/profile', '/bag', '/cohorts', '/student'] : ['/profile', '/office'];
      await this.router.navigateByUrl(
        target && allowed.includes(target)
          ? this.next!
          : role === 'student'
            ? '/student'
            : '/office',
      );
      this.feedback.announce(this.joining ? 'Your student account is ready.' : 'You signed in.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
