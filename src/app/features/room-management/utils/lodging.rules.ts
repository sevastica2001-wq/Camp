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
): LodgingAssignCheck {
  const occupants = room.occupantIds
    .map((id) => allPeople.find((p) => p.id === id))
    .filter((p): p is LodgingPerson => !!p)
    .filter((p) => p.id !== person.id);

  const alreadyHere = room.occupantIds.includes(person.id);
  const nextCount = occupants.length + (alreadyHere ? 0 : 1);
  const overCapacity = nextCount > room.capacity;

  if (room.capacity <= 0) {
    return {
      blocked: true,
      overCapacity: true,
      genderConflict: false,
      reason: 'Room has no beds',
    };
  }

  if (overCapacity && !alreadyHere) {
    return {
      blocked: true,
      overCapacity: true,
      genderConflict: false,
      reason: 'Room is full',
    };
  }

  const policy = effectiveRoomGender(room, occupants);
  const partnerInRoom = occupants.some((o) => arePartners(person, o));

  if (policy === 'unset' || policy === 'mixed' || policy === 'couple') {
    return { blocked: false, overCapacity: false, genderConflict: false, reason: null };
  }

  if (partnerInRoom) {
    return { blocked: false, overCapacity: false, genderConflict: false, reason: null };
  }

  if (person.gender === 'unspecified') {
    return {
      blocked: true,
      overCapacity: false,
      genderConflict: true,
      reason: 'Set gender before assigning to a gendered room',
    };
  }

  if (person.gender !== policy) {
    return {
      blocked: true,
      overCapacity: false,
      genderConflict: true,
      reason: `Room is ${policy}-only`,
    };
  }

  return { blocked: false, overCapacity: false, genderConflict: false, reason: null };
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
