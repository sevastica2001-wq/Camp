import { Injectable, inject } from '@angular/core';
import { AppState, Driver, Passenger } from '../models/transport.models';
import { locationsMatch, normalizeLocation } from '../utils/id.utils';
import { remainingSeats } from '../utils/seat.utils';
import { CommandHistoryService } from './command-history.service';
import { TransportStore } from '../store/transport.store';

export interface AutoAssignResult {
  assignedCount: number;
  skippedCount: number;
  remainingUnassigned: number;
  assignments: Array<{ passengerName: string; driverName: string }>;
}

@Injectable({ providedIn: 'root' })
export class AutoAssignService {
  private readonly store = inject(TransportStore);
  private readonly history = inject(CommandHistoryService);

  run(): AutoAssignResult {
    const previous = this.history.snapshotState();
    const next = structuredClone(previous);
    const result = this.assignInto(next);

    this.history.execute({
      type: 'auto_assign',
      label: 'Auto assign',
      undo: () => this.store.replaceState(previous),
      redo: () => this.store.replaceState(next),
    });

    return result;
  }

  preview(): AutoAssignResult {
    return this.assignInto(structuredClone(this.store.snapshot()));
  }

  private assignInto(state: AppState): AutoAssignResult {
    const assignments: AutoAssignResult['assignments'] = [];
    let assignedCount = 0;
    let skippedCount = 0;

    const unassigned = state.passengers.filter((p) => !p.assignedDriverId);
    const byDeparture = new Map<string, Passenger[]>();

    for (const passenger of unassigned) {
      const key = normalizeLocation(passenger.departureLocation) || '__unknown__';
      const list = byDeparture.get(key) ?? [];
      list.push(passenger);
      byDeparture.set(key, list);
    }

    for (const [, group] of byDeparture) {
      for (const passenger of group) {
        const candidates = state.drivers
          .filter(
            (d) =>
              locationsMatch(d.departureLocation, passenger.departureLocation) &&
              remainingSeats(d) > 0,
          )
          .sort((a, b) => remainingSeats(b) - remainingSeats(a));

        const driver = candidates[0];
        if (!driver) {
          skippedCount += 1;
          continue;
        }

        this.assign(passenger, driver);
        assignedCount += 1;
        assignments.push({ passengerName: passenger.name, driverName: driver.name });
      }
    }

    return {
      assignedCount,
      skippedCount,
      remainingUnassigned: state.passengers.filter((p) => !p.assignedDriverId).length,
      assignments,
    };
  }

  private assign(passenger: Passenger, driver: Driver): void {
    passenger.assignedDriverId = driver.id;
    if (!driver.assignedPassengers.includes(passenger.id)) {
      driver.assignedPassengers = [...driver.assignedPassengers, passenger.id];
    }
  }
}
