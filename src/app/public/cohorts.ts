import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { cohorts, money } from '../domain';
import { Store } from '../store';
import { Feedback } from '../feedback';

@Component({
  imports: [RouterLink],
  templateUrl: './cohorts.html',
})
export class Cohorts {
  protected readonly store = inject(Store);
  private readonly feedback = inject(Feedback);
  private readonly route = inject(ActivatedRoute);
  protected readonly cohorts = cohorts;
  protected readonly money = money;
  protected get selected() {
    return this.route.snapshot.queryParamMap.get('track') || this.store.preferredTrack();
  }

  enrolled(track: string) {
    return this.store.enrollments().some((row) => row.track === track);
  }

  enroll(cohort: (typeof cohorts)[number]) {
    this.feedback.attempt(() => {
      this.store.enroll(cohort.track);
      this.store.rememberTrack(cohort.track);
      this.feedback.announce(`You joined ${cohort.name}. Your three invoices are ready.`);
    });
  }
}
