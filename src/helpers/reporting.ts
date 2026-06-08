import type { Page, TestInfo } from "@playwright/test";
import type { BrowserConsoleMessage, FailedRequestDiagnostics, PageDiagnostics } from "../types/autotest";
import { getEvents, getLastEvent } from "./autotest";

function formatConsoleMessages(messages: BrowserConsoleMessage[]): string {
  if (messages.length === 0) {
    return "No browser console messages captured.\n";
  }

  return messages
    .map((message, index) => {
      const location = message.location?.url
        ? ` (${message.location.url}:${message.location.lineNumber ?? 0}:${message.location.columnNumber ?? 0})`
        : "";
      return `[${index + 1}] ${message.type.toUpperCase()}: ${message.text}${location}`;
    })
    .join("\n") + "\n";
}

function formatPageErrors(errors: string[]): string {
  if (errors.length === 0) {
    return "No page errors captured.\n";
  }

  return errors.map((error, index) => `[${index + 1}] ${error}`).join("\n\n") + "\n";
}

function formatFailedRequests(requests: FailedRequestDiagnostics[]): string {
  if (requests.length === 0) {
    return "No failed requests captured.\n";
  }

  return requests
    .map((request, index) => {
      return `[${index + 1}] ${request.method} ${request.url} [${request.resourceType}] -> ${request.failureText}`;
    })
    .join("\n") + "\n";
}

export async function attachAutotestSnapshot(
  page: Page,
  testInfo: TestInfo,
  diagnostics?: PageDiagnostics,
  options?: {
    attachOnSuccess?: boolean;
  }
): Promise<void> {
  const shouldAttachDiagnostics =
    options?.attachOnSuccess || testInfo.status !== testInfo.expectedStatus;

  if (!shouldAttachDiagnostics) {
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

    await testInfo.attach("age-gate-diagnostics.json", {
      body: JSON.stringify(diagnostics?.ageGate ?? null, null, 2),
      contentType: "application/json"
    });

    await testInfo.attach("console-messages.json", {
      body: JSON.stringify(diagnostics?.consoleMessages ?? [], null, 2),
      contentType: "application/json"
    });

    await testInfo.attach("console-messages.txt", {
      body: formatConsoleMessages(diagnostics?.consoleMessages ?? []),
      contentType: "text/plain"
    });

    await testInfo.attach("page-errors.json", {
      body: JSON.stringify(diagnostics?.pageErrors ?? [], null, 2),
      contentType: "application/json"
    });

    await testInfo.attach("page-errors.txt", {
      body: formatPageErrors(diagnostics?.pageErrors ?? []),
      contentType: "text/plain"
    });

    await testInfo.attach("failed-requests.json", {
      body: JSON.stringify(diagnostics?.failedRequests ?? [], null, 2),
      contentType: "application/json"
    });

    await testInfo.attach("failed-requests.txt", {
      body: formatFailedRequests(diagnostics?.failedRequests ?? []),
      contentType: "text/plain"
    });
  } catch (error) {
    await testInfo.attach("autotest-reporting-error.txt", {
      body: String(error),
      contentType: "text/plain"
    });
  }
}
