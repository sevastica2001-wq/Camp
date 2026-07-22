import { Injectable, inject } from '@angular/core';
import {
  LodgingAssignment,
  LodgingBathType,
  LodgingBuilding,
  LodgingRoom,
  Registration,
} from '../../../core/supabase/database.types';
import { CampContextService } from '../../../core/camp-context/camp-context.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import cristinaSeed from '../data/cristina-lodging-seed.json';
import {
  CristinaLodgingSeed,
  LodgingBuildingView,
  LodgingPerson,
  LodgingRoomView,
} from '../models/lodging.models';

@Injectable({ providedIn: 'root' })
export class LodgingService {
  private readonly supabase = inject(SupabaseService);
  private readonly campContext = inject(CampContextService);
  private readonly seed = cristinaSeed as CristinaLodgingSeed;

  async stats(campId?: string): Promise<{
    buildings: number;
    rooms: number;
    capacity: number;
    occupied: number;
    unassigned: number;
  }> {
    const id = campId ?? this.campContext.requireCampId();
    try {
      const state = await this.loadState(id);
      const capacity = state.rooms.reduce((s, r) => s + r.capacity, 0);
      const occupied = state.rooms.reduce((s, r) => s + r.occupantIds.length, 0);
      return {
        buildings: state.buildings.filter((b) => b.status === 'active').length,
        rooms: state.rooms.length,
        capacity,
        occupied,
        unassigned: state.people.filter((p) => !p.roomId).length,
      };
    } catch {
      return { buildings: 0, rooms: 0, capacity: 0, occupied: 0, unassigned: 0 };
    }
  }

