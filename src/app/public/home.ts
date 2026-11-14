import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cohorts } from '../domain';

@Component({
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home {
  protected readonly cohorts = cohorts;
}
