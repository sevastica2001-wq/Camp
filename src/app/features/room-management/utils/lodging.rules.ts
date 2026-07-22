import { LodgingGenderPolicy, PersonGender } from '../../../core/supabase/database.types';
import { LodgingPerson, LodgingRoomView } from '../models/lodging.models';

export interface LodgingAssignCheck {
  blocked: boolean;
  overCapacity: boolean;
  genderConflict: boolean;
  reason: string | null;
}

export function arePartners(a: LodgingPerson, b: LodgingPerson): boolean {
  return !!a.partnerId && a.partnerId === b.id && b.partnerId === a.id;
}

export function arePreferredRoommates(a: LodgingPerson, b: LodgingPerson): boolean {
  return (
    (a.roommateIds?.includes(b.id) ?? false) ||
    (b.roommateIds?.includes(a.id) ?? false)
  );
}

export function effectiveRoomGender(
  room: LodgingRoomView,
  occupants: LodgingPerson[],
): LodgingGenderPolicy {
  if (room.genderPolicy !== 'unset') {
    return room.genderPolicy;
  }
  if (!occupants.length) {
    return 'unset';
  }
  if (occupants.length === 2 && arePartners(occupants[0], occupants[1])) {
    return 'couple';
  }
  const genders = new Set(
    occupants.map((o) => o.gender).filter((g): g is 'male' | 'female' => g === 'male' || g === 'female'),
  );
  if (genders.size === 0) {
    return 'unset';
  }
  if (genders.size === 1) {
    return [...genders][0];
  }
  return 'mixed';
}

export function canAssignToRoom(
  person: LodgingPerson,
  room: LodgingRoomView,
  allPeople: LodgingPerson[],
  extraIncomingIds: string[] = [],
): LodgingAssignCheck {
  const incoming = new Set([person.id, ...extraIncomingIds]);
  const currentOccupants = room.occupantIds
    .map((id) => allPeople.find((p) => p.id === id))
    .filter((p): p is LodgingPerson => !!p);

  // People who stay in the room and are not part of this move group
  const staying = currentOccupants.filter((p) => !incoming.has(p.id));
  const groupMembers = [...incoming]
    .map((id) => allPeople.find((p) => p.id === id))
    .filter((p): p is LodgingPerson => !!p);

  // Final headcount after the whole group is assigned here
  const nextCount = staying.length + groupMembers.length;

  if (room.capacity <= 0) {
    return {
      blocked: true,
      overCapacity: true,
      genderConflict: false,
      reason: 'Room has no beds',
    };
  }

  const overCapacity = nextCount > room.capacity;

  // Only validate people who are not already in this room
  const entering = groupMembers.filter((p) => !room.occupantIds.includes(p.id));

  for (const candidate of entering) {
    // Preferred roommates / partners in the move group or already in the room
    // may share regardless of gender policy (same idea as couples).
    const linkedToGroup = groupMembers.some(
      (o) =>
        o.id !== candidate.id &&
        (arePartners(candidate, o) || arePreferredRoommates(candidate, o)),
    );
    const linkedToRoom = currentOccupants.some(
      (o) => arePartners(candidate, o) || arePreferredRoommates(candidate, o),
    );
    if (linkedToGroup || linkedToRoom) {
      continue;
    }

    // Policy from locked room setting + unrelated people already there
    const policy = effectiveRoomGender(room, staying);
    if (policy === 'unset' || policy === 'mixed' || policy === 'couple') {
      continue;
    }
    if (candidate.gender === 'unspecified') {
      return {
        blocked: true,
        overCapacity,
        genderConflict: true,
        reason: `${candidate.name} needs a gender before this room`,
      };
    }
    if (candidate.gender !== policy) {
      return {
        blocked: true,
        overCapacity,
        genderConflict: true,
        reason: `Room is ${policy}-only (${candidate.name})`,
      };
    }
  }

  return {
    blocked: false,
    overCapacity,
    genderConflict: false,
    reason: overCapacity ? 'Over capacity' : null,
  };
}

/** People who should move together: preferred roommates in either direction. */
export function roommateMoveGroup(
  person: LodgingPerson,
  allPeople: LodgingPerson[],
): LodgingPerson[] {
  const byId = new Map(allPeople.map((p) => [p.id, p]));
  const group: LodgingPerson[] = [person];
  const seen = new Set([person.id]);

  const add = (id: string): void => {
    if (seen.has(id)) {
      return;
    }
    const roommate = byId.get(id);
    if (roommate) {
      group.push(roommate);
      seen.add(id);
    }
  };

  for (const id of person.roommateIds ?? []) {
    add(id);
  }
  // Also pull anyone who listed this person as a preferred roommate
  for (const other of allPeople) {
    if (other.roommateIds?.includes(person.id)) {
      add(other.id);
    }
  }
  return group;
}

export function inferPolicyAfterAssign(
  person: LodgingPerson,
  room: LodgingRoomView,
  allPeople: LodgingPerson[],
): LodgingGenderPolicy {
  const others = room.occupantIds
    .map((id) => allPeople.find((p) => p.id === id))
    .filter((p): p is LodgingPerson => !!p && p.id !== person.id);
  const next = [...others, person];
  if (next.length === 2 && arePartners(next[0], next[1])) {
    return 'couple';
  }
  if (room.genderPolicy !== 'unset') {
    return room.genderPolicy;
  }
  if (person.gender === 'male' || person.gender === 'female') {
    return person.gender;
  }
  return effectiveRoomGender({ ...room, genderPolicy: 'unset' }, next);
}

export function genderLabel(gender: PersonGender): string {
  switch (gender) {
    case 'male':
      return 'M';
    case 'female':
      return 'F';
    default:
      return '?';
  }
}
