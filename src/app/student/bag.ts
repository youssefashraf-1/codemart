import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Feedback } from '../feedback';
import { money, total } from '../domain';
import { Store } from '../store';

@Component({
  imports: [RouterLink],
  templateUrl: './bag.html',
})
export class Bag {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  protected readonly money = money;
  protected readonly subtotal = computed(() => total(this.store.cart().map((item) => item.price)));

  remove(id: string) {
    this.feedback.attempt(() => {
      this.store.toggleCart(id);
      this.feedback.announce('Item removed from your bag.');
    });
  }

  checkout() {
    this.feedback.attempt(() => {
      const order = this.store.checkout();
      this.feedback.announce(`Demo order ${order} placed. Find your items in My learning.`);
      void this.router.navigate(['/student'], { queryParams: { view: 'orders' } });
    });
  }
}
