import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="flex h-screen flex-col overflow-hidden bg-[var(--ctp-bg)] text-[var(--ctp-text)]">
      <div class="min-h-0 flex-1 overflow-auto">
        <router-outlet />
      </div>
    </div>
  `,
})
export class ShellLayout {}
