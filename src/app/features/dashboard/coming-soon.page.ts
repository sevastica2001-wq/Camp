import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bedOutline, calculatorOutline, checkboxOutline, constructOutline } from 'ionicons/icons';
import { CampContextService } from '../../core/camp-context/camp-context.service';

addIcons({ calculatorOutline, bedOutline, checkboxOutline, constructOutline });

const MODULE_COPY: Record<string, { title: string; blurb: string; icon: string }> = {
  budgeting: {
    title: 'Budgeting',
    blurb: 'Track camp costs, contributions, and expenses in one place.',
    icon: 'calculator-outline',
  },
  rooms: {
    title: 'Room management',
    blurb: 'Assign cabins and rooms, and see who sleeps where.',
    icon: 'bed-outline',
  },
  tasks: {
    title: 'Tasks',
    blurb: 'Organize setup checklists, volunteer jobs, and day-of duties.',
    icon: 'checkbox-outline',
  },
};

@Component({
  selector: 'app-coming-soon-page',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonButton,
    IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ meta().title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="app-page">
        <div class="app-page-inner app-page-inner--narrow app-fade-in">
          <p class="page-eyebrow">Coming soon</p>
          <div class="icon-wrap">
            <ion-icon [name]="meta().icon" />
          </div>
          <h1 class="app-brand">{{ meta().title }}</h1>
          <p class="app-brand-sub">{{ meta().blurb }}</p>
          <p class="hint">
            This module isn’t built yet. The nav is ready so organizers can jump here once we ship
            it.
          </p>
          <ion-button expand="block" class="cta" [routerLink]="transportLink()">
            Back to transport planner
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    ion-content {
      --background: transparent;
    }

    .page-eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--ctp-accent);
    }

    .icon-wrap {
      width: 3.25rem;
      height: 3.25rem;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--ctp-accent-soft);
      color: var(--ctp-accent);
      margin: 1rem 0 0.85rem;
      font-size: 1.6rem;
    }

    .hint {
      color: var(--ctp-text-muted);
      line-height: 1.45;
      margin: 1rem 0 0;
    }

    .cta {
      margin-top: 1.25rem;
      --border-radius: 12px;
      min-height: 48px;
      font-weight: 600;
    }
  `,
})
export class ComingSoonPage {
  readonly module = input.required<string>();
  private readonly campContext = inject(CampContextService);

  readonly meta = computed(() => {
    const key = this.module();
    return (
      MODULE_COPY[key] ?? {
        title: 'Coming soon',
        blurb: 'This camp feature is planned for a later release.',
        icon: 'construct-outline',
      }
    );
  });

  transportLink(): string[] {
    const id = this.campContext.campId();
    return id ? ['/camp', id, 'transportation'] : ['/dashboard'];
  }
}
