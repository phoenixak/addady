// Local SQLite schema (Drizzle). Everything stays on the phone (docs/PLAN.md §9).
// Money is integer piasters; instants are epoch milliseconds (UTC).
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const homes = sqliteTable('homes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  meterType: text('meter_type', { enum: ['postpaid', 'prepaid', 'coded'] }).notNull(),
  governorate: text('governorate').notNull(),
  /** Day of month (1-28) when the meter resets tiers (prepaid) or the reading cycle starts. */
  meterMonthStartDay: integer('meter_month_start_day').notNull().default(1),
  /** Contracted load in kW, if known (for the overload check). */
  contractedLoadKW: real('contracted_load_kw'),
  /** Low-balance warning threshold for prepaid meters. */
  lowBalancePiasters: integer('low_balance_piasters'),
  /** Other fixed charges seen on this home's bills (cleaning fee etc.), per month. */
  otherChargesPiasters: integer('other_charges_piasters').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const readings = sqliteTable(
  'readings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    homeId: integer('home_id')
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    at: integer('at').notNull(),
    /** Postpaid/coded: the cumulative register (kWh). */
    registerKWh: real('register_kwh'),
    /** Prepaid: "consumed this month" shown on the meter (kWh). */
    monthKWh: real('month_kwh'),
    /** Prepaid: remaining balance shown on the meter. */
    balancePiasters: integer('balance_piasters'),
    note: text('note'),
  },
  (t) => [index('readings_home_at').on(t.homeId, t.at)],
);

export const recharges = sqliteTable(
  'recharges',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    homeId: integer('home_id')
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    at: integer('at').notNull(),
    amountPiasters: integer('amount_piasters').notNull(),
  },
  (t) => [index('recharges_home_at').on(t.homeId, t.at)],
);

export const appliances = sqliteTable('appliances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  homeId: integer('home_id')
    .notNull()
    .references(() => homes.id, { onDelete: 'cascade' }),
  kind: text('kind', {
    enum: [
      'ac',
      'fridge',
      'waterHeater',
      'resistive',
      'motor',
      'washer',
      'lighting',
      'electronics',
    ],
  }).notNull(),
  name: text('name').notNull(),
  /** Label values and usage, as JSON (validated by the appliance form). */
  params: text('params', { mode: 'json' })
    .notNull()
    .$type<Record<string, number | boolean | string>>(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** The last verified tariffs.json downloaded from GitHub (fallback: the bundled copy). */
export const tariffCache = sqliteTable('tariff_cache', {
  id: integer('id').primaryKey(),
  json: text('json').notNull(),
  signature: text('signature').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

export type Home = typeof homes.$inferSelect;
export type NewHome = typeof homes.$inferInsert;
export type ReadingRow = typeof readings.$inferSelect;
export type RechargeRow = typeof recharges.$inferSelect;
export type ApplianceRow = typeof appliances.$inferSelect;
