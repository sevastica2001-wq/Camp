import { Injectable, inject, signal } from '@angular/core';
import { AppState, Driver, Passenger } from '../models/transport.models';
import { createId } from '../utils/id.utils';
import { TransportStore } from '../store/transport.store';
import { AddPersonFormResult } from '../models/add-person.model';

export type CommandType =
  | 'assign'
  | 'unassign'
  | 'move'
  | 'update_driver'
  | 'toggle_collapse'
  | 'bulk_replace'
  | 'auto_assign'
  | 'update_settings'
  | 'add_person'
  | 'update_person';

export interface HistoryCommand {
  type: CommandType;
  label: string;
  undo: () => void;
  redo: () => void;
}

@Injectable({ providedIn: 'root' })
export class CommandHistoryService {
  private readonly store = inject(TransportStore);
  private undoStack: HistoryCommand[] = [];
  private redoStack: HistoryCommand[] = [];
  private readonly maxSize = 100;

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.syncFlags();
  }

  execute(command: HistoryCommand): void {
    command.redo();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.syncFlags();
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) {
      return;
    }
    command.undo();
    this.redoStack.push(command);
    this.syncFlags();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) {
      return;
    }
    command.redo();
    this.undoStack.push(command);
    this.syncFlags();
  }

  snapshotState(): AppState {
    return structuredClone(this.store.snapshot());
  }

  replaceStateCommand(label: string, next: AppState, clearHistory = false): void {
    const previous = this.snapshotState();
    if (clearHistory) {
      this.clear();
    }
    this.execute({
      type: 'bulk_replace',
      label,
      undo: () => this.store.replaceState(previous),
      redo: () => this.store.replaceState(next),
    });
  }

  addPerson(form: AddPersonFormResult): void {
    const previous = this.snapshotState();
    const next = structuredClone(previous);

    if (form.isDriver) {
      const driver: Driver = {
        id: createId('drv'),
        name: form.name,
        departureLocation: form.departureLocation,
        returnLocation: form.returnLocation,
        notes: form.notes,
        carModel: '',
        carColor: '',
        availableSeats: form.availableSeats ?? 0,
        existingPassengers: [],
        assignedPassengers: [],
      };
      next.drivers = [...next.drivers, driver];
    } else {
      const passenger: Passenger = {
        id: createId('pax'),
        name: form.name,
        departureLocation: form.departureLocation,
        returnLocation: form.returnLocation,
        notes: form.notes,
      };
      if (form.assignedDriverId) {
        const driver = next.drivers.find((d) => d.id === form.assignedDriverId);
        if (driver) {
          passenger.assignedDriverId = driver.id;
          driver.assignedPassengers = [...driver.assignedPassengers, passenger.id];
        }
      }
      next.passengers = [...next.passengers, passenger];
    }

    this.execute({
      type: 'add_person',
      label: form.isDriver ? 'Add driver' : 'Add passenger',
      undo: () => this.store.replaceState(previous),
      redo: () => this.store.replaceState(next),
    });
  }

  updatePerson(passengerId: string, form: AddPersonFormResult): void {
    const previous = this.snapshotState();
    const next = structuredClone(previous);
    const passenger = next.passengers.find((p) => p.id === passengerId);
    if (!passenger) {
      return;
    }

    // Detach from any current driver first
    if (passenger.assignedDriverId) {
      const prevDriver = next.drivers.find((d) => d.id === passenger.assignedDriverId);
      if (prevDriver) {
        prevDriver.assignedPassengers = prevDriver.assignedPassengers.filter(
          (id) => id !== passengerId,
        );
      }
      passenger.assignedDriverId = undefined;
    }

    if (form.isDriver) {
      next.passengers = next.passengers.filter((p) => p.id !== passengerId);
      const driver: Driver = {
        id: createId('drv'),
        name: form.name,
        departureLocation: form.departureLocation,
        returnLocation: form.returnLocation,
        notes: form.notes,
        carModel: '',
        carColor: '',
        availableSeats: form.availableSeats ?? 0,
        existingPassengers: [],
        assignedPassengers: [],
      };
      next.drivers = [...next.drivers, driver];
    } else {
      passenger.name = form.name;
      passenger.departureLocation = form.departureLocation;
      passenger.returnLocation = form.returnLocation;
      passenger.notes = form.notes;
      if (form.assignedDriverId) {
        const driver = next.drivers.find((d) => d.id === form.assignedDriverId);
        if (driver) {
          passenger.assignedDriverId = driver.id;
          if (!driver.assignedPassengers.includes(passenger.id)) {
            driver.assignedPassengers = [...driver.assignedPassengers, passenger.id];
          }
        }
      }
    }

    this.execute({
      type: 'update_person',
      label: 'Update person',
      undo: () => this.store.replaceState(previous),
      redo: () => this.store.replaceState(next),
    });
  }

  assignPassenger(passengerId: string, driverId: string): void {
    const previous = this.snapshotState();
    const next = this.buildAssignState(previous, passengerId, driverId);
    const previousDriverId =
      previous.passengers.find((p) => p.id === passengerId)?.assignedDriverId ?? null;
    this.execute({
      type: 'assign',
      label: 'Assign passenger',
      undo: () =>
        this.store.applyPassengerAssignment(passengerId, previousDriverId, previous),
      redo: () => this.store.applyPassengerAssignment(passengerId, driverId, next),
    });
  }

  unassignPassenger(passengerId: string): void {
    const previous = this.snapshotState();
    const next = this.buildUnassignState(previous, passengerId);
    const previousDriverId =
      previous.passengers.find((p) => p.id === passengerId)?.assignedDriverId ?? null;
    this.execute({
      type: 'unassign',
      label: 'Unassign passenger',
      undo: () =>
        this.store.applyPassengerAssignment(passengerId, previousDriverId, previous),
      redo: () => this.store.applyPassengerAssignment(passengerId, null, next),
    });
  }

  movePassenger(passengerId: string, toDriverId: string | null): void {
    if (toDriverId) {
      this.assignPassenger(passengerId, toDriverId);
    } else {
      this.unassignPassenger(passengerId);
    }
  }

  updateDriver(driverId: string, patch: Partial<Driver>): void {
    const previous = this.snapshotState();
    const next = structuredClone(previous);
    const idx = next.drivers.findIndex((d) => d.id === driverId);
    if (idx < 0) {
      return;
    }
    next.drivers[idx] = { ...next.drivers[idx], ...patch, id: driverId };
    this.execute({
      type: 'update_driver',
      label: 'Update driver',
      undo: () => this.store.replaceState(previous),
      redo: () => this.store.replaceState(next),
    });
  }

  private syncFlags(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  private buildAssignState(state: AppState, passengerId: string, driverId: string): AppState {
    const next = structuredClone(state);
    const passenger = next.passengers.find((p) => p.id === passengerId);
    const driver = next.drivers.find((d) => d.id === driverId);
    if (!passenger || !driver) {
      return next;
    }

    if (passenger.assignedDriverId) {
      const prevDriver = next.drivers.find((d) => d.id === passenger.assignedDriverId);
      if (prevDriver) {
        prevDriver.assignedPassengers = prevDriver.assignedPassengers.filter(
          (id) => id !== passengerId,
        );
      }
    }

    if (!driver.assignedPassengers.includes(passengerId)) {
      driver.assignedPassengers = [...driver.assignedPassengers, passengerId];
    }
    passenger.assignedDriverId = driverId;
    return next;
  }

  private buildUnassignState(state: AppState, passengerId: string): AppState {
    const next = structuredClone(state);
    const passenger = next.passengers.find((p) => p.id === passengerId);
    if (!passenger) {
      return next;
    }
    if (passenger.assignedDriverId) {
      const driver = next.drivers.find((d) => d.id === passenger.assignedDriverId);
      if (driver) {
        driver.assignedPassengers = driver.assignedPassengers.filter((id) => id !== passengerId);
      }
    }
    passenger.assignedDriverId = undefined;
    return next;
  }
}
