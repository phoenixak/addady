// Export (CSV), backup and restore through the Android share sheet / file picker.
// Backups are plain JSON the user controls; nothing is uploaded anywhere.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportAll, importAll, type Backup } from '../db/repo';

const BOM = String.fromCodePoint(0xfeff);
const BACKUP_FORMAT = 'addady-backup';
const BACKUP_VERSION = 1;

async function shareText(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function readingsCsv(data: Backup): string {
  const homesById = new Map(data.homes.map((h) => [h.id, h.name]));
  const header = ['home', 'at_utc', 'register_kwh', 'month_kwh', 'balance_egp', 'note'];
  const rows = [...data.readings]
    .sort((a, b) => a.at - b.at)
    .map((r) => [
      homesById.get(r.homeId),
      new Date(r.at).toISOString(),
      r.registerKWh,
      r.monthKWh,
      r.balancePiasters === null ? null : (r.balancePiasters / 100).toFixed(2),
      r.note,
    ]);
  // BOM so spreadsheet apps open the Arabic home names as UTF-8.
  return `${BOM}${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export async function exportCsv(): Promise<void> {
  await shareText('addady-readings.csv', readingsCsv(await exportAll()), 'text/csv');
}

export async function shareBackup(): Promise<void> {
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: await exportAll(),
  };
  await shareText(
    `addady-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload),
    'application/json',
  );
}

export function parseBackup(text: string): Backup | null {
  try {
    const parsed = JSON.parse(text) as {
      format?: unknown;
      version?: unknown;
      data?: Partial<Backup>;
    };
    if (parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION || !parsed.data)
      return null;
    const d = parsed.data;
    const lists = [d.homes, d.readings, d.recharges, d.appliances, d.settings];
    if (!lists.every(Array.isArray)) return null;
    return d as Backup;
  } catch {
    return null;
  }
}

/** Lets the user pick a backup file; returns false if cancelled or invalid. */
export async function restoreFromPicker(): Promise<'restored' | 'cancelled' | 'invalid'> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return 'cancelled';
  const backup = parseBackup(await new File(res.assets[0].uri).text());
  if (!backup) return 'invalid';
  await importAll(backup);
  return 'restored';
}
