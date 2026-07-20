import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { KeyboardShortcutsService } from './core/keyboard-shortcuts.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
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
