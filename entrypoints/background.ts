import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import scheduleCsv from '../schedule.csv?raw';

type PoyaType = 'Full' | 'New';

interface PoyaEntry {
  date: Date;
  type: PoyaType;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseSchedule(csv: string): PoyaEntry[] {
  return csv
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [dateStr, typeRaw] = line.split(/\t+|\s{2,}/);
      const type = (typeRaw?.trim() ?? '') as PoyaType;
      const [month, day, year] = dateStr.split('/').map((part) => Number(part));
      // Create date as UTC midnight
      const date = new Date(Date.UTC(year, month - 1, day));
      return { date, type };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Returns a UTC Date object representing the start of the UTC day for the given local date.
 */
function startOfUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function daysBetween(a: Date, b: Date): number {
  // Both dates are UTC midnights, so the difference is an exact multiple of MS_PER_DAY
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function findNextPoya(
  entries: PoyaEntry[],
  today: Date,
): { entry: PoyaEntry; daysUntil: number } | undefined {
  const todayStart = startOfUTCDate(today);
  for (const entry of entries) {
    const diff = daysBetween(todayStart, entry.date);
    if (diff >= 0) {
      return { entry, daysUntil: diff };
    }
  }
  return undefined;
}

function iconPathForEntry(type: PoyaType, daysUntil: number): string {
  const prefix = type === 'New' ? 'new' : 'full';
  const suffix = String(daysUntil).padStart(2, '0');
  return `images/${prefix}-${suffix}.png`;
}

/**
 * Fetches an image, decodes it, and returns an ImageData object for the requested size.
 * Uses OffscreenCanvas which is available in Manifest V3 service workers.
 */
async function getImageData(path: string, size: number): Promise<ImageData> {
  const response = await fetch(browser.runtime.getURL(path));
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Ensure high quality downscaling from 256x256
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

async function updateActionIconAndBadge(entries: PoyaEntry[]): Promise<void> {
  const now = new Date();
  const next = findNextPoya(entries, now);
  if (!next) {
    await browser.action.setBadgeText({ text: '' });
    return;
  }

  const { entry, daysUntil } = next;
  const rawPath = iconPathForEntry(entry.type, daysUntil);

  console.log(`Updating icon. path="${rawPath}" daysUntil=${daysUntil}`);

  try {
    // Chrome MV3 is very picky about icon files. 
    // Passing raw ImageData generated via OffscreenCanvas is the most reliable method.
    // Providing intermediate sizes (24, 38) ensures sharpness on high-DPI screens.
    const [id16, id24, id32, id38, id48, id128] = await Promise.all([
      getImageData(rawPath, 16),
      getImageData(rawPath, 24),
      getImageData(rawPath, 32),
      getImageData(rawPath, 38),
      getImageData(rawPath, 48),
      getImageData(rawPath, 128),
    ]);

    await browser.action.setIcon({
      imageData: {
        "16": id16,
        "24": id24,
        "32": id32,
        "38": id38,
        "48": id48,
        "128": id128,
      }
    });
    console.log('Successfully set icon via ImageData (quality optimized)');
    await browser.action.setBadgeText({ text: '' });
  } catch (error) {
    console.error('Failed to set icon via ImageData:', error);
    // Fallback to simple path if canvas fails (e.g. in some browser versions)
    try {
      await browser.action.setIcon({ path: rawPath });
    } catch (fallbackError) {
      console.error('Fallback setIcon also failed:', fallbackError);
    }
  }

  const titleDate = entry.date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  await browser.action.setTitle({
    title: `Next poya: ${entry.type} moon on ${titleDate} (${daysUntil} day${daysUntil === 1 ? '' : 's'
      } away)`,
  });
}

const SCHEDULE = parseSchedule(scheduleCsv);

export default defineBackground(() => {
  const runUpdate = () => {
    updateActionIconAndBadge(SCHEDULE).catch((error) => {
      console.error('Failed to update poya icon', error);
    });
  };

  runUpdate();

  browser.runtime.onStartup.addListener(runUpdate);
  browser.runtime.onInstalled.addListener(runUpdate);

  browser.alarms.create('uposatha:update-icon', { periodInMinutes: 60 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'uposatha:update-icon') {
      runUpdate();
    }
  });
});