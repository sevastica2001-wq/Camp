export type CampStatus =
  | 'draft'
  | 'registration_open'
  | 'planning'
  | 'active'
  | 'finished'
  | 'archived';

export type CampRole = 'ADMIN' | 'ORGANIZER' | 'VOLUNTEER' | 'PARTICIPANT' | 'VIEWER';
export type TransportRole = 'PASSENGER' | 'DRIVER';
export type AttendanceStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlist';
export type MessageTemplateType = 'driver' | 'passenger';
export type PersonGender = 'male' | 'female' | 'unspecified';
export type LodgingBuildingStatus = 'active' | 'under_construction' | 'unavailable';
export type LodgingGenderPolicy = 'unset' | 'male' | 'female' | 'mixed' | 'couple';
export type LodgingBathType = 'private' | 'shared_corridor' | 'none';
export type ScheduleEventCategory =
  | 'meal'
  | 'break'
  | 'session'
  | 'activity'
  | 'travel'
  | 'checkin'
  | 'checkout'
  | 'other';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  can_create_camps: boolean;
  created_at: string;
}

export interface Camp {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  status: CampStatus;
  created_by: string;
  created_at: string;
}

export interface CampMember {
  id: string;
  camp_id: string;
  user_id: string;
  role: CampRole;
  created_at: string;
}

export interface CampMemberWithUser extends CampMember {
  user?: Pick<UserProfile, 'id' | 'email' | 'first_name' | 'last_name'> | null;
}

export interface Registration {
  id: string;
  camp_id: string;
  user_id: string | null;
  display_name: string;
  attendance_status: AttendanceStatus;
  transport_role: TransportRole;
  departure_location: string;
  return_location: string;
  available_seats: number;
  car_model: string;
  car_color: string;
  license_plate: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  assigned_driver_registration_id: string | null;
  gender: PersonGender;
  partner_registration_id: string | null;
  created_at: string;
}

export interface LodgingBuilding {
  id: string;
  camp_id: string;
  site_name: string;
  name: string;
  seed_key: string;
  sort_order: number;
  status: LodgingBuildingStatus;
  created_at: string;
}

export interface LodgingRoom {
  id: string;
  camp_id: string;
  building_id: string;
  name: string;
  seed_key: string;
  floor: string;
  capacity: number;
  amenities: string[];
  bath_type: LodgingBathType;
  gender_policy: LodgingGenderPolicy;
  sort_order: number;
  notes: string;
  created_at: string;
}

export interface LodgingAssignment {
  id: string;
  camp_id: string;
  room_id: string;
  registration_id: string;
  created_at: string;
}

export interface RoommatePreference {
  id: string;
  camp_id: string;
  registration_id: string;
  roommate_registration_id: string;
  created_at: string;
}

export interface CampInvitation {
  id: string;
  camp_id: string;
  slug: string;
  code: string;
  active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  invited_role: CampRole;
}

export interface MessageTemplate {
  id: string;
  camp_id: string;
  type: MessageTemplateType;
  body: string;
  created_at: string;
}

export interface ScheduleEventRow {
  id: string;
  camp_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  category: ScheduleEventCategory;
  location: string;
  notes: string;
  sort_order: number;
  seed_key: string | null;
  created_at: string;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/** Database typing for Supabase client. */
export type Database = {
  public: {
    Tables: {
      users: TableDef<
        UserProfile,
        Partial<UserProfile> & { id: string; email: string },
        Partial<UserProfile>
      >;
      camps: TableDef<
        Camp,
        Omit<Camp, 'id' | 'created_at'> & { id?: string },
        Partial<Camp>
      >;
      camp_members: TableDef<
        CampMember,
        Omit<CampMember, 'id' | 'created_at'> & { id?: string },
        Partial<CampMember>
      >;
      registrations: TableDef<
        Registration,
        Omit<Registration, 'id' | 'created_at'> & { id?: string },
        Partial<Registration>
      >;
      lodging_buildings: TableDef<
        LodgingBuilding,
        Omit<LodgingBuilding, 'id' | 'created_at'> & { id?: string },
        Partial<LodgingBuilding>
      >;
      lodging_rooms: TableDef<
        LodgingRoom,
        Omit<LodgingRoom, 'id' | 'created_at'> & { id?: string },
        Partial<LodgingRoom>
      >;
      lodging_assignments: TableDef<
        LodgingAssignment,
        Omit<LodgingAssignment, 'id' | 'created_at'> & { id?: string },
        Partial<LodgingAssignment>
      >;
      registration_roommate_preferences: TableDef<
        RoommatePreference,
        Omit<RoommatePreference, 'id' | 'created_at'> & { id?: string },
        Partial<RoommatePreference>
      >;
      camp_invitations: TableDef<
        CampInvitation,
        Omit<CampInvitation, 'id' | 'created_at'> & { id?: string },
        Partial<CampInvitation>
      >;
      message_templates: TableDef<
        MessageTemplate,
        Omit<MessageTemplate, 'id' | 'created_at'> & { id?: string },
        Partial<MessageTemplate>
      >;
      schedule_events: TableDef<
        ScheduleEventRow,
        Omit<ScheduleEventRow, 'id' | 'created_at'> & { id?: string },
        Partial<ScheduleEventRow>
      >;
    };
    Views: {};
    Functions: {
      lookup_invitation: {
        Args: { p_slug: string; p_code: string };
        Returns: Array<{
          invitation_id: string;
          camp_id: string;
          camp_name: string;
          camp_status: CampStatus;
          slug: string;
          code: string;
          invited_role: CampRole;
        }>;
      };
      join_camp_with_invite: {
        Args: { p_slug: string; p_code: string };
        Returns: string;
      };
      join_camp_with_invite_token: {
        Args: { p_token: string };
        Returns: string;
      };
      user_can_create_camps: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      seed_schedule_events: {
        Args: { p_camp_id: string; p_events: unknown };
        Returns: number;
      };
      reseed_schedule_events: {
        Args: { p_camp_id: string; p_events: unknown };
        Returns: number;
      };
      save_schedule_draft: {
        Args: {
          p_camp_id: string;
          p_upserts: unknown;
          p_delete_ids?: string[];
        };
        Returns: unknown;
      };
    };
  };
};
