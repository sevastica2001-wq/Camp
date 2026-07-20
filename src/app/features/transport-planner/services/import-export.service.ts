import { Injectable, inject } from '@angular/core';
import Papa from 'papaparse';
import {
  AppState,
  CsvColumnMapping,
  CsvField,
  Driver,
  Passenger,
  createEmptyState,
} from '../models/transport.models';
import { createId, normalizeLocation, parseNameList } from '../utils/id.utils';
import { CommandHistoryService } from './command-history.service';
import { TransportStore } from '../store/transport.store';

export const CSV_FIELDS: Array<{ key: CsvField; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'departureLocation', label: 'Departure' },
  { key: 'returnLocation', label: 'Return' },
  { key: 'notes', label: 'Notes' },
  { key: 'isDriver', label: 'Is Driver' },
  { key: 'carModel', label: 'Car Model' },
  { key: 'carColor', label: 'Car Color' },
  { key: 'availableSeats', label: 'Available Seats' },
  { key: 'existingPassengers', label: 'Existing Passengers' },
];

const HEADER_ALIASES: Record<string, CsvField> = {
  name: 'name',
  'full name': 'name',
  'your name': 'name',
  phone: 'phone',
  'phone number': 'phone',
  email: 'email',
  'e-mail': 'email',
  departure: 'departureLocation',
  'departure location': 'departureLocation',
  'departure city': 'departureLocation',
  from: 'departureLocation',
  return: 'returnLocation',
  'return location': 'returnLocation',
  'return city': 'returnLocation',
  to: 'returnLocation',
  notes: 'notes',
  comments: 'notes',
  'are you a driver': 'isDriver',
  'are you a driver?': 'isDriver',
  driver: 'isDriver',
  'is driver': 'isDriver',
  'car model': 'carModel',
  car: 'carModel',
  vehicle: 'carModel',
  'car color': 'carColor',
  color: 'carColor',
  seats: 'availableSeats',
  'available seats': 'availableSeats',
  'how many seats': 'availableSeats',
  'existing passengers': 'existingPassengers',
  'passengers already with you': 'existingPassengers',
  passengers: 'existingPassengers',
};

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportWarning {
  message: string;
}

