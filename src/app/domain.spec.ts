import { addMonths, monthOf, monthlyReport, orderLine, today } from './domain';
import { seed } from './seed';

describe('CodeMart monthly finance', () => {
  it('keeps installment dates valid across short months', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-12-31', 2)).toBe('2027-02-28');
  });

  it('reconciles cash receipts, digital sales and payroll by track', () => {
    const data = seed();
    const report = monthlyReport(data, monthOf(today()));
    expect(report.departments[0]).toEqual({
      track: 'Web',
      fees: 4000,
      sales: 380,
      otherIncome: 0,
      income: 4380,
      operatingExpenses: 680,
      payrollExpense: 5500,
      expenses: 6180,
      balance: -1800,
    });
    expect(report.departments[1]).toEqual(
      jasmine.objectContaining({
        fees: 3500,
        sales: 1650,
        otherIncome: 1750,
        payrollExpense: 5295,
      }),
    );
    expect(report.departments[2]).toEqual(
      jasmine.objectContaining({ fees: 0, sales: 1550, payrollExpense: 5565 }),
    );
  });

  it('stores royalties at purchase time and excludes templates', () => {
    const { instructors, products } = seed();
    expect(orderLine(products[0], instructors).royalty).toBe(150);
    expect(orderLine({ ...products[3], instructorId: 'dina' }, instructors).royalty).toBe(0);
  });

  it('isolates transactions and adjustments by calendar month', () => {
    const data = seed();
    const month = monthOf(addMonths(today(), 1));
    data.payroll.push({
      month,
      instructorId: 'dina',
      salary: 4000,
      allowances: 100,
      deductions: 30,
    });
    const report = monthlyReport(data, month);
    expect(report.payroll[0]).toEqual(jasmine.objectContaining({ royalties: 0, net: 4070 }));
    expect(report.departments.every((row) => row.fees === 0 && row.sales === 0)).toBeTrue();
  });
});
