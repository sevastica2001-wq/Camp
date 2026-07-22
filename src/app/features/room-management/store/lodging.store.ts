import { Injectable, computed, inject, signal } from '@angular/core';
import { CampContextService } from '../../../core/camp-context/camp-context.service';
import { LodgingGenderPolicy } from '../../../core/supabase/database.types';
import {
  LodgingBuildingView,
  LodgingDropHighlight,
  LodgingPerson,
  LodgingRoomView,
} from '../models/lodging.models';
import { LodgingService } from '../services/lodging.service';
import {
  canAssignToRoom,
  effectiveRoomGender,
  inferPolicyAfterAssign,
  roommateMoveGroup,
} from '../utils/lodging.rules';

@Injectable({ providedIn: 'root' })
export class LodgingStore {
  private readonly lodging = inject(LodgingService);
  private readonly campContext = inject(CampContextService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly people = signal<LodgingPerson[]>([]);
  readonly buildings = signal<LodgingBuildingView[]>([]);
  readonly rooms = signal<LodgingRoomView[]>([]);
  readonly search = signal('');
  readonly genderFilter = signal<'ALL' | 'male' | 'female' | 'unspecified'>('ALL');

  readonly peopleById = computed(() => {
    const map = new Map<string, LodgingPerson>();
    for (const p of this.people()) {
      map.set(p.id, p);
    }
    return map;
  });

  readonly unassigned = computed(() => this.people().filter((p) => !p.roomId));

  readonly filteredUnassigned = computed(() => {
    const q = this.search().trim().toLowerCase();
    const gender = this.genderFilter();
    return this.unassigned().filter((p) => {
      if (gender !== 'ALL' && p.gender !== gender) {
        return false;
      }
      if (!q) {
        return true;
      }
      return p.name.toLowerCase().includes(q);
    });
  });

  readonly activeBuildings = computed(() =>
    this.buildings().filter((b) => b.status === 'active'),
  );

  readonly unavailableBuildings = computed(() =>
    this.buildings().filter((b) => b.status !== 'active'),
  );

  readonly roomsByBuilding = computed(() => {
    const map = new Map<string, LodgingRoomView[]>();
    for (const room of this.rooms()) {
      const list = map.get(room.buildingId) ?? [];
      list.push(room);
      map.set(room.buildingId, list);
    }
    return map;
  });

  readonly summary = computed(() => {
    const rooms = this.rooms();
    const capacity = rooms.reduce((s, r) => s + r.capacity, 0);
    const occupied = rooms.reduce((s, r) => s + r.occupantIds.length, 0);
    return {
      buildings: this.activeBuildings().length,
      rooms: rooms.length,
      capacity,
      occupied,
      unassigned: this.unassigned().length,
    };
  });

  async ensureLoaded(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const campId = this.campContext.requireCampId();
      const state = await this.lodging.loadState(campId);
      this.people.set(state.people);
      this.buildings.set(state.buildings);
      this.rooms.set(state.rooms);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load lodging');
    } finally {
      this.loading.set(false);
    }
  }

  getRoom(roomId: string): LodgingRoomView | undefined {
    return this.rooms().find((r) => r.id === roomId);
  }

  getPerson(personId: string): LodgingPerson | undefined {
    return this.peopleById().get(personId);
  }

  getRoomOccupants(room: LodgingRoomView): LodgingPerson[] {
    return room.occupantIds
      .map((id) => this.peopleById().get(id))
      .filter((p): p is LodgingPerson => !!p);
  }

  evaluateDrop(personId: string, roomId: string | null): LodgingDropHighlight {
    if (!roomId) {
      return 'ok';
    }
    const person = this.getPerson(personId);
    const room = this.getRoom(roomId);
    if (!person || !room) {
      return 'blocked';
    }
    const building = this.buildings().find((b) => b.id === room.buildingId);
    if (building && building.status !== 'active') {
      return 'blocked';
    }
    const group = roommateMoveGroup(person, this.people());
    const extraIds = group.filter((p) => p.id !== personId).map((p) => p.id);
    const check = canAssignToRoom(person, room, this.people(), extraIds);
    if (check.blocked) {
      return 'blocked';
    }
    if (check.overCapacity) {
      return 'danger';
    }
    return 'ok';
  }

  canEnter(personId: string, roomId: string | null): boolean {
    // Allow enter when over capacity ('danger') — drop is permitted with a warning.
    return this.evaluateDrop(personId, roomId) !== 'blocked';
  }

