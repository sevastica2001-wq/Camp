import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'locationBadge', standalone: true })
export class LocationBadgePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '—';
    }
    return value.trim();
  }
}
