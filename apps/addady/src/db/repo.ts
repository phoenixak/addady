// All reads and writes go through here, so screens stay free of SQL.
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from './client';
import {
  appliances,
  homes,
  readings,
  recharges,
  settings,
  tariffCache,
  type NewHome,
} from './schema';

export const queries = {
  homes: () => db.select().from(homes).orderBy(asc(homes.id)),
  readings: (homeId: number) =>
    db.select().from(readings).where(eq(readings.homeId, homeId)).orderBy(asc(readings.at)),
  recharges: (homeId: number) =>
    db.select().from(recharges).where(eq(recharges.homeId, homeId)).orderBy(desc(recharges.at)),
  appliances: (homeId: number) =>
    db.select().from(appliances).where(eq(appliances.homeId, homeId)).orderBy(asc(appliances.id)),
  settings: () => db.select().from(settings),
};

export async function createHome(home: NewHome): Promise<number> {
  const [row] = await db.insert(homes).values(home).returning({ id: homes.id });
  await setSetting('currentHomeId', String(row!.id));
  return row!.id;
}

export async function updateHome(id: number, patch: Partial<NewHome>): Promise<void> {
  await db.update(homes).set(patch).where(eq(homes.id, id));
}

export async function deleteHome(id: number): Promise<void> {
  await db.delete(homes).where(eq(homes.id, id));
}

export async function addReading(row: typeof readings.$inferInsert): Promise<void> {
  await db.insert(readings).values(row);
}

export async function deleteReading(id: number): Promise<void> {
  await db.delete(readings).where(eq(readings.id, id));
}

export async function addRecharge(row: typeof recharges.$inferInsert): Promise<void> {
  await db.insert(recharges).values(row);
}

export async function addAppliance(row: typeof appliances.$inferInsert): Promise<void> {
  await db.insert(appliances).values(row);
}

export async function deleteAppliance(homeId: number, id: number): Promise<void> {
  await db.delete(appliances).where(and(eq(appliances.id, id), eq(appliances.homeId, homeId)));
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function saveTariffCache(json: string, signature: string): Promise<void> {
  const row = { id: 1, json, signature, fetchedAt: Date.now() };
  await db.insert(tariffCache).values(row).onConflictDoUpdate({ target: tariffCache.id, set: row });
}

export async function loadTariffCache() {
  const [row] = await db.select().from(tariffCache).where(eq(tariffCache.id, 1));
  return row ?? null;
}

/** Everything the user owns, for the backup file. */
export async function exportAll() {
  return {
    homes: await db.select().from(homes),
    readings: await db.select().from(readings),
    recharges: await db.select().from(recharges),
    appliances: await db.select().from(appliances),
    settings: await db.select().from(settings),
  };
}

export type Backup = Awaited<ReturnType<typeof exportAll>>;

/** Replaces all local data with a backup (one transaction: all or nothing). */
export async function importAll(backup: Backup): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(homes); // cascades to readings, recharges, appliances
    await tx.delete(settings);
    if (backup.homes.length) await tx.insert(homes).values(backup.homes);
    if (backup.readings.length) await tx.insert(readings).values(backup.readings);
    if (backup.recharges.length) await tx.insert(recharges).values(backup.recharges);
    if (backup.appliances.length) await tx.insert(appliances).values(backup.appliances);
    if (backup.settings.length) await tx.insert(settings).values(backup.settings);
  });
}
