import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { demoPassword } from './domain';
import { Office } from './office/office';
import { Auth } from './public/auth';
import { Profile } from './student/profile';
import { Store } from './store';
import { isolateStorage } from './testing';

function routeFor(path: string) {
  return { snapshot: { routeConfig: { path }, queryParamMap: new Map() } };
}

describe('CodeMart pages', () => {
  let restore: () => void;
  let store: Store;

  beforeEach(() => {
    restore = isolateStorage();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    store = TestBed.inject(Store);
    store.logout();
  });
  function useRoute(path: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: ActivatedRoute, useValue: routeFor(path) }],
    });
  }

  afterEach(() => {
    store.logout();
    restore();
  });

  it('login page offers demo accounts and fills credentials', () => {
    useRoute('login');
    const fixture = TestBed.createComponent(Auth);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const demos = page.querySelectorAll<HTMLButtonElement>('.demo-buttons button');
    expect(demos.length).toBe(3);
    demos[1].click();
    const form = (fixture.componentInstance as unknown as { form: { username: string } }).form;
    expect(form.username).toBe('finance');
    expect(page.querySelector('input[type="file"]')).toBeNull();
  });

  it('signup page collects photo, card and learning preferences', () => {
    useRoute('signup');
    const fixture = TestBed.createComponent(Auth);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('input[type="email"]')).not.toBeNull();
    expect(page.querySelector('input[type="file"]')).not.toBeNull();
    expect(page.querySelector('select[name="card"]')).not.toBeNull();
    expect(page.querySelector('select[name="schedule"]')).not.toBeNull();
    expect(page.querySelector('input[name="updates"]')).not.toBeNull();
  });

  it('profile shows the signed-in student details', async () => {
    await store.login('student', demoPassword);
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nour Hassan');
    expect(text).toContain('student@codemart.example');
    expect(text).toContain('•••• 4242');
  });

  it('finance workspace hides the catalog from accounting but shows it to admins', async () => {
    await store.login('finance', demoPassword);
    let fixture = TestBed.createComponent(Office);
    fixture.detectChanges();
    const menu = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav.tabs button')).map(
        (button) => button.textContent?.trim(),
      );
    expect(fixture.nativeElement.querySelector('app-finance-chart')).not.toBeNull();
    expect(menu()).not.toContain('Catalog');
    fixture.destroy();
    store.logout();
    await store.login('admin', demoPassword);
    fixture = TestBed.createComponent(Office);
    fixture.detectChanges();
    expect(menu()).toContain('Catalog');
  });
});