export interface ImportPreview {
  drivers: Driver[];
  passengers: Passenger[];
  warnings: ImportWarning[];
}

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly store = inject(TransportStore);
  private readonly history = inject(CommandHistoryService);

  parseFile(file: File): Promise<ParsedCsv> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (result) => {
          if (result.errors.length && !result.data.length) {
            reject(new Error(result.errors[0]?.message ?? 'CSV parse failed'));
            return;
          }
          resolve({
            headers: result.meta.fields?.filter(Boolean) ?? [],
            rows: result.data.map((row) => {
              const normalized: Record<string, string> = {};
              for (const [k, v] of Object.entries(row)) {
                normalized[k] = String(v ?? '').trim();
              }
              return normalized;
            }),
          });
        },
        error: (err) => reject(err),
      });
    });
  }

  guessMapping(headers: string[], remembered: CsvColumnMapping): CsvColumnMapping {
    const mapping: CsvColumnMapping = { ...remembered };
    for (const header of headers) {
      const alreadyMapped = Object.values(mapping).includes(header);
      if (alreadyMapped) {
        continue;
      }
      const field = HEADER_ALIASES[header.toLocaleLowerCase()];
      if (field && !mapping[field]) {
        mapping[field] = header;
      }
    }
    return mapping;
  }

  buildPreview(rows: Record<string, string>[], mapping: CsvColumnMapping): ImportPreview {
    const warnings: ImportWarning[] = [];
    const drivers: Driver[] = [];
    const passengers: Passenger[] = [];
    const nameIndex = new Map<string, Passenger>();

    if (!mapping.name) {
      warnings.push({ message: 'Name column is not mapped' });
    }

    for (const [index, row] of rows.entries()) {
      const name = this.cell(row, mapping.name);
      if (!name) {
        warnings.push({ message: `Row ${index + 2}: missing name, skipped` });
        continue;
      }

      const isDriver = this.isTruthy(this.cell(row, mapping.isDriver));
      const departureLocation = this.cell(row, mapping.departureLocation) || 'Unknown';
      const returnLocation =
        this.cell(row, mapping.returnLocation) || departureLocation;
      const base = {
        name,
        phone: this.cell(row, mapping.phone) || undefined,
        email: this.cell(row, mapping.email) || undefined,
        departureLocation,
        returnLocation,
        notes: this.cell(row, mapping.notes) || undefined,
      };

      if (isDriver) {
        const seatsRaw = this.cell(row, mapping.availableSeats);
        const availableSeats = Number.parseInt(seatsRaw, 10);
        if (!Number.isFinite(availableSeats)) {
          warnings.push({
            message: `Driver "${name}": seats missing or invalid, defaulting to 0`,
          });
        }
        const driver: Driver = {
          id: createId('drv'),
          ...base,
          carModel: this.cell(row, mapping.carModel) || 'Unknown',
          carColor: this.cell(row, mapping.carColor) || '',
          availableSeats: Number.isFinite(availableSeats) ? availableSeats : 0,
          existingPassengers: parseNameList(this.cell(row, mapping.existingPassengers)),
          assignedPassengers: [],
        };
        drivers.push(driver);
      } else {
        const passenger: Passenger = {
          id: createId('pax'),
          ...base,
        };
        const key = normalizeLocation(name);
        if (nameIndex.has(key)) {
          warnings.push({ message: `Duplicate passenger name "${name}"` });
        }
        nameIndex.set(key, passenger);
        passengers.push(passenger);
      }
    }

    for (const driver of drivers) {
      for (const existingName of driver.existingPassengers) {
        const key = normalizeLocation(existingName);
        let passenger = nameIndex.get(key);
        if (!passenger) {
          passenger = {
            id: createId('pax'),
            name: existingName,
            departureLocation: driver.departureLocation,
            returnLocation: driver.returnLocation,
          };
          passengers.push(passenger);
          nameIndex.set(key, passenger);
          warnings.push({
            message: `Created passenger "${existingName}" referenced by ${driver.name}`,
          });
        }
        if (passenger.assignedDriverId && passenger.assignedDriverId !== driver.id) {
          warnings.push({
            message: `"${passenger.name}" already assigned; kept first assignment`,
          });
          continue;
        }
        passenger.assignedDriverId = driver.id;
        if (!driver.assignedPassengers.includes(passenger.id)) {
          driver.assignedPassengers.push(passenger.id);
        }
      }
    }

    return { drivers, passengers, warnings };
  }

  commitImport(preview: ImportPreview, mapping: CsvColumnMapping): void {
    const next: AppState = {
      ...createEmptyState(),
      drivers: preview.drivers,
      passengers: preview.passengers,
      settings: {
        ...this.store.settings(),
        csvColumnMapping: mapping,
      },
    };
    this.history.replaceStateCommand('Import CSV', next, true);
  }

  exportPassengersCsv(): void {
    const state = this.store.snapshot();
    const driverById = new Map(state.drivers.map((d) => [d.id, d]));
    const rows = state.passengers.map((p) => ({
      Passenger: p.name,
      Driver: p.assignedDriverId ? (driverById.get(p.assignedDriverId)?.name ?? '') : '',
      Departure: p.departureLocation,
      Return: p.returnLocation,
      Phone: p.phone ?? '',
      Email: p.email ?? '',
      Notes: p.notes ?? '',
    }));
    this.download('passengers.csv', Papa.unparse(rows));
  }

  exportDriversCsv(): void {
    const state = this.store.snapshot();
    const passengerById = new Map(state.passengers.map((p) => [p.id, p]));
    const rows = state.drivers.map((d) => {
      const names = d.assignedPassengers
        .map((id) => passengerById.get(id)?.name)
        .filter(Boolean)
        .join('; ');
      return {
        Driver: d.name,
        Car: `${d.carModel}${d.carColor ? ` (${d.carColor})` : ''}`,
        Departure: d.departureLocation,
        Return: d.returnLocation,
        Seats: d.availableSeats,
        Passengers: names,
        'Remaining Seats': d.availableSeats - d.assignedPassengers.length,
      };
    });
    this.download('drivers.csv', Papa.unparse(rows));
  }

  private cell(row: Record<string, string>, header?: string): string {
    if (!header) {
      return '';
    }
    return row[header]?.trim() ?? '';
  }

  private isTruthy(value: string): boolean {
    const v = value.trim().toLocaleLowerCase();
    return ['yes', 'y', 'true', '1', 'driver', 'da'].includes(v);
  }

  private download(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
