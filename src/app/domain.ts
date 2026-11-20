export const tracks = ['Web', 'Data', 'Cyber'] as const;
export const kinds = ['Course', 'Template', 'Voucher'] as const;
export type Track = (typeof tracks)[number];
export type Kind = (typeof kinds)[number];
export type Role = 'student' | 'accountant' | 'admin';
export const schedules = ['Weekday mornings', 'Weekday evenings', 'Weekends'] as const;
export type Schedule = (typeof schedules)[number];

export interface Preferences {
  schedule: Schedule;
  updates: boolean;
}

export interface Account {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  track: Track;
  card: string;
  avatar: string;
  preferences?: Preferences;
  credential?: { salt: string; hash: string };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  track: Track;
  kind: Kind;
  price: number;
  instructorId: string;
  active: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  track: Track;
  salary: number;
  royalty: number;
}

export interface PayrollTerms {
  month: string;
  instructorId: string;
  salary: number;
  allowances: number;
  deductions: number;
}

export interface Invoice {
  id: string;
  studentId: string;
  track: Track;
  label: string;
  amount: number;
  issuedOn: string;
  dueOn: string;
  paidOn: string | null;
}

export interface Enrollment {
  studentId: string;
  track: Track;
  startedOn: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  track: Track;
  kind: Kind;
  price: number;
  instructorId: string;
  royalty: number;
}

export interface Order {
  id: string;
  studentId: string;
  date: string;
  lines: OrderLine[];
}

export interface BudgetEntry {
  id: string;
  date: string;
  track: Track;
  type: 'Income' | 'Expense';
  label: string;
  amount: number;
}

export interface Records {
  accounts: Account[];
  products: Product[];
  instructors: Instructor[];
  payroll: PayrollTerms[];
  invoices: Invoice[];
  enrollments: Enrollment[];
  orders: Order[];
  budget: BudgetEntry[];
}

export const cohorts = [
  {
    track: 'Web',
    name: 'Full-stack Web',
    length: '12 weeks',
    price: 12000,
    mark: '</>',
    title: 'Build for the browser.',
    detail:
      'Build and ship an Angular application, from accessible interfaces to integration with an API.',
  },
  {
    track: 'Data',
    name: 'Applied Data',
    length: '10 weeks',
    price: 10500,
    mark: '▥',
    title: 'Find the signal.',
    detail:
      'Clean datasets, query them with SQL, and turn the results into dashboards that answer real questions.',
  },
  {
    track: 'Cyber',
    name: 'Cyber Defense',
    length: '12 weeks',
    price: 11400,
    mark: '◇',
    title: 'Think like a defender.',
    detail:
      'Study identity, logging, and web security, then design and document defensive controls.',
  },
] as const;

export const demoPassword = 'Demo@2026';
export const demos = [
  { role: 'student', username: 'student', name: 'Nour Hassan', id: 'student-demo' },
  { role: 'accountant', username: 'finance', name: 'Salma Adel', id: 'accountant-demo' },
  { role: 'admin', username: 'admin', name: 'Omar Nabil', id: 'admin-demo' },
] as const;

const cairo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function today(): string {
  const parts = cairo.formatToParts(new Date());
  const value = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function addMonths(date: string, offset: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next.toISOString().slice(0, 10);
}
export const monthOf = (date: string) => date.slice(0, 7);
export const money = (amount: number) =>
  `EGP ${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(amount)}`;
export const total = (values: number[]) =>
  Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
export const sumOrder = (order: Order) => total(order.lines.map((line) => line.price));
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
export const initial = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export function orderLine(product: Product, instructors: Instructor[]): OrderLine {
  const { id, name, track, kind, price, instructorId } = product;
  const instructor = instructors.find((person) => person.id === instructorId);
  const royalty = kind === 'Course' ? Math.round(price * (instructor?.royalty ?? 0)) / 100 : 0;
  return { productId: id, name, track, kind, price, instructorId, royalty };
}

export function payrollRows(data: Records, month: string) {
  const courseSales = data.orders
    .filter((order) => monthOf(order.date) === month)
    .flatMap((order) => order.lines);
  return data.instructors.map((person) => {
    const terms = data.payroll.find(
      (entry) => entry.month === month && entry.instructorId === person.id,
    );
    const salary = terms?.salary ?? person.salary;
    const allowances = terms?.allowances ?? 0;
    const deductions = terms?.deductions ?? 0;
    const royalties = total(
      courseSales.filter((line) => line.instructorId === person.id).map((line) => line.royalty),
    );
    return {
      ...person,
      salary,
      allowances,
      deductions,
      royalties,
      net: total([salary, allowances, royalties, -deductions]),
    };
  });
}

export function monthlyReport(data: Records, month: string) {
  const payroll = payrollRows(data, month);
  const paid = data.invoices.filter(
    (invoice) => invoice.paidOn && monthOf(invoice.paidOn) === month,
  );
  const orders = data.orders.filter((order) => monthOf(order.date) === month);
  const entries = data.budget.filter((entry) => monthOf(entry.date) === month);
  const departments = tracks.map((track) => {
    const fees = total(
      paid.filter((invoice) => invoice.track === track).map((invoice) => invoice.amount),
    );
    const sales = total(
      orders
        .flatMap((order) => order.lines)
        .filter((line) => line.track === track)
        .map((line) => line.price),
    );
    const otherIncome = total(
      entries
        .filter((entry) => entry.track === track && entry.type === 'Income')
        .map((entry) => entry.amount),
    );
    const operatingExpenses = total(
      entries
        .filter((entry) => entry.track === track && entry.type === 'Expense')
        .map((entry) => entry.amount),
    );
    const payrollExpense = total(
      payroll.filter((row) => row.track === track).map((row) => row.net),
    );
    const income = total([fees, sales, otherIncome]);
    const expenses = total([operatingExpenses, payrollExpense]);
    return {
      track,
      fees,
      sales,
      otherIncome,
      operatingExpenses,
      payrollExpense,
      income,
      expenses,
      balance: total([income, -expenses]),
    };
  });
  return { month, currency: 'EGP', departments, payroll, budgetEntries: entries };
}
