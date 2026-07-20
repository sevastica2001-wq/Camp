export type CampStatus =
  | 'draft'
  | 'registration_open'
  | 'planning'
  | 'active'
  | 'finished'
  | 'archived';

export type CampRole = 'ADMIN' | 'ORGANIZER' | 'VOLUNTEER' | 'PARTICIPANT';
export type TransportRole = 'PASSENGER' | 'DRIVER';
export type AttendanceStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlist';
export type MessageTemplateType = 'driver' | 'passenger';

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
    };
  };
};
