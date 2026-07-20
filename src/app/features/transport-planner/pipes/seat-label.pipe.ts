import { Pipe, PipeTransform } from '@angular/core';
import { Driver } from '../models/transport.models';
import { occupiedSeats, remainingSeats } from '../utils/seat.utils';

@Pipe({ name: 'seatLabel', standalone: true })
export class SeatLabelPipe implements PipeTransform {
  transform(driver: Driver): string {
    return `${occupiedSeats(driver)} / ${driver.availableSeats} seats`;
  }
}

@Pipe({ name: 'remainingLabel', standalone: true })
export class RemainingLabelPipe implements PipeTransform {
  transform(driver: Driver): string {
    const remaining = remainingSeats(driver);
    if (remaining < 0) {
      return `${Math.abs(remaining)} over capacity`;
    }
    return `${remaining} remaining`;
  }
}
