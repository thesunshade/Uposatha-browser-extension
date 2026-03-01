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
      const [dateStr, typeRaw] = line.split('\t');
      const type = (typeRaw?.trim() ?? '') as PoyaType;
      const [month, day, year] = dateStr.split('/').map((part) => Number(part));
      const date = new Date(year, month - 1, day);
      return { date, type };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function findNextPoya(
  entries: PoyaEntry[],
  today: Date,
): { entry: PoyaEntry; daysUntil: number } | undefined {
  const todayStart = startOfLocalDay(today);
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

async function updateActionIconAndBadge(entries: PoyaEntry[]): Promise<void> {
  const now = new Date();
  const next = findNextPoya(entries, now);
  if (!next) {
    await browser.action.setBadgeText({ text: '' });
    return;
  }

  const { entry, daysUntil } = next;

  const iconPath = iconPathForEntry(entry.type, daysUntil);
  await browser.action.setIcon({ path: iconPath });
  await browser.action.setBadgeText({ text: '' });

  const titleDate = entry.date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  await browser.action.setTitle({
    title: `Next poya: ${entry.type} moon on ${titleDate} (${daysUntil} day${
      daysUntil === 1 ? '' : 's'
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