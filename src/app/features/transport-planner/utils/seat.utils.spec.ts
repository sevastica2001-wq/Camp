import { describe, expect, it } from 'vitest';
import { remainingSeats, seatStatus } from './seat.utils';
import { Driver } from '../models/transport.models';
import { detectProblems } from '../validators/transport.validators';
import { createEmptyState } from '../models/transport.models';

function driver(partial: Partial<Driver> & Pick<Driver, 'assignedPassengers' | 'availableSeats'>): Driver {
  return {
    id: 'd1',
    name: 'Test',
    departureLocation: 'Bucharest',
    returnLocation: 'Bucharest',
    carModel: 'Car',
    carColor: 'Red',
    existingPassengers: [],
    ...partial,
  };
}

describe('seat utils', () => {
  it('computes remaining seats', () => {
    expect(remainingSeats(driver({ availableSeats: 4, assignedPassengers: ['a', 'b'] }))).toBe(2);
  });

  it('marks over capacity', () => {
    expect(seatStatus(driver({ availableSeats: 1, assignedPassengers: ['a', 'b'] }))).toBe(
      'over_capacity',
    );
  });
});

describe('detectProblems', () => {
  it('flags unassigned passengers', () => {
    const state = createEmptyState();
    state.passengers = [
      {
        id: 'p1',
        name: 'Ana',
        departureLocation: 'Bucharest',
        returnLocation: 'Bucharest',
      },
    ];
    const problems = detectProblems(state);
    expect(problems.some((p) => p.type === 'unassigned_passenger')).toBe(true);
  });
});
