import { Directive, effect, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[appScrollIntoView]',
  standalone: true,
})
export class ScrollIntoViewDirective {
  readonly appScrollIntoView = input<string | null>(null);
  readonly scrollTargetId = input.required<string>();

  private readonly el = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const focusId = this.appScrollIntoView();
      const targetId = this.scrollTargetId();
      if (focusId && focusId === targetId) {
        queueMicrotask(() => {
          this.el.nativeElement.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
          });
          this.el.nativeElement.classList.remove('driver-highlight');
          void this.el.nativeElement.offsetWidth;
          this.el.nativeElement.classList.add('driver-highlight');
        });
      }
    });
  }
}