  async loadState(campId?: string): Promise<{
    people: LodgingPerson[];
    buildings: LodgingBuildingView[];
    rooms: LodgingRoomView[];
  }> {
    const id = campId ?? this.campContext.requireCampId();
    await this.ensureLayout(id);

    const [regs, buildings, rooms, assignments, roommateMap] = await Promise.all([
      this.fetchRegistrations(id),
      this.fetchBuildings(id),
      this.fetchRooms(id),
      this.fetchAssignments(id),
      this.fetchRoommatePrefs(id),
    ]);

    const roomOccupants = new Map<string, string[]>();
    const personRoom = new Map<string, string>();
    for (const a of assignments) {
      personRoom.set(a.registration_id, a.room_id);
      const list = roomOccupants.get(a.room_id) ?? [];
      list.push(a.registration_id);
      roomOccupants.set(a.room_id, list);
    }

    const people: LodgingPerson[] = regs.map((r) => ({
      id: r.id,
      name: r.display_name,
      gender: r.gender ?? 'unspecified',
      partnerId: r.partner_registration_id,
      roommateIds: roommateMap.get(r.id) ?? [],
      roomId: personRoom.get(r.id) ?? null,
      notes: r.notes ?? undefined,
    }));

    const buildingViews: LodgingBuildingView[] = buildings
      .map((b) => ({
        id: b.id,
        siteName: b.site_name,
        name: b.name,
        seedKey: b.seed_key,
        sortOrder: b.sort_order,
        status: b.status,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const roomViews: LodgingRoomView[] = rooms
      .map((r) => ({
        id: r.id,
        buildingId: r.building_id,
        name: r.name,
        seedKey: r.seed_key,
        floor: r.floor,
        capacity: r.capacity,
        amenities: r.amenities ?? [],
        bathType: r.bath_type,
        genderPolicy: r.gender_policy,
        sortOrder: r.sort_order,
        notes: r.notes,
        occupantIds: roomOccupants.get(r.id) ?? [],
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return { people, buildings: buildingViews, rooms: roomViews };
  }

  async ensureLayout(campId: string): Promise<void> {
    const { count, error } = await this.supabase.client
      .from('lodging_buildings')
      .select('id', { count: 'exact', head: true })
      .eq('camp_id', campId);
    if (error) {
      throw new Error(error.message);
    }
    if ((count ?? 0) === 0) {
      await this.seedCristinaLayout(campId);
      return;
    }
    // Keep bed counts / new seed rooms in sync for already-seeded camps
    // (roommate preference limits must never affect room capacity).
    await this.syncSeedLayout(campId);
  }

  /**
   * Updates building status and room capacity/notes from seed by seed_key,
   * and inserts any seed rooms that are missing (e.g. Cabana 9 after construction).
   */
  private async syncSeedLayout(campId: string): Promise<void> {
    const [{ data: buildings, error: bErr }, { data: rooms, error: rErr }] = await Promise.all([
      this.supabase.client
        .from('lodging_buildings')
        .select('id, seed_key, status')
        .eq('camp_id', campId),
      this.supabase.client
        .from('lodging_rooms')
        .select('id, building_id, seed_key, capacity, notes')
        .eq('camp_id', campId),
    ]);
    if (bErr) {
      throw new Error(bErr.message);
    }
    if (rErr) {
      throw new Error(rErr.message);
    }

    const buildingBySeed = new Map(
      ((buildings as Array<{ id: string; seed_key: string; status: string }>) ?? []).map((b) => [
        b.seed_key,
        b,
      ]),
    );
    const existingRoomKeys = new Set(
      ((rooms as Array<{ seed_key: string }>) ?? []).map((r) => r.seed_key),
    );

    for (const building of this.seed.buildings) {
      const row = buildingBySeed.get(building.seedKey);
      if (!row) {
        continue;
      }
      if (row.status !== building.status) {
        const { error: updB } = await this.supabase.client
          .from('lodging_buildings')
          .update({ status: building.status })
          .eq('id', row.id);
        if (updB) {
          throw new Error(updB.message);
        }
      }

      const missing = building.rooms.filter((room) => !existingRoomKeys.has(room.seedKey));
      if (missing.length) {
        const roomRows = missing.map((room) => ({
          camp_id: campId,
          building_id: row.id,
          name: room.name,
          seed_key: room.seedKey,
          floor: room.floor,
          capacity: room.capacity,
          amenities: room.amenities,
          bath_type: room.bathType as LodgingBathType,
          gender_policy: 'unset' as const,
          sort_order: room.sortOrder,
          notes: room.notes,
        }));
        const { error: insErr } = await this.supabase.client.from('lodging_rooms').insert(roomRows);
        if (insErr) {
          throw new Error(insErr.message);
        }
      }
    }

    const seedByKey = new Map<string, { capacity: number; notes: string }>();
    for (const building of this.seed.buildings) {
      for (const room of building.rooms) {
        seedByKey.set(room.seedKey, { capacity: room.capacity, notes: room.notes });
      }
    }

    for (const row of (rooms as Array<{
      id: string;
      seed_key: string;
      capacity: number;
      notes: string;
    }>) ?? []) {
      const seed = seedByKey.get(row.seed_key);
      if (!seed) {
        continue;
      }
      if (row.capacity === seed.capacity && row.notes === seed.notes) {
        continue;
      }
      const { error: updErr } = await this.supabase.client
        .from('lodging_rooms')
        .update({ capacity: seed.capacity, notes: seed.notes })
        .eq('id', row.id);
      if (updErr) {
        throw new Error(updErr.message);
      }
    }
  }

  async seedCristinaLayout(campId: string): Promise<void> {
    for (const building of this.seed.buildings) {
      const { data: bRow, error: bErr } = await this.supabase.client
        .from('lodging_buildings')
        .insert({
          camp_id: campId,
          site_name: building.siteName,
          name: building.name,
          seed_key: building.seedKey,
          sort_order: building.sortOrder,
          status: building.status,
        })
        .select('*')
        .single();
      if (bErr || !bRow) {
        throw new Error(bErr?.message ?? 'Failed to seed building');
      }
      const buildingId = (bRow as LodgingBuilding).id;
      if (!building.rooms.length) {
        continue;
      }
      const roomRows = building.rooms.map((room) => ({
        camp_id: campId,
        building_id: buildingId,
        name: room.name,
        seed_key: room.seedKey,
        floor: room.floor,
        capacity: room.capacity,
        amenities: room.amenities,
        bath_type: room.bathType as LodgingBathType,
        gender_policy: 'unset' as const,
        sort_order: room.sortOrder,
        notes: room.notes,
      }));
      const { error: rErr } = await this.supabase.client.from('lodging_rooms').insert(roomRows);
      if (rErr) {
        throw new Error(rErr.message);
      }
    }
  }

  async assignPerson(
    campId: string,
    registrationId: string,
    roomId: string | null,
  ): Promise<void> {
    if (roomId) {
      const [{ data: room }, { data: person }] = await Promise.all([
        this.supabase.client
          .from('lodging_rooms')
          .select('id, camp_id')
          .eq('id', roomId)
          .maybeSingle(),
        this.supabase.client
          .from('registrations')
          .select('id, camp_id')
          .eq('id', registrationId)
          .maybeSingle(),
      ]);
      if (!room || (room as { camp_id: string }).camp_id !== campId) {
        throw new Error('Room does not belong to this camp');
      }
      if (!person || (person as { camp_id: string }).camp_id !== campId) {
        throw new Error('Participant does not belong to this camp');
      }
    }

    const { error: delErr } = await this.supabase.client
      .from('lodging_assignments')
      .delete()
      .eq('registration_id', registrationId);
    if (delErr) {
      throw new Error(delErr.message);
    }
    if (!roomId) {
      return;
    }
    const { error } = await this.supabase.client.from('lodging_assignments').insert({
      camp_id: campId,
      room_id: roomId,
      registration_id: registrationId,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async updateRoomGenderPolicy(
    roomId: string,
    genderPolicy: LodgingRoom['gender_policy'],
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('lodging_rooms')
      .update({ gender_policy: genderPolicy })
      .eq('id', roomId);
    if (error) {
      throw new Error(error.message);
    }
  }

  private async fetchRegistrations(campId: string): Promise<Registration[]> {
    const { data, error } = await this.supabase.client
      .from('registrations')
      .select('*')
      .eq('camp_id', campId)
      .order('display_name');
    if (error) {
      throw new Error(error.message);
    }
    return (data as Registration[]) ?? [];
  }

  private async fetchBuildings(campId: string): Promise<LodgingBuilding[]> {
    const { data, error } = await this.supabase.client
      .from('lodging_buildings')
      .select('*')
      .eq('camp_id', campId)
      .order('sort_order');
    if (error) {
      throw new Error(error.message);
    }
    return (data as LodgingBuilding[]) ?? [];
  }

  private async fetchRooms(campId: string): Promise<LodgingRoom[]> {
    const { data, error } = await this.supabase.client
      .from('lodging_rooms')
      .select('*')
      .eq('camp_id', campId)
      .order('sort_order');
    if (error) {
      throw new Error(error.message);
    }
    return (data as LodgingRoom[]) ?? [];
  }

  private async fetchAssignments(campId: string): Promise<LodgingAssignment[]> {
    const { data, error } = await this.supabase.client
      .from('lodging_assignments')
      .select('*')
      .eq('camp_id', campId);
    if (error) {
      throw new Error(error.message);
    }
    return (data as LodgingAssignment[]) ?? [];
  }

  private async fetchRoommatePrefs(campId: string): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    const { data, error } = await this.supabase.client
      .from('registration_roommate_preferences')
      .select('registration_id, roommate_registration_id')
      .eq('camp_id', campId);
    if (error) {
      // Missing table before migration — empty prefs. Other errors should surface.
      const msg = error.message.toLowerCase();
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
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
}
