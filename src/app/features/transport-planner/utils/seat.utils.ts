import { Driver, Passenger, SeatStatus } from '../models/transport.models';

export function occupiedSeats(driver: Driver): number {
  return driver.assignedPassengers.length;
}

export function remainingSeats(driver: Driver): number {
  return driver.availableSeats - occupiedSeats(driver);
}

export function seatStatus(driver: Driver): SeatStatus {
  const remaining = remainingSeats(driver);
  if (remaining < 0) {
    return 'over_capacity';
  }
  if (remaining <= 1 && driver.availableSeats > 0) {
    return 'nearly_full';
  }
  return 'available';
}

export function seatFillRatio(driver: Driver): number {
  if (driver.availableSeats <= 0) {
    return occupiedSeats(driver) > 0 ? 1 : 0;
  }
  return Math.min(1, occupiedSeats(driver) / driver.availableSeats);
}

export function isOverCapacity(driver: Driver): boolean {
  return remainingSeats(driver) < 0;
}

export function hasFreeSeats(driver: Driver): boolean {
  return remainingSeats(driver) > 0;
}

export function isFull(driver: Driver): boolean {
  return remainingSeats(driver) === 0 && driver.availableSeats > 0;
}

export function resolvePassengers(
  driver: Driver,
  passengers: Passenger[],
): Passenger[] {
  const byId = new Map(passengers.map((p) => [p.id, p]));
  return driver.assignedPassengers
    .map((id) => byId.get(id))
    .filter((p): p is Passenger => !!p);
}
