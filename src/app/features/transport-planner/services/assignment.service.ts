import { Injectable, inject } from '@angular/core';
import { Driver, Passenger } from '../models/transport.models';
import { canAssignPassenger } from '../validators/transport.validators';
import { CommandHistoryService } from './command-history.service';
import { TransportStore } from '../store/transport.store';

export type DropHighlight = 'ok' | 'warn' | 'danger' | 'blocked' | null;

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private readonly store = inject(TransportStore);
  private readonly history = inject(CommandHistoryService);

  evaluateDrop(passengerId: string, driverId: string | null): DropHighlight {
    if (!driverId) {
      return 'ok';
    }
    const passenger = this.store.getPassenger(passengerId);
    const driver = this.store.getDriver(driverId);
    if (!passenger || !driver) {
      return 'blocked';
    }
    const result = canAssignPassenger(passenger, driver, this.store.passengers());
    if (result.duplicate) {
      return 'blocked';
    }
    if (result.overCapacity) {
      return 'danger';
    }
    if (result.locationMismatch) {
      return 'warn';
    }
    return 'ok';
  }

  canEnter(passengerId: string, driverId: string | null): boolean {
    if (!driverId) {
      return true;
    }
    return this.evaluateDrop(passengerId, driverId) !== 'blocked';
  }

  dropPassenger(passengerId: string, targetDriverId: string | null): void {
    const highlight = this.evaluateDrop(passengerId, targetDriverId);
    if (highlight === 'blocked') {
      return;
    }
    this.history.movePassenger(passengerId, targetDriverId);
  }

  getDriverPassengers(driver: Driver): Passenger[] {
    const map = this.store.passengersById();
    return driver.assignedPassengers
      .map((id) => map.get(id))
      .filter((p): p is Passenger => !!p);
  }
}
