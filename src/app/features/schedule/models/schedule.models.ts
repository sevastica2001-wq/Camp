import { ScheduleEventCategory, ScheduleEventRow } from '../../../core/supabase/database.types';

export type { ScheduleEventCategory };
export type ScheduleEvent = ScheduleEventRow;

export interface ScheduleSeedEvent {
  seedKey: string;
  dayOffset: number;
  start: string;
  end: string;
  title: string;
  category: ScheduleEventCategory;
  location?: string;
  notes?: string;
}

export interface ScheduleSeedFile {
  label: string;
  mondayIsDayOffsetZero: boolean;
  events: ScheduleSeedEvent[];
}

/** Cristina camp program week (inclusive). Aug 10 2026 = Monday. */
export const PROGRAM_START = '2026-08-10';
export const PROGRAM_END = '2026-08-15';
/** FullCalendar validRange end is exclusive. */
export const PROGRAM_END_EXCLUSIVE = '2026-08-16';

/** @deprecated Use PROGRAM_START — kept as alias for seed Monday. */
export const SCHEDULE_FALLBACK_MONDAY = PROGRAM_START;

export const SCHEDULE_CATEGORY_COLORS: Record<
  ScheduleEventCategory,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  meal: { backgroundColor: '#1b5e20', borderColor: '#1b5e20', textColor: '#ffffff' },
  break: { backgroundColor: '#a5d6a7', borderColor: '#81c784', textColor: '#1b5e20' },
  session: { backgroundColor: '#1565c0', borderColor: '#0d47a1', textColor: '#ffffff' },
  activity: { backgroundColor: '#6a1b9a', borderColor: '#4a148c', textColor: '#ffffff' },
  travel: { backgroundColor: '#ef6c00', borderColor: '#e65100', textColor: '#ffffff' },
  checkin: { backgroundColor: '#0277bd', borderColor: '#01579b', textColor: '#ffffff' },
  checkout: { backgroundColor: '#546e7a', borderColor: '#37474f', textColor: '#ffffff' },
  other: { backgroundColor: '#455a64', borderColor: '#263238', textColor: '#ffffff' },
};
