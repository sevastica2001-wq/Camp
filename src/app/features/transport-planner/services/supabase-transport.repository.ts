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
    const { data: existingRows } = await this.supabase.client
      .from('registrations')
      .select('id, gender, partner_registration_id, user_id')
      .eq('camp_id', campId);
    const preserve = new Map(
      ((existingRows as Array<{
        id: string;
        gender: Registration['gender'];
        partner_registration_id: string | null;
        user_id: string | null;
      }>) ?? []).map((r) => [
        r.id,
        {
          gender: r.gender ?? 'unspecified',
          partner_registration_id: r.partner_registration_id,
          user_id: r.user_id,
        },
      ]),
    );

    // Lodging assignments cascade-delete with registrations — snapshot & restore.
    // Tolerate missing lodging tables before migration 0005 is applied.
    let lodgingSnapshot: Array<{
      camp_id: string;
      room_id: string;
      registration_id: string;
    }> = [];
    const { data: lodgingRows, error: lodgingFetchErr } = await this.supabase.client
      .from('lodging_assignments')
      .select('camp_id, room_id, registration_id')
      .eq('camp_id', campId);
    if (!lodgingFetchErr && lodgingRows) {
      lodgingSnapshot = lodgingRows as typeof lodgingSnapshot;
    }

    const rows = this.stateToRegistrationRows(campId, state).map((row) => {
      const kept = preserve.get(row.id);
      return {
        ...row,
        gender: kept?.gender ?? 'unspecified',
        partner_registration_id: kept?.partner_registration_id ?? null,
        user_id: kept?.user_id ?? row.user_id ?? null,
      };
    });
    const survivingIds = new Set(rows.map((r) => r.id));

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
      partner_registration_id: null as string | null,
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

    // Restore partner links
    for (const row of rows) {
      if (row.partner_registration_id && survivingIds.has(row.partner_registration_id)) {
        const { error } = await this.supabase.client
          .from('registrations')
          .update({ partner_registration_id: row.partner_registration_id })
          .eq('id', row.id!);
        if (error) {
          throw new Error(error.message);
        }
      }
    }

    // Restore lodging assignments for people who still exist after sync
    const lodgingRestore = lodgingSnapshot.filter((a) =>
      survivingIds.has(a.registration_id),
    );
    if (lodgingRestore.length) {
      const { error: lodgingErr } = await this.supabase.client
        .from('lodging_assignments')
        .insert(lodgingRestore);
      if (lodgingErr) {
        throw new Error(lodgingErr.message);
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

  async assignPassenger(passengerId: string, driverId: string | null): Promise<void> {
    const { error } = await this.supabase.client
      .from('registrations')
      .update({ assigned_driver_registration_id: driverId })
      .eq('id', passengerId);
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