  async movePerson(personId: string, targetRoomId: string | null): Promise<void> {
    const campId = this.campContext.requireCampId();
    const person = this.getPerson(personId);
    if (!person) {
      return;
    }

    // Into a room: bring preferred roommates (both directions). Unassign: only this person.
    const movers =
      targetRoomId != null
        ? roommateMoveGroup(person, this.people())
        : [person];
    const moverIds = movers.map((p) => p.id);

    if (targetRoomId) {
      const room = this.getRoom(targetRoomId);
      if (!room) {
        return;
      }
      const building = this.buildings().find((b) => b.id === room.buildingId);
      if (building && building.status !== 'active') {
        this.error.set('This cabin is not available');
        return;
      }
      const extraIds = moverIds.filter((id) => id !== personId);
      const check = canAssignToRoom(person, room, this.people(), extraIds);
      // Over capacity is allowed; only hard blocks (e.g. gender) stop the move.
      if (check.blocked) {
        this.error.set(check.reason ?? 'Cannot assign this group to the room');
        return;
      }
    }

    const previousRooms = new Map(movers.map((p) => [p.id, p.roomId] as const));
    const roomsToMaybeClear = new Set(
      [...previousRooms.values()].filter((id): id is string => !!id && id !== targetRoomId),
    );

    this.people.update((list) =>
      list.map((p) => (moverIds.includes(p.id) ? { ...p, roomId: targetRoomId } : p)),
    );
    this.rooms.update((list) =>
      list.map((room) => {
        let occupantIds = room.occupantIds.filter((id) => !moverIds.includes(id));
        if (room.id === targetRoomId) {
          occupantIds = [...occupantIds, ...moverIds.filter((id) => !occupantIds.includes(id))];
        }
        return { ...room, occupantIds };
      }),
    );

    try {
      for (const id of moverIds) {
        await this.lodging.assignPerson(campId, id, targetRoomId);
      }
      // Empty rooms go back to Open so people can be re-assigned freely
      for (const roomId of roomsToMaybeClear) {
        const room = this.getRoom(roomId);
        if (room && room.occupantIds.length === 0 && room.genderPolicy !== 'unset') {
          await this.lodging.updateRoomGenderPolicy(roomId, 'unset');
          this.rooms.update((list) =>
            list.map((r) => (r.id === roomId ? { ...r, genderPolicy: 'unset' } : r)),
          );
        }
      }
      if (targetRoomId) {
        const room = this.getRoom(targetRoomId);
        const updatedPerson = this.getPerson(personId);
        if (room && updatedPerson && room.genderPolicy === 'unset') {
          const nextPolicy = inferPolicyAfterAssign(updatedPerson, room, this.people());
          if (nextPolicy !== 'unset') {
            await this.lodging.updateRoomGenderPolicy(room.id, nextPolicy);
            this.rooms.update((list) =>
              list.map((r) =>
                r.id === room.id ? { ...r, genderPolicy: nextPolicy } : r,
              ),
            );
          }
        }
      }
      this.error.set(null);
    } catch (err) {
      this.people.update((list) =>
        list.map((p) =>
          previousRooms.has(p.id) ? { ...p, roomId: previousRooms.get(p.id)! } : p,
        ),
      );
      this.rooms.update((list) =>
        list.map((room) => {
          let occupantIds = room.occupantIds.filter((id) => !moverIds.includes(id));
          for (const [id, prev] of previousRooms) {
            if (prev === room.id) {
              occupantIds = [...occupantIds, id];
            }
          }
          return { ...room, occupantIds };
        }),
      );
      this.error.set(err instanceof Error ? err.message : 'Failed to assign room');
    }
  }

  roomPolicyLabel(room: LodgingRoomView): string {
    const occupants = this.getRoomOccupants(room);
    const policy = effectiveRoomGender(room, occupants);
    switch (policy) {
      case 'male':
        return 'Male';
      case 'female':
        return 'Female';
      case 'couple':
        return 'Couple';
      case 'mixed':
        return 'Mixed';
      default:
        return 'Open';
    }
  }

  async setRoomPolicy(roomId: string, policy: LodgingGenderPolicy): Promise<void> {
    await this.lodging.updateRoomGenderPolicy(roomId, policy);
    this.rooms.update((list) =>
      list.map((r) => (r.id === roomId ? { ...r, genderPolicy: policy } : r)),
    );
  }
}
