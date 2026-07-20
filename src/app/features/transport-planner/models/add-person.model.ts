export interface AddPersonFormResult {
  name: string;
  isDriver: boolean;
  availableSeats?: number;
  assignedDriverId?: string;
  departureLocation: string;
  returnLocation: string;
  notes?: string;
}

export interface AddPersonDialogData {
  mode: 'create' | 'edit';
  passengerId?: string;
  name?: string;
  isDriver?: boolean;
  availableSeats?: number;
  assignedDriverId?: string;
  departureLocation?: string;
  returnLocation?: string;
  notes?: string;
}
