import { Directive, HostBinding, input } from '@angular/core';

@Directive({
  selector: '[appEmptyState]',
  standalone: true,
})
export class EmptyStateDirective {
  readonly appEmptyState = input(false);

  @HostBinding('class.opacity-60')
  get muted(): boolean {
    return this.appEmptyState();
  }
}
