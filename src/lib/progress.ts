import { atom } from 'nanostores';

/**
 * Прогресс без регистрации. Пройденный урок — ключ localStorage `sigma:<курс>:<номер урока>` = '1'.
 * Перенос на другое устройство — ссылка `#p=<курс>.<маска>,…`: маска — биты уроков (урок n — бит n−1)
 * в base36. При открытии ссылки прогресс объединяется с локальным, хэш убирается из адреса.
 */

export type ProgressMap = Readonly<Record<string, true>>;

const PREFIX = 'sigma:';
const KEY_RE = /^sigma:([a-z0-9-]+):(\d+)$/;
const HASH_RE = /(?:^#|&)p=([^&]*)/;

export const lessonKey = (course: string, n: number) => `${course}:${n}`;

/** Пройденные уроки всех курсов: { 'tpn:4': true, … }. */
export const $progress = atom<ProgressMap>({});

function readStorage(): ProgressMap {
  const map: Record<string, true> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && KEY_RE.exec(k);
      if (m && localStorage.getItem(k!) === '1') map[lessonKey(m[1]!, Number(m[2]))] = true;
    }
  } catch {
    // Приватное окно или запрещённое хранилище: прогресс просто не сохраняется.
  }
  return map;
}

function write(course: string, n: number, done: boolean) {
  try {
    if (done) localStorage.setItem(`${PREFIX}${course}:${n}`, '1');
    else localStorage.removeItem(`${PREFIX}${course}:${n}`);
  } catch {}
}

let started = false;
/** Загружает прогресс из браузера и подписывается на изменения из других вкладок. Идемпотентно. */
export function startProgress() {
  if (started || typeof window === 'undefined') return;
  started = true;
  $progress.set(readStorage());
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith(PREFIX)) $progress.set(readStorage());
  });
}

export function isDone(map: ProgressMap, course: string, n: number): boolean {
  return map[lessonKey(course, n)] === true;
}

export function setDone(course: string, n: number, done: boolean) {
  write(course, n, done);
  const next: Record<string, true> = { ...$progress.get() };
  if (done) next[lessonKey(course, n)] = true;
  else delete next[lessonKey(course, n)];
  $progress.set(next);
}

export function countDone(map: ProgressMap, course: string, lessons: readonly number[]): number {
  return lessons.filter((n) => isDone(map, course, n)).length;
}

/** { 'tpn:1': true, 'tpn:4': true } → 'tpn.9' */
export function encodeProgress(map: ProgressMap): string {
  const masks = new Map<string, bigint>();
  for (const key of Object.keys(map)) {
    const [course, n] = key.split(':');
    if (!course || !n) continue;
    masks.set(course, (masks.get(course) ?? 0n) | (1n << BigInt(Number(n) - 1)));
  }
  return [...masks].sort(([a], [b]) => a.localeCompare(b)).map(([c, m]) => `${c}.${m.toString(36)}`).join(',');
}

/** 'tpn.9,math.1' → [['tpn', 1], ['tpn', 4], ['math', 1]]. Мусор пропускается. */
export function decodeProgress(s: string): [string, number][] {
  const out: [string, number][] = [];
  for (const part of s.split(',')) {
    const m = /^([a-z0-9-]+)\.([0-9a-z]+)$/.exec(part.trim());
    if (!m) continue;
    let mask = 0n;
    for (const ch of m[2]!) mask = mask * 36n + BigInt(parseInt(ch, 36));
    for (let n = 1; mask > 0n; n++, mask >>= 1n) if (mask & 1n) out.push([m[1]!, n]);
  }
  return out;
}

/** Ссылка, открыв которую на другом устройстве, получишь этот прогресс. */
export function progressLink(origin: string, map: ProgressMap = $progress.get()): string {
  return `${origin}/#p=${encodeProgress(map)}`;
}

/** Забирает прогресс из `#p=…`: объединяет с локальным, чистит адрес. Возвращает число новых уроков. */
export function importFromHash(): number {
  const m = HASH_RE.exec(location.hash);
  if (!m) return 0;
  let added = 0;
  for (const [course, n] of decodeProgress(decodeURIComponent(m[1]!))) {
    if (!isDone($progress.get(), course, n)) {
      setDone(course, n, true);
      added++;
    }
  }
  const rest = location.hash.replace(HASH_RE, '').replace(/^#&/, '#');
  history.replaceState(null, '', location.pathname + location.search + (rest === '#' ? '' : rest));
  return added;
}
