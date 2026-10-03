/** Native runtimes may provide Intl.DateTimeFormat without RelativeTimeFormat. */
export function relativeTime(value: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'week', locale: string, narrow = true): string {
  if (typeof Intl.RelativeTimeFormat === 'function') {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: narrow ? 'narrow' : 'long' }).format(value, unit);
  }
  const de = locale.toLowerCase().startsWith('de');
  if (value === 0 && unit === 'second') return de ? 'jetzt' : 'now';
  if (unit === 'day' && Math.abs(value) <= 1) {
    return de ? (value === 0 ? 'heute' : value < 0 ? 'gestern' : 'morgen') : (value === 0 ? 'today' : value < 0 ? 'yesterday' : 'tomorrow');
  }
  const count = Math.abs(value);
  const units = de
    ? { second: ['Sekunde', 'Sekunden'], minute: ['Minute', 'Minuten'], hour: ['Stunde', 'Stunden'], day: ['Tag', 'Tagen'], week: ['Woche', 'Wochen'] }
    : { second: ['second', 'seconds'], minute: ['minute', 'minutes'], hour: ['hour', 'hours'], day: ['day', 'days'], week: ['week', 'weeks'] };
  const label = `${count} ${units[unit][count === 1 ? 0 : 1]}`;
  return value < 0 ? (de ? `vor ${label}` : `${label} ago`) : `in ${label}`;
}
