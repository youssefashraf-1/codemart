import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Feedback } from '../feedback';
import { kinds, money, Product, tracks } from '../domain';
import { Store } from '../store';

@Component({
  imports: [FormsModule],
  templateUrl: './catalog.html',
})
export class Catalog {
  protected readonly store = inject(Store);
  private readonly feedback = inject(Feedback);
  protected readonly tracks = tracks;
  protected readonly kinds = kinds;
  protected readonly money = money;
  protected readonly trackFilter = signal(this.store.preferredTrack() ?? 'All');
  protected readonly kindFilter = signal('All');
  protected readonly search = signal('');
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.store
      .products()
      .filter(
        (product) =>
          (this.trackFilter() === 'All' || this.trackFilter() === product.track) &&
          (this.kindFilter() === 'All' || this.kindFilter() === product.kind) &&
          (!query ||
            [product.name, product.description, product.track, product.kind]
              .join(' ')
              .toLowerCase()
              .includes(query)),
      );
  });

  inBag(id: string) {
    return this.store.cart().some((product) => product.id === id);
  }
  toggle(product: Product) {
    const remove = this.inBag(product.id);
    this.feedback.attempt(() => {
      this.store.toggleCart(product.id);
      this.feedback.announce(`${product.name} ${remove ? 'removed from' : 'added to'} your bag.`);
    });
  }
}
