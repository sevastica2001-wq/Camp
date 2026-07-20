import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ThemeService } from './core/theme.service';
import { KeyboardShortcutsService } from './core/keyboard-shortcuts.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly shortcuts = inject(KeyboardShortcutsService);

  ngOnInit(): void {
    void this.theme;
    this.shortcuts.start();
  }
}
