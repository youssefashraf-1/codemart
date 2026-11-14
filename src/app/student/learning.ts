import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { cohorts, money, Order, OrderLine, sumOrder, total } from '../domain';
import { downloadFile } from '../download';
import { Feedback } from '../feedback';
import { Store } from '../store';

@Component({
  imports: [RouterLink, DatePipe],
  templateUrl: './learning.html',
})
export class Learning {
  protected readonly store = inject(Store);
  private readonly feedback = inject(Feedback);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly ordersSelected = computed(() => this.params()?.get('view') === 'orders');
  protected readonly cohorts = cohorts;
  protected readonly money = money;
  protected readonly sumOrder = sumOrder;
  protected readonly paid = computed(() =>
    total(
      this.store
        .invoices()
        .filter((row) => row.paidOn)
        .map((row) => row.amount),
    ),
  );
  protected readonly due = computed(() =>
    total(
      this.store
        .invoices()
        .filter((row) => !row.paidOn)
        .map((row) => row.amount),
    ),
  );

  pay(id: string) {
    this.feedback.attempt(() => {
      this.store.payInvoice(id);
      this.feedback.announce(`Demo payment recorded for ${id}.`);
    });
  }

  download(order: Order, line: OrderLine) {
    const details = {
      Course:
        'Starter lesson\n\n1. Write a one-paragraph project brief.\n2. Build a minimal proof of concept using sample data.\n3. Document your decisions and add a verification checklist.',
      Template:
        'Project template\n\nProject name:\nGoal:\nAudience:\nInputs:\nDeliverables:\nMilestones:\nVerification checklist:',
      Voucher: `Sample practice voucher\n\nCode: ${order.id}-${line.productId.toUpperCase()}\nFor the CodeMart classroom demo only.`,
    };
    downloadFile(
      `codemart-${line.productId}.txt`,
      `CodeMart · ${line.name}\nTrack: ${line.track}\nOrder: ${order.id}\n\n${details[line.kind]}\n`,
      'text/plain;charset=utf-8',
    );
  }
}
