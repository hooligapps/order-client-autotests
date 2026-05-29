import type { Page, TestInfo } from "@playwright/test";
import { getEvents, getLastEvent } from "./autotest";

export async function attachAutotestSnapshot(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  try {
    const [events, lastEvent] = await Promise.all([getEvents(page), getLastEvent(page)]);

    await testInfo.attach("autotest-events.json", {
      body: JSON.stringify(events, null, 2),
      contentType: "application/json"
    });

    await testInfo.attach("autotest-last-event.json", {
      body: JSON.stringify(lastEvent, null, 2),
      contentType: "application/json"
    });
  } catch (error) {
    await testInfo.attach("autotest-reporting-error.txt", {
      body: String(error),
      contentType: "text/plain"
    });
  }
}
