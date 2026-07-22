import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CampContextService } from '../../core/camp-context/camp-context.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  AttendanceStatus,
  PersonGender,
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
  gender?: PersonGender;
  partner_registration_id?: string | null;
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
      gender: input.gender ?? 'unspecified',
      partner_registration_id: input.partner_registration_id ?? null,
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
        gender: input.gender ?? 'unspecified',
        partner_registration_id: input.partner_registration_id ?? null,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Create failed');
    }
    return data as Registration;
  }

  async linkPartners(aId: string, bId: string | null): Promise<void> {
    const a = await this.getById(aId);
    if (!a) {
      throw new Error('Participant not found');
    }

    if (!bId) {
      const partnerId = a.partner_registration_id;
      const { error: clearA } = await this.supabase.client
        .from('registrations')
        .update({ partner_registration_id: null })
        .eq('id', aId);
      if (clearA) {
        throw new Error(clearA.message);
      }
      if (partnerId) {
        const { error: clearB } = await this.supabase.client
          .from('registrations')
          .update({ partner_registration_id: null })
          .eq('id', partnerId);
        if (clearB) {
          throw new Error(clearB.message);
        }
      }
      return;
    }

    const b = await this.getById(bId);
    if (!b) {
      throw new Error('Partner not found');
    }
    if (b.camp_id !== a.camp_id) {
      throw new Error('Partner must belong to the same camp');
    }

    // Clear anyone previously linked to either person
    for (const id of [aId, bId, a.partner_registration_id, b.partner_registration_id]) {
      if (!id || id === aId || id === bId) {
        continue;
      }
      await this.supabase.client
        .from('registrations')
        .update({ partner_registration_id: null })
        .eq('id', id);
    }

    const { error: errA } = await this.supabase.client
      .from('registrations')
      .update({ partner_registration_id: bId })
      .eq('id', aId);
    if (errA) {
      throw new Error(errA.message);
    }
    const { error: errB } = await this.supabase.client
      .from('registrations')
      .update({ partner_registration_id: aId })
      .eq('id', bId);
    if (errB) {
      throw new Error(errB.message);
    }
  }

  async getById(registrationId: string): Promise<Registration | null> {
    const { data } = await this.supabase.client
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .maybeSingle();
    return (data as Registration) ?? null;
  }

  async listRoommateIds(registrationId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('registration_roommate_preferences')
      .select('roommate_registration_id')
      .eq('registration_id', registrationId);
    if (error) {
      // Table may not exist yet before migration 0006
      if (error.message.toLowerCase().includes('does not exist')) {
        return [];
      }
      throw new Error(error.message);
    }
    return ((data as Array<{ roommate_registration_id: string }>) ?? []).map(
      (r) => r.roommate_registration_id,
    );
  }

  async listRoommateIdsForCamp(campId: string): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    const { data, error } = await this.supabase.client
      .from('registration_roommate_preferences')
      .select('registration_id, roommate_registration_id')
      .eq('camp_id', campId);
    if (error) {
      if (error.message.toLowerCase().includes('does not exist')) {
        return map;
      }
      throw new Error(error.message);
    }
    for (const row of (data as Array<{
      registration_id: string;
      roommate_registration_id: string;
    }>) ?? []) {
      const list = map.get(row.registration_id) ?? [];
      list.push(row.roommate_registration_id);
      map.set(row.registration_id, list);
    }
    return map;
  }

  async setRoommates(
    registrationId: string,
    roommateIds: string[],
    campId?: string,
  ): Promise<void> {
    const person = await this.getById(registrationId);
    if (!person) {
      throw new Error('Participant not found');
    }
    // Always derive camp from the registration — never trust a caller override alone
    const id = person.camp_id;
    if (campId && campId !== id) {
      throw new Error('Roommate preferences must stay within the participant camp');
    }
    const unique = [...new Set(roommateIds.filter((rid) => rid && rid !== registrationId))];

    for (const roommateId of unique) {
      const roommate = await this.getById(roommateId);
      if (!roommate || roommate.camp_id !== id) {
        throw new Error('Roommate must belong to the same camp');
      }
    }

    const previous = await this.listRoommateIds(registrationId);

    // Replace this person's preferred list
    const { error: delErr } = await this.supabase.client
      .from('registration_roommate_preferences')
      .delete()
      .eq('registration_id', registrationId);
    if (delErr) {
      throw new Error(delErr.message);
    }
    if (unique.length) {
      const { error } = await this.supabase.client
        .from('registration_roommate_preferences')
        .insert(
          unique.map((roommate_registration_id) => ({
            camp_id: id,
            registration_id: registrationId,
            roommate_registration_id,
          })),
        );
      if (error) {
        throw new Error(error.message);
      }
    }

    // Keep links mutual: add reverse edges for new roommates, remove reverse for dropped ones
    const prevSet = new Set(previous);
    const nextSet = new Set(unique);
    const added = unique.filter((rid) => !prevSet.has(rid));
    const removed = previous.filter((rid) => !nextSet.has(rid));

    for (const roommateId of added) {
      const { data: existing } = await this.supabase.client
        .from('registration_roommate_preferences')
        .select('id')
        .eq('registration_id', roommateId)
        .eq('roommate_registration_id', registrationId)
        .maybeSingle();
      if (!existing) {
        const { error } = await this.supabase.client
          .from('registration_roommate_preferences')
          .insert({
            camp_id: id,
            registration_id: roommateId,
            roommate_registration_id: registrationId,
          });
        if (error) {
          throw new Error(error.message);
        }
      }
    }

    for (const roommateId of removed) {
      const { error } = await this.supabase.client
        .from('registration_roommate_preferences')
        .delete()
        .eq('registration_id', roommateId)
        .eq('roommate_registration_id', registrationId);
      if (error) {
        throw new Error(error.message);
      }
    }
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
