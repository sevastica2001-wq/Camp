import { Injectable, inject } from '@angular/core';
import {
  APP_STATE_VERSION,
  AppState,
  DEFAULT_SETTINGS,
  Driver,
  Passenger,
  createEmptyState,
} from '../models/transport.models';
import { Registration } from '../../../core/supabase/database.types';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ITransportRepository } from './transport-repository.token';

@Injectable()
export class SupabaseTransportRepository implements ITransportRepository {
  private readonly supabase = inject(SupabaseService);

  async load(campId: string): Promise<AppState> {
    const { data, error } = await this.supabase.client
      .from('registrations')
      .select('*')
      .eq('camp_id', campId);

    if (error) {
      throw new Error(error.message);
    }

    return this.registrationsToState((data as Registration[]) ?? []);
  }

  async save(campId: string, state: AppState): Promise<void> {
    const rows = this.stateToRegistrationRows(campId, state);

    // Delete existing then insert (simple full replace for planner sync)
    const { error: delErr } = await this.supabase.client
      .from('registrations')
      .delete()
      .eq('camp_id', campId);
    if (delErr) {
      throw new Error(delErr.message);
    }

    if (!rows.length) {
      return;
    }

    // Insert without assignment first, then update assignments (FK self-ref)
    const withoutAssign = rows.map((r) => ({
      ...r,
      assigned_driver_registration_id: null as string | null,
    }));

    const { error: insErr } = await this.supabase.client
      .from('registrations')
      .insert(withoutAssign);
    if (insErr) {
      throw new Error(insErr.message);
    }

    // Apply passenger → driver assignments
    for (const row of rows) {
      if (row.assigned_driver_registration_id && row.transport_role === 'PASSENGER') {
        const { error } = await this.supabase.client
          .from('registrations')
          .update({
            assigned_driver_registration_id: row.assigned_driver_registration_id,
          })
          .eq('id', row.id!);
        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  async clear(campId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('registrations')
      .delete()
      .eq('camp_id', campId);
    if (error) {
      throw new Error(error.message);
    }
  }

  private registrationsToState(rows: Registration[]): AppState {
    const drivers: Driver[] = [];
    const passengers: Passenger[] = [];

    for (const r of rows) {
      if (r.transport_role === 'DRIVER') {
        drivers.push({
          id: r.id,
          name: r.display_name,
          phone: r.phone ?? undefined,
          email: r.email ?? undefined,
          departureLocation: r.departure_location,
          returnLocation: r.return_location,
          notes: r.notes ?? undefined,
          carModel: r.car_model,
          carColor: r.car_color,
          availableSeats: r.available_seats,
          existingPassengers: [],
          assignedPassengers: [],
        });
      } else {
        passengers.push({
          id: r.id,
          name: r.display_name,
          phone: r.phone ?? undefined,
          email: r.email ?? undefined,
          departureLocation: r.departure_location,
          returnLocation: r.return_location,
          notes: r.notes ?? undefined,
          assignedDriverId: r.assigned_driver_registration_id ?? undefined,
        });
      }
    }

    for (const driver of drivers) {
      driver.assignedPassengers = passengers
        .filter((p) => p.assignedDriverId === driver.id)
        .map((p) => p.id);
    }

    return {
      version: APP_STATE_VERSION,
      drivers,
      passengers,
      settings: {
        ...DEFAULT_SETTINGS,
        csvColumnMapping: {},
        collapsedDriverIds: [],
      },
    };
  }

  private stateToRegistrationRows(
    campId: string,
    state: AppState,
  ): Array<Partial<Registration> & { id: string; camp_id: string; display_name: string; transport_role: 'DRIVER' | 'PASSENGER' }> {
    const rows: Array<
      Partial<Registration> & {
        id: string;
        camp_id: string;
        display_name: string;
        transport_role: 'DRIVER' | 'PASSENGER';
      }
    > = [];

    for (const d of state.drivers) {
      rows.push({
        id: d.id,
        camp_id: campId,
        user_id: null,
        display_name: d.name,
        attendance_status: 'confirmed',
        transport_role: 'DRIVER',
        departure_location: d.departureLocation,
        return_location: d.returnLocation,
        available_seats: d.availableSeats,
        car_model: d.carModel,
        car_color: d.carColor,
        license_plate: '',
        phone: d.phone ?? null,
        email: d.email ?? null,
        notes: d.notes ?? null,
        assigned_driver_registration_id: null,
      });
    }

    for (const p of state.passengers) {
      rows.push({
        id: p.id,
        camp_id: campId,
        user_id: null,
        display_name: p.name,
        attendance_status: 'confirmed',
        transport_role: 'PASSENGER',
        departure_location: p.departureLocation,
        return_location: p.returnLocation,
        available_seats: 0,
        car_model: '',
        car_color: '',
        license_plate: '',
        phone: p.phone ?? null,
        email: p.email ?? null,
        notes: p.notes ?? null,
        assigned_driver_registration_id: p.assignedDriverId ?? null,
      });
    }

    return rows;
  }
}
