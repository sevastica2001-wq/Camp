export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  departureLocation: string;
  returnLocation: string;
  notes?: string;
}

export interface Passenger extends Person {
  assignedDriverId?: string;
}

export interface Driver extends Person {
  carModel: string;
  carColor: string;
  availableSeats: number;
  existingPassengers: string[];
  assignedPassengers: string[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type CsvField =
  | 'name'
  | 'phone'
  | 'email'
  | 'departureLocation'
  | 'returnLocation'
  | 'notes'
  | 'isDriver'
  | 'carModel'
  | 'carColor'
  | 'availableSeats'
  | 'existingPassengers'
  | 'skip';

export type CsvColumnMapping = Partial<Record<CsvField, string>>;

export interface AppSettings {
  theme: ThemeMode;
  csvColumnMapping: CsvColumnMapping;
  collapsedDriverIds: string[];
}

export interface AppState {
  drivers: Driver[];
  passengers: Passenger[];
  settings: AppSettings;
  version: number;
}

export type ProblemSeverity = 'error' | 'warning' | 'info';

export type ProblemType =
  | 'duplicate_assignment'
  | 'unassigned_passenger'
  | 'over_capacity'
  | 'location_mismatch'
  | 'missing_passenger_ref'
  | 'zero_seats'
  | 'empty_seats';

export interface Problem {
  id: string;
  type: ProblemType;
  severity: ProblemSeverity;
  message: string;
  driverId?: string;
  passengerId?: string;
}

export interface PlannerSummary {
  drivers: number;
  passengers: number;
  assigned: number;
  unassigned: number;
  totalSeats: number;
  remainingSeats: number;
  overCapacityDrivers: number;
  warnings: number;
}

export type SeatStatus = 'available' | 'nearly_full' | 'over_capacity';

export interface PlannerFilters {
  assigned: boolean;
  unassigned: boolean;
  driversWithSeats: boolean;
  driversFull: boolean;
  driversOverCapacity: boolean;
  departureCity: string;
  returnCity: string;
}

export const DEFAULT_FILTERS: PlannerFilters = {
  assigned: false,
  unassigned: false,
  driversWithSeats: false,
  driversFull: false,
  driversOverCapacity: false,
  departureCity: '',
  returnCity: '',
};

export const APP_STATE_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  csvColumnMapping: {},
  collapsedDriverIds: [],
};

export function createEmptyState(): AppState {
  return {
    drivers: [],
    passengers: [],
    settings: { ...DEFAULT_SETTINGS, csvColumnMapping: {}, collapsedDriverIds: [] },
    version: APP_STATE_VERSION,
  };
}
