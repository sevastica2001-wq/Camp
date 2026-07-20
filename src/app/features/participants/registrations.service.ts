import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  AttendanceStatus,
  Registration,
  TransportRole,
} from '../../core/supabase/database.types';

export interface UpsertRegistrationInput {
  display_name: string;
  transport_role: TransportRole;
  departure_location?: string;
  return_location?: string;
  available_seats?: number;
  car_model?: string;
  car_color?: string;
  license_plate?: string;
  phone?: string;
  email?: string;
  notes?: string;
  attendance_status?: AttendanceStatus;
  user_id?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly campContext = inject(CampContextService);

  async listForCamp(campId?: string): Promise<Registration[]> {
    const id = campId ?? this.campContext.requireCampId();
    const { data, error } = await this.supabase.client
      .from('registrations')
      .select('*')
      .eq('camp_id', id)
      .order('display_name');
    if (error) {
      throw new Error(error.message);
    }
    return (data as Registration[]) ?? [];
  }

  async getMine(campId?: string): Promise<Registration | null> {
    const id = campId ?? this.campContext.requireCampId();
    const userId = this.auth.user()?.id;
    if (!userId) {
      return null;
    }
    const { data } = await this.supabase.client
      .from('registrations')
      .select('*')
      .eq('camp_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    return (data as Registration) ?? null;
  }

  async upsertMine(input: UpsertRegistrationInput, campId?: string): Promise<Registration> {
    const id = campId ?? this.campContext.requireCampId();
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Not signed in');
    }

    const existing = await this.getMine(id);
    const row = {
      camp_id: id,
      user_id: userId,
      display_name: input.display_name,
      transport_role: input.transport_role,
      departure_location: input.departure_location ?? '',
      return_location: input.return_location ?? '',
      available_seats: input.available_seats ?? 0,
      car_model: input.car_model ?? '',
      car_color: input.car_color ?? '',
      license_plate: input.license_plate ?? '',
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
      attendance_status: input.attendance_status ?? 'confirmed',
    };

    if (existing) {
      const { data, error } = await this.supabase.client
        .from('registrations')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Update failed');
      }
      return data as Registration;
    }

    const { data, error } = await this.supabase.client
      .from('registrations')
      .insert(row)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Create failed');
    }
    return data as Registration;
  }

  async createManual(input: UpsertRegistrationInput, campId?: string): Promise<Registration> {
    const id = campId ?? this.campContext.requireCampId();
    const { data, error } = await this.supabase.client
      .from('registrations')
      .insert({
        camp_id: id,
        user_id: input.user_id ?? null,
        display_name: input.display_name,
        transport_role: input.transport_role,
        departure_location: input.departure_location ?? '',
        return_location: input.return_location ?? '',
        available_seats: input.available_seats ?? 0,
        car_model: input.car_model ?? '',
        car_color: input.car_color ?? '',
        license_plate: input.license_plate ?? '',
        phone: input.phone ?? null,
        email: input.email ?? null,
        notes: input.notes ?? null,
        attendance_status: input.attendance_status ?? 'confirmed',
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Create failed');
    }
    return data as Registration;
  }

  async update(registrationId: string, patch: Partial<Registration>): Promise<Registration> {
    const { data, error } = await this.supabase.client
      .from('registrations')
      .update(patch)
      .eq('id', registrationId)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Update failed');
    }
    return data as Registration;
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

  async replaceCampTransport(
    campId: string,
    rows: Array<Omit<Registration, 'id' | 'created_at'> & { id?: string }>,
  ): Promise<void> {
    // Clear existing transport registrations for camp (organizer import)
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
    const { error } = await this.supabase.client.from('registrations').insert(rows);
    if (error) {
      throw new Error(error.message);
    }
  }

  async stats(campId?: string): Promise<{
    drivers: number;
    passengers: number;
    unassigned: number;
    totalSeats: number;
    remainingSeats: number;
  }> {
    const list = await this.listForCamp(campId);
    const drivers = list.filter((r) => r.transport_role === 'DRIVER');
    const passengers = list.filter((r) => r.transport_role === 'PASSENGER');
    const unassigned = passengers.filter((p) => !p.assigned_driver_registration_id).length;
    const totalSeats = drivers.reduce((s, d) => s + Math.max(0, d.available_seats), 0);
    const occupied = passengers.filter((p) => !!p.assigned_driver_registration_id).length;
    return {
      drivers: drivers.length,
      passengers: passengers.length,
      unassigned,
      totalSeats,
      remainingSeats: totalSeats - occupied,
    };
  }
}
