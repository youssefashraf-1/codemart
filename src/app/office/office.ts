import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BudgetEntry,
  Invoice,
  PayrollTerms,
  Product,
  kinds,
  money,
  monthLabel,
  monthOf,
  today,
  total,
  tracks,
} from '../domain';
import { downloadJSON } from '../download';
import { Feedback } from '../feedback';
import { Store } from '../store';
import { FinanceChart } from './chart';

type Section = 'Overview' | 'Student fees' | 'Payroll' | 'Catalog';
const sections: Section[] = ['Overview', 'Student fees', 'Payroll'];

@Component({
  imports: [FormsModule, DatePipe, FinanceChart],
  templateUrl: './office.html',
})
export class Office {
  protected readonly store = inject(Store);
  private readonly feedback = inject(Feedback);
  protected readonly section = signal<Section>('Overview');
  protected readonly menu = computed<Section[]>(() =>
    this.store.canAccess('admin') ? [...sections, 'Catalog'] : sections,
  );
  protected readonly month = signal(monthOf(today()));
  protected readonly report = computed(() => this.store.report(this.month()));
  protected readonly tracks = tracks;
  protected readonly kinds = kinds;
  protected readonly money = money;
  protected readonly monthLabel = monthLabel;
  protected readonly totalIncome = computed(() =>
    total(this.report().departments.map((row) => row.income)),
  );
  protected readonly totalExpense = computed(() =>
    total(this.report().departments.map((row) => row.expenses)),
  );
  protected readonly balance = computed(() => total([this.totalIncome(), -this.totalExpense()]));
  protected readonly students = computed(() =>
    this.store.people().filter((account) => account.role === 'student'),
  );
  protected readonly feeFilter = signal('all');
  protected readonly fees = computed(() => {
    const filter = this.feeFilter();
    return this.store
      .invoices()
      .filter((row) => filter === 'all' || (filter === 'paid' ? !!row.paidOn : !row.paidOn));
  });
  protected readonly budget = signal<BudgetEntry | null>(null);
  protected readonly invoice = signal<Pick<
    Invoice,
    'studentId' | 'track' | 'label' | 'amount' | 'dueOn'
  > | null>(null);
  protected readonly payroll = signal<PayrollTerms | null>(null);
  protected readonly product = signal<Product | null>(null);

  select(section: Section) {
    this.section.set(section);
  }

  setMonth(value: string) {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    this.month.set(value);
    this.payroll.set(null);
    this.budget.set(null);
  }

  studentName(id: string) {
    return this.students().find((person) => person.id === id)?.name ?? 'Unknown student';
  }

  newBudget() {
    const date = this.month() === monthOf(today()) ? today() : `${this.month()}-01`;
    this.budget.set({ id: '', date, track: 'Web', type: 'Expense', label: '', amount: 0 });
  }

  editBudget(entry: BudgetEntry) {
    this.budget.set({ ...entry });
  }
  saveBudget() {
    this.feedback.attempt(() => {
      const value = this.budget();
      if (!value) return;
      this.store.saveBudget(value);
      this.setMonth(monthOf(value.date));
      this.feedback.announce('Budget entry saved.');
    });
  }

  deleteBudget(entry: BudgetEntry) {
    if (!window.confirm(`Remove “${entry.label}” from the budget?`)) return;
    this.feedback.attempt(() => {
      this.store.deleteBudget(entry.id);
      if (this.budget()?.id === entry.id) this.budget.set(null);
      this.feedback.announce('Budget entry removed.');
    });
  }

  newInvoice() {
    const student = this.students()[0];
    this.invoice.set({
      studentId: student?.id ?? '',
      track: student?.track ?? 'Web',
      label: '',
      amount: 0,
      dueOn: today(),
    });
  }

  saveInvoice() {
    this.feedback.attempt(() => {
      const value = this.invoice();
      if (!value) return;
      this.store.createInvoice(value);
      this.invoice.set(null);
      this.feeFilter.set('all');
      this.feedback.announce('Invoice issued.');
    });
  }

  markPaid(id: string) {
    this.feedback.attempt(() => {
      this.store.payInvoice(id);
      this.feedback.announce(`Payment marked for ${id}.`);
    });
  }

  editPayroll(row: ReturnType<Store['report']>['payroll'][number]) {
    const { id, salary, allowances, deductions } = row;
    this.payroll.set({ month: this.month(), instructorId: id, salary, allowances, deductions });
  }

  savePayroll() {
    this.feedback.attempt(() => {
      const value = this.payroll();
      if (!value) return;
      this.store.savePayroll(value);
      this.payroll.set(null);
      this.feedback.announce('Payroll terms saved for this month.');
    });
  }

  newProduct() {
    this.product.set({
      id: '',
      name: '',
      description: '',
      price: 0,
      track: 'Web',
      kind: 'Course',
      instructorId: '',
      active: true,
    });
  }

  editProduct(product: Product) {
    this.product.set({ ...product });
  }
  saveProduct() {
    this.feedback.attempt(() => {
      const value = this.product();
      if (!value) return;
      this.store.saveProduct(value);
      this.product.set(null);
      this.feedback.announce('Product saved.');
    });
  }

  exportReport(onlyPayroll = false) {
    const report = this.report();
    const prefix = onlyPayroll ? 'payroll' : 'finance';
    downloadJSON(
      `codemart-${prefix}-${report.month}.json`,
      onlyPayroll
        ? { month: report.month, currency: report.currency, payroll: report.payroll }
        : report,
    );
    this.feedback.announce('JSON report downloaded.');
  }
}
