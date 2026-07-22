import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import seedFile from '../data/cristina-schedule-seed.json';
import {
  PROGRAM_END_EXCLUSIVE,
  PROGRAM_START,
  ScheduleEvent,
  ScheduleSeedFile,
} from '../models/schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly supabase = inject(SupabaseService);
  private readonly seed = seedFile as ScheduleSeedFile;

  async ensureSeeded(campId: string): Promise<void> {
    const existing = await this.listEvents(campId);
    if (existing.length === 0) {
      await this.seedFromDraft(campId);
      return;
    }
    // Repair early seeds that landed outside 10–15 Aug 2026.
    const inRange = existing.some((ev) => {
      const t = new Date(ev.starts_at).getTime();
      return t >= parseLocalDate(PROGRAM_START).getTime() && t < parseLocalDate(PROGRAM_END_EXCLUSIVE).getTime();
    });
    if (inRange) {
      return;
    }
    const { error } = await this.supabase.client.rpc('reseed_schedule_events', {
      p_camp_id: campId,
      p_events: this.buildSeedRows(),
    });
    if (error) {
      // Fall back: leave old rows; calendar validRange will just look empty.
      console.warn('Could not reseed schedule:', error.message);
    }
  }

  async listEvents(campId: string): Promise<ScheduleEvent[]> {
    const { data, error } = await this.supabase.client
      .from('schedule_events')
      .select('*')
      .eq('camp_id', campId)
      .order('starts_at', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ScheduleEvent[]) ?? [];
  }

  /** Program Monday (dayOffset 0) — fixed Cristina week 10–15 Aug 2026. */
  resolveProgramMonday(): string {
    return PROGRAM_START;
  }

  async createEvent(
    campId: string,
    input: {
      title: string;
      starts_at: string;
      ends_at: string;
      category?: ScheduleEvent['category'];
      location?: string;
      notes?: string;
    },
  ): Promise<ScheduleEvent> {
    const { data, error } = await this.supabase.client
      .from('schedule_events')
      .insert({
        camp_id: campId,
        title: input.title,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        category: input.category ?? 'other',
        location: input.location ?? '',
        notes: input.notes ?? '',
        sort_order: 0,
        seed_key: null,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create event');
    }
    return data as ScheduleEvent;
  }

  async updateEvent(
    eventId: string,
    patch: Partial<Pick<ScheduleEvent, 'title' | 'starts_at' | 'ends_at' | 'category' | 'location' | 'notes'>>,
  ): Promise<ScheduleEvent> {
    const { data, error } = await this.supabase.client
      .from('schedule_events')
      .update(patch)
      .eq('id', eventId)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update event');
    }
    return data as ScheduleEvent;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('schedule_events')
      .delete()
      .eq('id', eventId);
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Persist a full draft in one RPC (deletes + upserts + returns rows).
   */
  async saveDraft(
    campId: string,
    draft: Array<{
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      category: ScheduleEvent['category'];
      location: string;
      notes: string;
      isNew?: boolean;
    }>,
    deletedIds: string[],
  ): Promise<ScheduleEvent[]> {
    const { data, error } = await this.supabase.client.rpc('save_schedule_draft', {
      p_camp_id: campId,
      p_upserts: draft.map((ev) => ({
        id: ev.isNew ? null : ev.id,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        category: ev.category,
        location: ev.location,
        notes: ev.notes,
        is_new: !!ev.isNew,
      })),
      p_delete_ids: deletedIds,
    });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ScheduleEvent[]) ?? [];
  }

  private buildSeedRows() {
    const monday = this.resolveProgramMonday();
    return this.seed.events.map((ev, index) => {
      const startsAt = combineLocalDateTime(monday, ev.dayOffset, ev.start);
      const endsAt = combineLocalDateTime(monday, ev.dayOffset, ev.end);
      return {
        title: ev.title,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        category: ev.category,
        location: ev.location ?? '',
        notes: ev.notes ?? '',
        sort_order: index,
        seed_key: ev.seedKey,
      };
    });
  }

  private async seedFromDraft(campId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('seed_schedule_events', {
      p_camp_id: campId,
      p_events: this.buildSeedRows(),
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function combineLocalDateTime(mondayYmd: string, dayOffset: number, hhmm: string): Date {
  const base = parseLocalDate(mondayYmd);
  base.setDate(base.getDate() + dayOffset);
  const [hh, mm] = hhmm.split(':').map(Number);
  base.setHours(hh ?? 0, mm ?? 0, 0, 0);
  return base;
}
