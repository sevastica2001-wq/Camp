import {
  DEFAULT_FILTERS,
  Driver,
  Passenger,
  PlannerFilters,
} from '../models/transport.models';
import { hasFreeSeats, isFull, isOverCapacity, resolvePassengers } from './seat.utils';
import { normalizeLocation } from './id.utils';

export function matchesSearch(
  text: string,
  query: string,
): boolean {
  if (!query.trim()) {
    return true;
  }
  return text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

export function passengerMatchesSearch(passenger: Passenger, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  const haystack = [
    passenger.name,
    passenger.departureLocation,
    passenger.returnLocation,
    passenger.phone ?? '',
    passenger.email ?? '',
    passenger.notes ?? '',
  ].join(' ');
  return matchesSearch(haystack, query);
}

export function driverMatchesSearch(
  driver: Driver,
  passengers: Passenger[],
  query: string,
): boolean {
  if (!query.trim()) {
    return true;
  }
  const assigned = resolvePassengers(driver, passengers);
  const haystack = [
    driver.name,
    driver.carModel,
    driver.carColor,
    driver.departureLocation,
    driver.returnLocation,
    ...assigned.map((p) => p.name),
  ].join(' ');
  return matchesSearch(haystack, query);
}

export function filterPassengers(
  passengers: Passenger[],
  filters: PlannerFilters,
  query: string,
): Passenger[] {
  return passengers.filter((p) => {
    if (!passengerMatchesSearch(p, query)) {
      return false;
    }
    if (filters.assigned && !p.assignedDriverId) {
      return false;
    }
    if (filters.unassigned && p.assignedDriverId) {
      return false;
    }
    if (filters.departureCity) {
      if (normalizeLocation(p.departureLocation) !== normalizeLocation(filters.departureCity)) {
        return false;
      }
    }
    if (filters.returnCity) {
      if (normalizeLocation(p.returnLocation) !== normalizeLocation(filters.returnCity)) {
        return false;
      }
    }
    return true;
  });
}

export function filterDrivers(
  drivers: Driver[],
  passengers: Passenger[],
  filters: PlannerFilters,
  query: string,
): Driver[] {
  const active =
    filters.driversWithSeats ||
    filters.driversFull ||
    filters.driversOverCapacity ||
    !!filters.departureCity ||
    !!filters.returnCity ||
    !!query.trim();

  return drivers.filter((d) => {
    if (!driverMatchesSearch(d, passengers, query)) {
      return false;
    }

    const capacityChecks: boolean[] = [];
    if (filters.driversWithSeats) {
      capacityChecks.push(hasFreeSeats(d));
    }
    if (filters.driversFull) {
      capacityChecks.push(isFull(d));
    }
    if (filters.driversOverCapacity) {
      capacityChecks.push(isOverCapacity(d));
    }
    if (capacityChecks.length > 0 && !capacityChecks.some(Boolean)) {
      return false;
    }

    if (filters.departureCity) {
      if (normalizeLocation(d.departureLocation) !== normalizeLocation(filters.departureCity)) {
        return false;
      }
    }
    if (filters.returnCity) {
      if (normalizeLocation(d.returnLocation) !== normalizeLocation(filters.returnCity)) {
        return false;
      }
    }

    if (!active) {
      return true;
    }
    return true;
  });
}

export function uniqueLocations(values: string[]): string[] {
  const map = new Map<string, string>();
  for (const v of values) {
    const key = normalizeLocation(v);
    if (!key) {
      continue;
    }
    if (!map.has(key)) {
      map.set(key, v.trim());
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

export function resetFilters(): PlannerFilters {
  return { ...DEFAULT_FILTERS };
}
