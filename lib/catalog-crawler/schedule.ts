const SHANGHAI_SCHEDULE_HOURS_UTC = [2, 14] as const;

/**
 * The crawler runs at 10:00 and 22:00 in Asia/Shanghai. China has no daylight
 * saving time, so those slots are always 02:00 and 14:00 UTC.
 */
export function nextCrawlerScheduleAt(now: Date) {
  for (const hour of SHANGHAI_SCHEDULE_HOURS_UTC) {
    const candidate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour),
    );

    if (candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      SHANGHAI_SCHEDULE_HOURS_UTC[0],
    ),
  );
}

export function latestCrawlerScheduleAt(now: Date) {
  for (const hour of [...SHANGHAI_SCHEDULE_HOURS_UTC].reverse()) {
    const candidate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour),
    );

    if (candidate.getTime() <= now.getTime()) {
      return candidate;
    }
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      SHANGHAI_SCHEDULE_HOURS_UTC[1],
    ),
  );
}
