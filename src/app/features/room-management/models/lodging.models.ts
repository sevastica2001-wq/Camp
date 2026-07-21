import {
  LodgingBathType,
  LodgingBuildingStatus,
  LodgingGenderPolicy,
  PersonGender,
} from '../../../core/supabase/database.types';

export interface LodgingPerson {
  id: string;
  name: string;
  gender: PersonGender;
  partnerId: string | null;
  roomId: string | null;
  notes?: string;
}

export interface LodgingBuildingView {
  id: string;
  siteName: string;
  name: string;
  seedKey: string;
  sortOrder: number;
  status: LodgingBuildingStatus;
}

export interface LodgingRoomView {
  id: string;
  buildingId: string;
  name: string;
  seedKey: string;
  floor: string;
  capacity: number;
  amenities: string[];
  bathType: LodgingBathType;
  genderPolicy: LodgingGenderPolicy;
  sortOrder: number;
  notes: string;
  occupantIds: string[];
}

export type LodgingDropHighlight = 'ok' | 'warn' | 'danger' | 'blocked' | null;

export interface CristinaSeedRoom {
  seedKey: string;
  name: string;
  floor: string;
  capacity: number;
  amenities: string[];
  bathType: LodgingBathType;
  sortOrder: number;
  notes: string;
}

export interface CristinaSeedBuilding {
  seedKey: string;
  siteName: string;
  name: string;
  sortOrder: number;
  status: LodgingBuildingStatus;
  rooms: CristinaSeedRoom[];
}

export interface CristinaLodgingSeed {
  label: string;
  totalBeds: number;
  buildings: CristinaSeedBuilding[];
}
