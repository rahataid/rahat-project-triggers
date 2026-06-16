import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import * as tar from 'tar-stream';

export const getFormattedDate = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dateTimeString = `${year}-${month}-${day}T00:00:00`;
  const dateString = `${year}-${month}-${day}`;

  return { dateString, dateTimeString };
};

export function extractDateFromFilename(filename: string): string {
  // glofas_pointdata_ICIMOD_2026060800.tar.gz → "2026-06-08"
  const match = filename.match(/(\d{8})\d{2}\.tar\.gz$/);
  if (!match || !match[1]) throw new Error(`Cannot extract date from filename: ${filename}`);
  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export async function extractTarGz(buffer: Buffer): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const files = new Map<string, string>();
    const extract = tar.extract();

    extract.on('entry', (header: tar.Headers, stream: NodeJS.ReadableStream & { resume(): void }, next: () => void) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files.set(header.name, Buffer.concat(chunks).toString('utf-8'));
        next();
      });
      stream.resume();
    });

    extract.on('finish', () => resolve(files));
    extract.on('error', reject);

    Readable.from(buffer).pipe(createGunzip()).pipe(extract);
  });
}

export type DischargeRecord = {
  name: string;
  time: string;
  member: number;
  dis: number;
};

export function parseDischargeSeries(content: string): DischargeRecord[] {
  const lines = content.split('\n');
  const records: DischargeRecord[] = [];

  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    // format: rowIndex  name  time  member  dis
    if (parts.length < 5) continue;
    const [, name, time, memberStr, disStr] = parts;
    if (!name || !time || !memberStr || !disStr) continue;
    records.push({
      name,
      time,
      member: parseInt(memberStr, 10),
      dis: parseFloat(disStr),
    });
  }

  return records;
}

export type ReturnLevelRecord = {
  stationId: string;
  name: string;
  level2yr: number;
  level5yr: number;
  level20yr: number;
};

export function parseReturnLevels(content: string): ReturnLevelRecord[] {
  const lines = content.split('\n');
  const records: ReturnLevelRecord[] = [];

  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    // Name lat lon 2y 5y 20y ...
    if (parts.length < 6) continue;
    const [rawName, , , level2yr, level5yr, level20yr] = parts;
    if (!rawName || !level2yr || !level5yr || !level20yr) continue;
    const sep = rawName.indexOf('_');
    const stationId = sep > -1 ? rawName.slice(0, sep) : rawName;
    const name = sep > -1 ? rawName.slice(sep + 1) : rawName;
    records.push({
      stationId,
      name,
      level2yr: parseFloat(level2yr),
      level5yr: parseFloat(level5yr),
      level20yr: parseFloat(level20yr),
    });
  }

  return records;
}
