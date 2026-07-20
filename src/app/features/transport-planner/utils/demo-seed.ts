import { Driver, Passenger, createEmptyState, AppState } from '../models/transport.models';
import { createId } from '../utils/id.utils';

export function createDemoSeed(): AppState {
  const andrei: Driver = {
    id: createId('drv'),
    name: 'Andrei Popescu',
    phone: '+40 721 111 111',
    email: 'andrei@example.com',
    departureLocation: 'Bucharest',
    returnLocation: 'Bucharest',
    notes: 'Leaves at 07:00',
    carModel: 'Dacia Logan',
    carColor: 'Silver',
    availableSeats: 4,
    existingPassengers: ['Maria Ionescu'],
    assignedPassengers: [],
  };

  const mihai: Driver = {
    id: createId('drv'),
    name: 'Mihai Radu',
    phone: '+40 722 222 222',
    departureLocation: 'Bucharest',
    returnLocation: 'Bucharest',
    carModel: 'VW Golf',
    carColor: 'Blue',
    availableSeats: 3,
    existingPassengers: [],
    assignedPassengers: [],
  };

  const daniel: Driver = {
    id: createId('drv'),
    name: 'Daniel Stoica',
    phone: '+40 723 333 333',
    departureLocation: 'Brașov',
    returnLocation: 'Brașov',
    carModel: 'Toyota Corolla',
    carColor: 'White',
    availableSeats: 4,
    existingPassengers: [],
    assignedPassengers: [],
  };

  const passengers: Passenger[] = [
    {
      id: createId('pax'),
      name: 'Maria Ionescu',
      phone: '+40 731 111 111',
      departureLocation: 'Bucharest',
      returnLocation: 'Bucharest',
    },
    {
      id: createId('pax'),
      name: 'Alex Dumitru',
      phone: '+40 731 222 222',
      departureLocation: 'Bucharest',
      returnLocation: 'Bucharest',
      notes: 'Needs early pickup',
    },
    {
      id: createId('pax'),
      name: 'John Smith',
      departureLocation: 'Bucharest',
      returnLocation: 'Bucharest',
    },
    {
      id: createId('pax'),
      name: 'George Enescu',
      phone: '+40 731 333 333',
      departureLocation: 'Bucharest',
      returnLocation: 'Ploiești',
    },
    {
      id: createId('pax'),
      name: 'Ana Marin',
      departureLocation: 'Bucharest',
      returnLocation: 'Bucharest',
    },
    {
      id: createId('pax'),
      name: 'Elena Vasilescu',
      departureLocation: 'Brașov',
      returnLocation: 'Brașov',
    },
    {
      id: createId('pax'),
      name: 'Cristian Popa',
      departureLocation: 'Brașov',
      returnLocation: 'Brașov',
    },
    {
      id: createId('pax'),
      name: 'Ioana Negrea',
      departureLocation: 'Cluj-Napoca',
      returnLocation: 'Cluj-Napoca',
      notes: 'No matching driver yet',
    },
  ];

  const maria = passengers[0];
  andrei.assignedPassengers = [maria.id];
  maria.assignedDriverId = andrei.id;

  const state = createEmptyState();
  state.drivers = [andrei, mihai, daniel];
  state.passengers = passengers;
  return state;
}
