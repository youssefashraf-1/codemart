import { Store, storageKeys } from './store';
import { demoPassword, monthOf, today } from './domain';

describe('CodeMart browser records', () => {
  let store: Store;
  let restore: () => void;

  beforeEach(() => {
    const keys: [Storage, string][] = [
      [localStorage, storageKeys.records],
      [sessionStorage, storageKeys.session],
      [sessionStorage, storageKeys.cart],
    ];
    const snapshots = keys.map(([storage, key]) => storage.getItem(key));
    const previousTrack = document.cookie
      .split('; ')
      .find((item) => item.startsWith(storageKeys.track + '='));
    restore = () => {
      keys.forEach(([storage, key], index) => {
        const value = snapshots[index];
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      });
      document.cookie = previousTrack ?? `${storageKeys.track}=; Max-Age=0`;
    };
    keys.forEach(([storage, key]) => storage.removeItem(key));
    store = new Store();
  });

  afterEach(() => restore());

  it('creates three installments, scopes them to the student and records payment once', async () => {
    await store.login('student', demoPassword);
    expect(store.invoices().length).toBe(3);
    expect(() => store.payInvoice('CM-105')).toThrowError('Invoice is unavailable.');
    store.enroll('Data');
    expect(
      store
        .invoices()
        .filter((row) => row.track === 'Data')
        .map((row) => row.amount),
    ).toEqual([3500, 3500, 3500]);
    expect(() => store.enroll('Data')).toThrow();
    store.payInvoice('CM-102');
    expect(store.invoices().find((row) => row.id === 'CM-102')?.paidOn).toBe(today());
    expect(() => store.payInvoice('CM-102')).toThrowError('This invoice is already paid.');
    expect(() => store.report(monthOf(today()))).toThrow();
  });

  it('carries a guest bag into checkout and rolls the royalty into payroll', async () => {
    store.toggleCart('angular');
    await store.login('student', demoPassword);
    expect(store.cart().length).toBe(1);
    const id = store.checkout();
    expect(store.orders()[0]).toEqual(jasmine.objectContaining({ id }));
    expect(store.cart()).toEqual([]);
    store.logout();
    await store.login('finance', demoPassword);
    expect(store.report(monthOf(today())).payroll[0].royalties).toBe(150);
    expect(store.orders()).toEqual([]);
    expect(store.catalogue()).toEqual([]);
    expect(() => store.saveProduct(store.products()[0])).toThrow();
  });

  it('persists signup with a derived credential and a masked test card', async () => {
    const input = {
      username: 'tester',
      name: 'Demo User',
      email: 'tester@example.test',
      password: 'Sample!123',
      track: 'Cyber' as const,
      card: '4242',
      avatar: '',
    };
    await store.signup(input);
    expect(store.user()?.role).toBe('student');
    expect(store.user()?.card).toBe('4242');
    expect(localStorage.getItem(storageKeys.records)).not.toContain(input.password);
    expect(document.cookie).toContain(`${storageKeys.track}=Cyber`);
    store.logout();
    await expectAsync(store.login(input.username, 'wrong')).toBeRejected();
    await store.login(input.username, input.password);
    expect(store.user()?.username).toBe('tester');
    await expectAsync(store.signup(input)).toBeRejectedWithError(
      'That username or email is already in use.',
    );
  });
});
