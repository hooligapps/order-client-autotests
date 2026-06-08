import type { Page } from "@playwright/test";
import { env } from "../config/env";
import type { AutotestEvent, AutotestStore, EventFilter } from "../types/autotest";
import { timeoutMessage } from "./waits";

function matchesFilter(event: AutotestEvent, filter: EventFilter): boolean {
  return Object.entries(filter).every(([key, expectedValue]) => {
    return event[key as keyof EventFilter] === expectedValue;
  });
}

export async function waitForAutotestStore(
  page: Page,
  timeoutMs = 15_000
): Promise<AutotestStore> {
  await page.waitForFunction(
    () => {
      const store = window.__autotest;
      return !!store && Array.isArray(store.events);
    },
    undefined,
    {
      timeout: timeoutMs,
      polling: env.pollIntervalMs
    }
  );

  return page.evaluate(() => window.__autotest as AutotestStore);
}

export async function getEvents(page: Page): Promise<AutotestEvent[]> {
  return page.evaluate(() => window.__autotest?.events ?? []);
}

export async function getLastEvent(page: Page): Promise<AutotestEvent | null> {
  return page.evaluate(() => window.__autotest?.lastEvent ?? null);
}

export async function hasAutotestStore(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const store = window.__autotest;
    return !!store && Array.isArray(store.events);
  });
}

export async function hasEvent(page: Page, filter: EventFilter): Promise<boolean> {
  const events = await getEvents(page);
  return events.some((event) => matchesFilter(event, filter));
}

export async function waitForEvent(
  page: Page,
  filter: EventFilter,
  timeoutMs = 20_000
): Promise<AutotestEvent> {
  await waitForAutotestStore(page, timeoutMs);

  await page.waitForFunction(
    ({ currentFilter }) => {
      const events = window.__autotest?.events ?? [];
      return events.some((event) => {
        return Object.entries(currentFilter).every(([key, expectedValue]) => {
          return event[key] === expectedValue;
        });
      });
    },
    { currentFilter: filter },
    {
      timeout: timeoutMs,
      polling: env.pollIntervalMs
    }
  );

  const events = await getEvents(page);
  const matchedEvent = events.find((event) => matchesFilter(event, filter));

  if (!matchedEvent) {
    throw new Error(timeoutMessage(`Event ${JSON.stringify(filter)}`, timeoutMs));
  }

  return matchedEvent;
}
