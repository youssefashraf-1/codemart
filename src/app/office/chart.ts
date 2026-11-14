import { Component, effect, ElementRef, OnDestroy, input, viewChild } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { monthlyReport } from '../domain';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

@Component({
  selector: 'app-finance-chart',
  template:
    '<div class="chart-canvas"><canvas #canvas role="img" aria-label="Grouped bar chart comparing fees, sales, income and expenses by track. Values are listed in the table below."></canvas></div>',
})
export class FinanceChart implements OnDestroy {
  readonly departments = input.required<ReturnType<typeof monthlyReport>['departments']>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'bar', number[], string>;

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const rows = this.departments();
      if (!canvas) return;
      const data = {
        labels: rows.map((row) => row.track),
        datasets: [
          { label: 'Fees', data: rows.map((row) => row.fees), backgroundColor: '#a7c92d' },
          { label: 'Store sales', data: rows.map((row) => row.sales), backgroundColor: '#538578' },
          {
            label: 'Other income',
            data: rows.map((row) => row.otherIncome),
            backgroundColor: '#716bb3',
          },
          { label: 'Expenses', data: rows.map((row) => row.expenses), backgroundColor: '#b96548' },
        ],
      };
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
        return;
      }
      this.chart = new Chart(canvas, {
        type: 'bar',
        data,
        options: {
          maintainAspectRatio: false,
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? false
            : { duration: 250 },
          layout: { padding: { top: 8 } },
          plugins: {
            legend: {
              align: 'start',
              position: 'bottom',
              labels: { usePointStyle: true, padding: 18 },
            },
          },
          elements: { bar: { borderRadius: 4 } },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: {
                callback: (amount) =>
                  new Intl.NumberFormat('en', { notation: 'compact' }).format(Number(amount)),
              },
              title: { display: true, text: 'EGP' },
            },
          },
        },
      });
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}
