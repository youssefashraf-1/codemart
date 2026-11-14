import { Injectable, computed, signal } from '@angular/core';
import {
  Account,
  BudgetEntry,
  Invoice,
  PayrollTerms,
  Product,
  Records,
  Role,
  Track,
  addMonths,
  cohorts,
  demoPassword,
  demos,
  kinds,
  monthlyReport,
  orderLine,
  today,
  tracks,
} from './domain';
import { seed } from './seed';

export const storageKeys = {
  records: 'codemart.records.v1',
  session: 'codemart.session.v1',
  cart: 'codemart.cart.v1',
  track: 'codemart_track',
};
const accountPattern = /^[a-z0-9_]{3,24}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const positive = (amount: number) => Number.isInteger(amount) && amount > 0 && amount <= 1_000_000;
const validDate = (date: string) =>
  datePattern.test(date) && new Date(date).toISOString().startsWith(date);
const code = (prefix: string) => `${prefix}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

function read<T>(storage: Storage, key: string, fallback: T): T {
  const item = storage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

async function passwordHash(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bytes = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, salt: encoder.encode(salt) },
    key,
    256,
  );
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface Registration {
  username: string;
  name: string;
  email: string;
  track: Track;
  card: string;
  avatar: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class Store {
  private readonly records = signal(read<Records>(localStorage, storageKeys.records, seed()));
  private readonly session = signal(read<string | null>(sessionStorage, storageKeys.session, null));
  private readonly carts = signal(
    read<Record<string, string[]>>(sessionStorage, storageKeys.cart, {}),
  );
  readonly user = computed(() => {
    const account = this.records().accounts.find((person) => person.id === this.session());
    if (!account) return null;
    const { credential, ...profile } = account;
    return profile;
  });
  readonly products = computed(() => this.records().products.filter((product) => product.active));
  readonly cart = computed(() => {
    const ids = this.carts()[this.user()?.id ?? 'guest'] ?? [];
    return this.products().filter((product) => ids.includes(product.id));
  });
  readonly invoices = computed(() => {
    const user = this.user();
    if (user?.role === 'student')
      return this.records().invoices.filter((row) => row.studentId === user.id);
    return this.canAccess('accountant') ? this.records().invoices : [];
  });
  readonly orders = computed(() =>
    this.records().orders.filter((order) => order.studentId === this.user()?.id),
  );
  readonly enrollments = computed(() =>
    this.records().enrollments.filter((row) => row.studentId === this.user()?.id),
  );
  readonly people = computed(() =>
    this.canAccess('admin', 'accountant')
      ? this.records().accounts.map(({ id, name, username, role, track }) => ({
          id,
          name,
          username,
          role,
          track,
        }))
      : [],
  );
  readonly catalogue = computed(() => (this.canAccess('admin') ? this.records().products : []));
  readonly instructors = computed(() =>
    this.canAccess('admin', 'accountant')
      ? this.records().instructors.map(({ id, name, track }) => ({ id, name, track }))
      : [],
  );
  readonly preferredTrack = signal<Track | null>(this.readTrack());

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === storageKeys.records || event.key === null) {
        this.records.set(read(localStorage, storageKeys.records, seed()));
      }
    });
  }

  canAccess(...roles: Role[]): boolean {
    const user = this.user();
    return user !== null && roles.includes(user.role);
  }

  private update(transform: (records: Records) => Records) {
    const latest = read(localStorage, storageKeys.records, this.records());
    const next = transform(latest);
    localStorage.setItem(storageKeys.records, JSON.stringify(next));
    this.records.set(next);
  }

  private readTrack(): Track | null {
    const value = document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${storageKeys.track}=`))
      ?.split('=')[1];
    return tracks.find((track) => track === value) ?? null;
  }

  rememberTrack(track: Track | null) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${storageKeys.track}=${track ?? ''}; Max-Age=${track ? 2592000 : 0}; SameSite=Lax${secure}`;
    this.preferredTrack.set(track);
  }

  private signIn(id: string) {
    const guest = this.carts()['guest'] ?? [];
    if (guest.length) {
      const { guest: _, ...carts } = this.carts();
      if (
        this.records().accounts.some((account) => account.id === id && account.role === 'student')
      ) {
        carts[id] = [...new Set([...(carts[id] ?? []), ...guest])];
        this.saveCarts(carts);
      }
    }
    sessionStorage.setItem(storageKeys.session, JSON.stringify(id));
    this.session.set(id);
  }

  async login(username: string, password: string) {
    const identifier = username.trim().toLowerCase();
    const account = this.records().accounts.find((person) => person.username === identifier);
    const demo = demos.some((person) => person.id === account?.id);
    const valid = account?.credential
      ? (await passwordHash(password, account.credential.salt)) === account.credential.hash
      : demo && password === demoPassword;
    if (!account || !valid) throw new Error('Username or password is incorrect.');
    this.signIn(account.id);
  }

  async signup(input: Registration) {
    const username = input.username.trim().toLowerCase();
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!accountPattern.test(username))
      throw new Error('Use 3–24 letters, numbers or underscores for the username.');
    if (
      !name ||
      name.length > 80 ||
      email.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      throw new Error('Enter a name and a valid email address.');
    if (input.password.length < 8 || input.password.length > 128)
      throw new Error('Use a password of 8–128 characters.');
    if (input.card && !['4242', '5556'].includes(input.card))
      throw new Error('Choose a test card from the list.');
    if (!tracks.includes(input.track)) throw new Error('Choose a track.');
    if (
      input.avatar &&
      (!/^data:image\/(png|jpeg|webp);base64,/.test(input.avatar) || input.avatar.length > 350_000)
    ) {
      throw new Error('Choose a PNG, JPG or WebP photo under 250 KB.');
    }
    const salt = crypto.randomUUID();
    const hash = await passwordHash(input.password, salt);
    const account: Account = {
      id: crypto.randomUUID(),
      username,
      name,
      email,
      track: input.track,
      card: input.card,
      avatar: input.avatar,
      role: 'student',
      credential: { salt, hash },
    };
    this.update((records) => {
      if (
        records.accounts.some((person) => person.username === username || person.email === email)
      ) {
        throw new Error('That username or email is already in use.');
      }
      return { ...records, accounts: [...records.accounts, account] };
    });
    this.rememberTrack(account.track);
    this.signIn(account.id);
  }

  logout() {
    sessionStorage.removeItem(storageKeys.session);
    this.session.set(null);
  }

  private saveCarts(carts: Record<string, string[]>) {
    sessionStorage.setItem(storageKeys.cart, JSON.stringify(carts));
    this.carts.set(carts);
  }

  toggleCart(id: string) {
    const user = this.user();
    if (user && user.role !== 'student') throw new Error('Switch to a student account to shop.');
    if (!this.products().some((product) => product.id === id))
      throw new Error('This product is unavailable.');
    const owner = user?.id ?? 'guest';
    const current = this.carts()[owner] ?? [];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    this.saveCarts({ ...this.carts(), [owner]: next });
  }

  checkout() {
    const user = this.requireRole('student');
    const ids = this.cart().map((product) => product.id);
    if (!ids.length) throw new Error('Add an item to your bag first.');
    const id = code('ORD');
    this.update((records) => {
      const products = records.products.filter(
        (product) => product.active && ids.includes(product.id),
      );
      if (products.length !== ids.length)
        throw new Error('A product is no longer available. Check your bag.');
      const lines = products.map((product) => orderLine(product, records.instructors));
      return {
        ...records,
        orders: [{ id, studentId: user.id, date: today(), lines }, ...records.orders],
      };
    });
    this.saveCarts({ ...this.carts(), [user.id]: [] });
    return id;
  }

  enroll(track: Track) {
    const user = this.requireRole('student');
    const cohort = cohorts.find((entry) => entry.track === track);
    if (!cohort) throw new Error('Choose an available cohort.');
    const startedOn = today();
    this.update((records) => {
      if (records.enrollments.some((row) => row.studentId === user.id && row.track === track))
        throw new Error('You are already enrolled in this track.');
      const installments = [0, 1, 2].map((index): Invoice => ({
        id: code('CM'),
        studentId: user.id,
        track,
        label: `${cohort.name} · Installment ${index + 1} of 3`,
        amount: cohort.price / 3,
        issuedOn: startedOn,
        dueOn: addMonths(startedOn, index),
        paidOn: null,
      }));
      return {
        ...records,
        enrollments: [...records.enrollments, { studentId: user.id, track, startedOn }],
        invoices: [...records.invoices, ...installments],
      };
    });
  }

  createInvoice(input: Pick<Invoice, 'studentId' | 'track' | 'amount' | 'dueOn' | 'label'>) {
    this.requireRole('accountant', 'admin');
    if (
      !tracks.includes(input.track) ||
      !positive(input.amount) ||
      !validDate(input.dueOn) ||
      !input.label.trim()
    ) {
      throw new Error('Enter a description, track, due date and whole EGP amount.');
    }
    const invoice = {
      ...input,
      label: input.label.trim(),
      id: code('CM'),
      issuedOn: today(),
      paidOn: null,
    };
    this.update((records) => {
      if (
        !records.accounts.some(
          (person) => person.id === input.studentId && person.role === 'student',
        )
      )
        throw new Error('Choose a student.');
      return { ...records, invoices: [...records.invoices, invoice] };
    });
  }

  payInvoice(id: string) {
    const user = this.requireRole('student', 'accountant', 'admin');
    this.update((records) => {
      const invoice = records.invoices.find((row) => row.id === id);
      if (!invoice || (user.role === 'student' && invoice.studentId !== user.id))
        throw new Error('Invoice is unavailable.');
      if (invoice.paidOn) throw new Error('This invoice is already paid.');
      const invoices = records.invoices.map((row) =>
        row.id === id ? { ...row, paidOn: today() } : row,
      );
      return { ...records, invoices };
    });
  }

  saveBudget(input: BudgetEntry) {
    this.requireRole('accountant', 'admin');
    if (
      !tracks.includes(input.track) ||
      !positive(input.amount) ||
      !validDate(input.date) ||
      !input.label.trim() ||
      !['Income', 'Expense'].includes(input.type)
    ) {
      throw new Error('Enter a valid track, date, description and whole EGP amount.');
    }
    this.update((records) => {
      const entry = { ...input, label: input.label.trim(), id: input.id || code('BUD') };
      const budget = [...records.budget.filter((row) => row.id !== entry.id), entry];
      return { ...records, budget };
    });
  }

  deleteBudget(id: string) {
    this.requireRole('accountant', 'admin');
    this.update((records) => ({
      ...records,
      budget: records.budget.filter((row) => row.id !== id),
    }));
  }

  savePayroll(input: PayrollTerms) {
    this.requireRole('accountant', 'admin');
    if (
      !monthPattern.test(input.month) ||
      ![input.salary, input.allowances, input.deductions].every(
        (value) => value === 0 || positive(value),
      )
    ) {
      throw new Error('Enter whole EGP amounts of zero or more.');
    }
    this.update((records) => {
      const row = monthlyReport(records, input.month).payroll.find(
        (person) => person.id === input.instructorId,
      );
      if (!row || input.deductions > input.salary + input.allowances + row.royalties)
        throw new Error('Deductions cannot exceed gross pay.');
      const payroll = [
        ...records.payroll.filter(
          (entry) => entry.month !== input.month || entry.instructorId !== input.instructorId,
        ),
        input,
      ];
      return { ...records, payroll };
    });
  }

  saveProduct(input: Product) {
    this.requireRole('admin');
    if (
      !input.name.trim() ||
      !input.description.trim() ||
      !positive(input.price) ||
      !tracks.includes(input.track) ||
      !kinds.includes(input.kind)
    ) {
      throw new Error('Enter a name, description, track, category and whole EGP price.');
    }
    this.update((records) => {
      if (
        input.kind === 'Course' &&
        !records.instructors.some(
          (person) => person.id === input.instructorId && person.track === input.track,
        )
      ) {
        throw new Error('Select a course instructor from the same track.');
      }
      const product = {
        ...input,
        id: input.id || code('SKU'),
        name: input.name.trim(),
        description: input.description.trim(),
        instructorId: input.kind === 'Course' ? input.instructorId : '',
      };
      const products = input.id
        ? records.products.map((row) => (row.id === product.id ? product : row))
        : [...records.products, product];
      return { ...records, products };
    });
  }

  report(month: string) {
    this.requireRole('admin', 'accountant');
    if (!monthPattern.test(month)) throw new Error('Choose a valid report month.');
    return monthlyReport(this.records(), month);
  }

  private requireRole(...roles: Role[]) {
    const user = this.user();
    if (!user || !roles.includes(user.role))
      throw new Error('This action is unavailable for your account.');
    return user;
  }
}
