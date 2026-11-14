import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { demoPassword } from './domain';
import { Store } from './store';
import { Home } from './public/home';

describe('CodeMart routes and home', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('renders the cohort and store entry points', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('h1')?.textContent?.replace(/\s/g, '')).toBe('Learnbybuilding.');
    expect(page.querySelectorAll('.track-card').length).toBe(3);
    expect(page.querySelector('a[href="/store"]')).not.toBeNull();
  });

  it('sends guests to login and redirects students away from finance', async () => {
    const store = TestBed.inject(Store);
    store.logout();
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/office');
    expect(router.url).toBe('/login?next=%2Foffice');
    try {
      await store.login('student', demoPassword);
      await harness.navigateByUrl('/office');
      expect(router.url).toBe('/profile');
    } finally {
      store.logout();
    }
  });
});
