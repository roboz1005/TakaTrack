// Name hygiene for people: trim, collapse spaces, compare case-insensitively.
export const normName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
export const nameKey = (s) => normName(s).toLocaleLowerCase();
/** The existing (non-archived) item with the same name, ignoring case/extra spaces; `exceptId` skips the item being renamed */
export const findDuplicate = (list, name, exceptId = null) => list.find((x) => !x.archived && x.id !== exceptId && nameKey(x.name) === nameKey(name)) ?? null;
