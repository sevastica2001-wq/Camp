import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import {
  Camp,
  CampInvitation,
  CampMember,
  CampMemberWithUser,
  CampRole,
  CampStatus,
} from '../../core/supabase/database.types';

@Injectable({ providedIn: 'root' })
export class CampsService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async listMyCamps(): Promise<Array<Camp & { role: CampRole }>> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return [];
    }

    const { data: memberships, error: memErr } = await this.supabase.client
      .from('camp_members')
      .select('role, camp_id')
      .eq('user_id', userId);

    if (memErr || !memberships?.length) {
      return [];
    }

    const ids = memberships.map((m) => m.camp_id);
    const { data: camps, error } = await this.supabase.client
      .from('camps')
      .select('*')
      .in('id', ids)
      .neq('status', 'archived')
      .order('start_date', { ascending: true });

    if (error || !camps) {
      return [];
    }

    const roleByCamp = new Map(memberships.map((m) => [m.camp_id, m.role as CampRole]));
    return (camps as Camp[]).map((c) => ({
      ...c,
      role: roleByCamp.get(c.id) ?? 'PARTICIPANT',
    }));
  }

  async getCamp(campId: string): Promise<Camp> {
    const { data, error } = await this.supabase.client
      .from('camps')
      .select('*')
      .eq('id', campId)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Camp not found');
    }
    return data as Camp;
  }

  async getMyMembership(campId: string): Promise<CampMember | null> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return null;
    }
    const { data } = await this.supabase.client
      .from('camp_members')
      .select('*')
      .eq('camp_id', campId)
      .eq('user_id', userId)
      .maybeSingle();
    return (data as CampMember) ?? null;
  }

  async createCamp(input: {
    name: string;
    description?: string;
    location?: string;
    start_date?: string | null;
    end_date?: string | null;
    status?: CampStatus;
  }): Promise<Camp> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Not signed in');
    }
    if (!this.auth.canCreateCamps()) {
      throw new Error('You are not allowed to create camps. Ask a platform admin.');
    }

    const { data: camp, error } = await this.supabase.client
      .from('camps')
      .insert({
        name: input.name,
        description: input.description ?? '',
        location: input.location ?? '',
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        status: input.status ?? 'draft',
        created_by: userId,
      })
      .select('*')
      .single();

    if (error || !camp) {
      throw new Error(error?.message ?? 'Failed to create camp');
    }

    const { error: memErr } = await this.supabase.client.from('camp_members').insert({
      camp_id: (camp as Camp).id,
      user_id: userId,
      role: 'ORGANIZER',
    });

    if (memErr) {
      throw new Error(memErr.message);
    }

    await this.supabase.client.from('message_templates').insert([
      {
        camp_id: (camp as Camp).id,
        type: 'driver',
        body: `Hello {{driverName}}\n\nYou are driving for {{campName}}.\n\nDeparture:\n{{departureLocation}}\n\nPassengers:\n{{passengerList}}\n\nAvailable seats:\n{{availableSeats}}`,
      },
      {
        camp_id: (camp as Camp).id,
        type: 'passenger',
        body: `Hello {{participantName}}\n\nYour driver for {{campName}} is:\n{{driverName}}\n\nDeparture:\n{{departureLocation}}`,
      },
    ]);

    return camp as Camp;
  }

  async updateCamp(campId: string, patch: Partial<Camp>): Promise<Camp> {
    const { data, error } = await this.supabase.client
      .from('camps')
      .update(patch)
      .eq('id', campId)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update camp');
    }
    return data as Camp;
  }

  async listMembers(campId: string): Promise<CampMember[]> {
    const { data, error } = await this.supabase.client
      .from('camp_members')
      .select('*')
      .eq('camp_id', campId);
    if (error) {
      throw new Error(error.message);
    }
    return (data as CampMember[]) ?? [];
  }

  async listMembersWithUsers(campId: string): Promise<CampMemberWithUser[]> {
    const { data, error } = await this.supabase.client
      .from('camp_members')
      .select('*, user:users(id, email, first_name, last_name)')
      .eq('camp_id', campId)
      .order('created_at', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as CampMemberWithUser[]) ?? [];
  }

  async updateMemberRole(memberId: string, role: CampRole): Promise<void> {
    const { error } = await this.supabase.client
      .from('camp_members')
      .update({ role })
      .eq('id', memberId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async createInvitation(
    campId: string,
    slug: string,
    invitedRole: CampRole = 'PARTICIPANT',
  ): Promise<CampInvitation> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Not signed in');
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await this.supabase.client
      .from('camp_invitations')
      .insert({
        camp_id: campId,
        slug: slug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        code,
        active: true,
        created_by: userId,
        invited_role: invitedRole,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create invitation');
    }
    return data as CampInvitation;
  }

  async listInvitations(campId: string): Promise<CampInvitation[]> {
    const { data, error } = await this.supabase.client
      .from('camp_invitations')
      .select('*')
      .eq('camp_id', campId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data as CampInvitation[]) ?? [];
  }

  async lookupInvitation(slug: string, code: string) {
    const { data, error } = await this.supabase.client.rpc('lookup_invitation', {
      p_slug: slug,
      p_code: code,
    });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? [])[0] ?? null;
  }

  async joinWithInvite(slug: string, code: string): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('join_camp_with_invite', {
      p_slug: slug,
      p_code: code,
    });
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to join camp');
    }
    return data as string;
  }

  /** Accepts `slug/code` or a full `/join/slug/code` URL. */
  async joinWithInviteToken(token: string): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('join_camp_with_invite_token', {
      p_token: token.trim(),
    });
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to join camp');
    }
    return data as string;
  }

  async duplicateCamp(sourceCampId: string, newName: string): Promise<Camp> {
    const source = await this.getCamp(sourceCampId);
    const created = await this.createCamp({
      name: newName,
      description: source.description,
      location: source.location,
      status: 'draft',
    });

    const members = await this.listMembers(sourceCampId);
    const userId = this.auth.user()?.id;
    for (const m of members) {
      if (m.role === 'ORGANIZER' || m.role === 'ADMIN') {
        if (m.user_id === userId) {
          continue;
        }
        await this.supabase.client.from('camp_members').upsert({
          camp_id: created.id,
          user_id: m.user_id,
          role: m.role,
        });
      }
    }

    const { data: templates } = await this.supabase.client
      .from('message_templates')
      .select('*')
      .eq('camp_id', sourceCampId);
    if (templates?.length) {
      await this.supabase.client.from('message_templates').upsert(
        templates.map((t) => ({
          camp_id: created.id,
          type: t.type,
          body: t.body,
        })),
      );
    }

    return created;
  }
}
