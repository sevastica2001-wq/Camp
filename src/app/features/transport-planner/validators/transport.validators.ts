import {
  AppState,
  Driver,
  Passenger,
  PlannerSummary,
  Problem,
} from '../models/transport.models';
import { locationsMatch } from '../utils/id.utils';
import { isOverCapacity, remainingSeats } from '../utils/seat.utils';

export function detectProblems(state: AppState): Problem[] {
  const problems: Problem[] = [];
  const passengerById = new Map(state.passengers.map((p) => [p.id, p]));
  const assignmentCount = new Map<string, number>();

  for (const driver of state.drivers) {
    for (const pid of driver.assignedPassengers) {
      assignmentCount.set(pid, (assignmentCount.get(pid) ?? 0) + 1);
    }

    if (driver.availableSeats <= 0) {
      problems.push({
        id: `zero_seats_${driver.id}`,
        type: 'zero_seats',
        severity: 'warning',
        message: `${driver.name} has zero available seats`,
        driverId: driver.id,
      });
    }

    if (isOverCapacity(driver)) {
      problems.push({
        id: `over_capacity_${driver.id}`,
        type: 'over_capacity',
        severity: 'error',
        message: `${driver.name} is over capacity (${driver.assignedPassengers.length}/${driver.availableSeats})`,
        driverId: driver.id,
      });
    }

    if (driver.availableSeats > 0 && driver.assignedPassengers.length === 0) {
      problems.push({
        id: `empty_seats_${driver.id}`,
        type: 'empty_seats',
        severity: 'info',
        message: `${driver.name} has empty seats (${remainingSeats(driver)} remaining)`,
        driverId: driver.id,
      });
    }

    for (const name of driver.existingPassengers) {
      const found = state.passengers.some(
        (p) => p.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      );
      if (!found) {
        problems.push({
          id: `missing_ref_${driver.id}_${name}`,
          type: 'missing_passenger_ref',
          severity: 'warning',
          message: `${driver.name} references missing passenger "${name}"`,
          driverId: driver.id,
        });
      }
    }

    for (const pid of driver.assignedPassengers) {
      const passenger = passengerById.get(pid);
      if (!passenger) {
        continue;
      }
      const depMismatch = !locationsMatch(passenger.departureLocation, driver.departureLocation);
      const retMismatch = !locationsMatch(passenger.returnLocation, driver.returnLocation);
      if (depMismatch || retMismatch) {
        problems.push({
          id: `location_${driver.id}_${pid}`,
          type: 'location_mismatch',
          severity: 'warning',
          message: `${passenger.name} location mismatch with ${driver.name}`,
          driverId: driver.id,
          passengerId: pid,
        });
      }
    }
  }

  for (const [pid, count] of assignmentCount) {
    if (count > 1) {
      const passenger = passengerById.get(pid);
      problems.push({
        id: `duplicate_${pid}`,
        type: 'duplicate_assignment',
        severity: 'error',
        message: `${passenger?.name ?? 'Passenger'} is assigned to ${count} drivers`,
        passengerId: pid,
      });
    }
  }

  for (const passenger of state.passengers) {
    if (!passenger.assignedDriverId) {
      problems.push({
        id: `unassigned_${passenger.id}`,
        type: 'unassigned_passenger',
        severity: 'warning',
        message: `${passenger.name} has no ride`,
        passengerId: passenger.id,
      });
    }
  }

  const severityOrder = { error: 0, warning: 1, info: 2 };
  return problems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function computeSummary(state: AppState, problems: Problem[]): PlannerSummary {
  const totalSeats = state.drivers.reduce((sum, d) => sum + Math.max(0, d.availableSeats), 0);
  const assigned = state.passengers.filter((p) => !!p.assignedDriverId).length;
  const occupied = state.drivers.reduce((sum, d) => sum + d.assignedPassengers.length, 0);

  return {
    drivers: state.drivers.length,
    passengers: state.passengers.length,
    assigned,
    unassigned: state.passengers.length - assigned,
    totalSeats,
    remainingSeats: totalSeats - occupied,
    overCapacityDrivers: state.drivers.filter(isOverCapacity).length,
    warnings: problems.filter((p) => p.severity === 'warning' || p.severity === 'error').length,
  };
}

export function canAssignPassenger(
  passenger: Passenger,
  driver: Driver,
  passengers: Passenger[],
): { allowed: boolean; locationMismatch: boolean; overCapacity: boolean; duplicate: boolean } {
  const alreadyOnDriver = driver.assignedPassengers.includes(passenger.id);
  const assignedElsewhere =
    !!passenger.assignedDriverId && passenger.assignedDriverId !== driver.id;
  const duplicateOnOtherDrivers = passengers.some(
    (p) =>
      p.id === passenger.id &&
      p.assignedDriverId &&
      p.assignedDriverId !== driver.id,
  );

  const duplicate = alreadyOnDriver || assignedElsewhere || duplicateOnOtherDrivers;
  const locationMismatch =
    !locationsMatch(passenger.departureLocation, driver.departureLocation) ||
    !locationsMatch(passenger.returnLocation, driver.returnLocation);
  const wouldOccupy = alreadyOnDriver
    ? driver.assignedPassengers.length
    : driver.assignedPassengers.length + 1;
  const overCapacity = wouldOccupy > driver.availableSeats;

  return {
    allowed: !duplicate,
    locationMismatch,
    overCapacity,
    duplicate,
  };
}
