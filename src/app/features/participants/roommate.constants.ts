/** Max preferred roommates stored per participant (outgoing links). */
export const MAX_ROOMMATES_PER_PERSON = 5;

/**
 * Max people that can be linked together as one roommate group.
 * With N people, each ends up with N − 1 roommates (≤ MAX_ROOMMATES_PER_PERSON).
 * Independent of lodging room bed capacities.
 */
export const MAX_ROOMMATE_LINK_SELECTION = 6;
