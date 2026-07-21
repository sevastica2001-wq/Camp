import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  input,
} from '@angular/core';
import { Subscription, animationFrameScheduler, interval } from 'rxjs';
import { takeUntil, Subject } from 'rxjs';

/**
 * While a CDK drag is active, scrolls this overflow container when the
 * pointer is held near the top/bottom edge — including when the scroll
 * host is not an ancestor of the drag source (e.g. unassigned → rooms).
 */
@Directive({
  selector: '[appDragAutoScroll]',
  standalone: true,
})
export class DragAutoScrollDirective implements OnDestroy {
  /** Set true while any drag is in progress. */
  readonly appDragAutoScroll = input(false);

  /** Fraction of host height that counts as an edge zone (0–0.5). */
  readonly edgeRatio = input(0.18);

  /** Pixels scrolled per animation frame. */
  readonly scrollStep = input(14);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  private pointerSub: Subscription | null = null;
  private scrollSub: Subscription | null = null;
  private readonly stopScroll$ = new Subject<void>();
  private direction: -1 | 0 | 1 = 0;

  constructor() {
    effect(() => {
      const active = this.appDragAutoScroll();
      if (active) {
        this.bindPointer();
      } else {
        this.unbind();
      }
    });
  }

  ngOnDestroy(): void {
    this.unbind();
    this.stopScroll$.complete();
  }

  private bindPointer(): void {
    if (this.pointerSub) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      const onMove = (event: PointerEvent | MouseEvent | TouchEvent): void => {
        const y = clientY(event);
        if (y == null) {
          return;
        }
        this.updateDirection(y);
      };
      // pointermove covers mouse + pen; touchmove for touch drags
      const targets: Array<[string, EventListener]> = [
        ['pointermove', onMove as EventListener],
        ['touchmove', onMove as EventListener],
      ];
      for (const [name, handler] of targets) {
        document.addEventListener(name, handler, { passive: true, capture: true });
      }
      this.pointerSub = new Subscription(() => {
        for (const [name, handler] of targets) {
          document.removeEventListener(name, handler, true);
        }
      });
    });
  }

  private unbind(): void {
    this.pointerSub?.unsubscribe();
    this.pointerSub = null;
    this.stopScrolling();
    this.direction = 0;
  }

  private updateDirection(clientY: number): void {
    const el = this.host.nativeElement;
    const rect = el.getBoundingClientRect();
    const zone = Math.max(28, rect.height * this.edgeRatio());
    let next: -1 | 0 | 1 = 0;

    if (clientY >= rect.top && clientY <= rect.top + zone) {
      next = el.scrollTop > 0 ? -1 : 0;
    } else if (clientY <= rect.bottom && clientY >= rect.bottom - zone) {
      const canDown = el.scrollHeight - el.scrollTop > el.clientHeight + 1;
      next = canDown ? 1 : 0;
    }

    // Also allow scrolling when pointer is just outside the panel but
    // vertically aligned with an edge (dragging past the top/bottom).
    if (!next && clientY < rect.top && clientY >= rect.top - zone * 1.5) {
      next = el.scrollTop > 0 ? -1 : 0;
    } else if (!next && clientY > rect.bottom && clientY <= rect.bottom + zone * 1.5) {
      const canDown = el.scrollHeight - el.scrollTop > el.clientHeight + 1;
      next = canDown ? 1 : 0;
    }

    if (next === this.direction) {
      return;
    }
    this.direction = next;
    if (next === 0) {
      this.stopScrolling();
    } else {
      this.startScrolling();
    }
  }

  private startScrolling(): void {
    this.stopScrolling();
    this.zone.runOutsideAngular(() => {
      this.scrollSub = interval(0, animationFrameScheduler)
        .pipe(takeUntil(this.stopScroll$))
        .subscribe(() => {
          if (this.direction === 0) {
            return;
          }
          this.host.nativeElement.scrollBy(0, this.direction * this.scrollStep());
        });
    });
  }

  private stopScrolling(): void {
    this.stopScroll$.next();
    this.scrollSub?.unsubscribe();
    this.scrollSub = null;
  }
}

function clientY(event: PointerEvent | MouseEvent | TouchEvent): number | null {
  if ('clientY' in event && typeof event.clientY === 'number') {
    return event.clientY;
  }
  const touch = (event as TouchEvent).touches?.[0] ?? (event as TouchEvent).changedTouches?.[0];
  return touch ? touch.clientY : null;
}
