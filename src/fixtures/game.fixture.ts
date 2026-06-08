import { test as base } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { env, resolveBaseUrl } from "../config/env";
import type {
  AgeGateDiagnostics,
  AutotestEvent,
  BrowserLoggingOptions,
  BrowserConsoleMessage,
  EventFilter,
  FailedRequestDiagnostics,
  PageDiagnostics
} from "../types/autotest";
import { clickAt } from "../helpers/clicks";
import {
  getEvents,
  hasAutotestStore,
  hasEvent,
  waitForAutotestStore,
  waitForEvent
} from "../helpers/autotest";
import { attachAutotestSnapshot } from "../helpers/reporting";
import { buildAutotestUrl } from "../helpers/urls";

export class GameSession {
  private static readonly ageConfirmSelector = "#age-confirm-btn";
  private static readonly ageOverlaySelector = "#age-confirmation";
  private static readonly actionDelayMs = 500;

  private readonly ageGateDiagnostics: AgeGateDiagnostics = {
    wasShown: false,
    clicked: false,
    clickCount: 0
  };

  private readonly consoleMessages: BrowserConsoleMessage[] = [];
  private readonly pageErrors: string[] = [];
  private readonly failedRequests: FailedRequestDiagnostics[] = [];
  private keyPointPrefix = "[game]";

  constructor(private readonly page: Page) {}

  setKeyPointPrefix(testTitle: string): void {
    this.keyPointPrefix = `[game:${testTitle}]`;
  }

  private logKeyPoint(message: string): void {
    console.log(`${this.keyPointPrefix} ${message}`);
  }

  get resolvedUrl(): string {
    return buildAutotestUrl(resolveBaseUrl(), env.extraQuery);
  }

  async open(): Promise<void> {
    this.logKeyPoint(`open ${this.resolvedUrl}`);
    await this.page.goto(this.resolvedUrl, {
      waitUntil: "domcontentloaded"
    });
    this.logKeyPoint("domcontentloaded");
  }

  async waitReady(): Promise<void> {
    this.logKeyPoint(`waitReady timeout=${env.readyTimeoutMs}ms`);
    const deadline = Date.now() + env.readyTimeoutMs;
    let autotestStoreSeen = false;

    while (Date.now() < deadline) {
      await this.dismissAgeGateIfPresent();

      const hasStore = await hasAutotestStore(this.page);
      if (hasStore && !autotestStoreSeen) {
        autotestStoreSeen = true;
        this.logKeyPoint("__autotest detected");
      }

      if (await hasEvent(this.page, {
        source: "app",
        type: "ready"
      })) {
        this.logKeyPoint("app.ready received");
        return;
      }

      await this.page.waitForTimeout(env.pollIntervalMs);
    }

    this.logKeyPoint("ready wait loop expired");

    if (!autotestStoreSeen) {
      await waitForAutotestStore(this.page, 1000);
    }

    await waitForEvent(
      this.page,
      {
        source: "app",
        type: "ready"
      },
      1000
    );
  }

  async dismissAgeGateIfPresent(): Promise<boolean> {
    const confirmButton = this.page.locator(GameSession.ageConfirmSelector);

    if (!(await confirmButton.isVisible().catch(() => false))) {
      return false;
    }

    this.ageGateDiagnostics.wasShown = true;
    this.ageGateDiagnostics.clicked = true;
    this.ageGateDiagnostics.clickCount += 1;
    this.logKeyPoint("age gate detected, clicking confirm");

    await confirmButton.click();

    await this.page
      .locator(GameSession.ageOverlaySelector)
      .waitFor({ state: "hidden", timeout: 15000 })
      .catch(() => undefined);

    this.ageGateDiagnostics.overlayHiddenAfterClick = await this.page
      .locator(GameSession.ageOverlaySelector)
      .isHidden()
      .catch(() => false);

    this.logKeyPoint(
      `age gate processed hidden=${String(this.ageGateDiagnostics.overlayHiddenAfterClick)}`
    );

    return true;
  }

  getAgeGateDiagnostics(): AgeGateDiagnostics {
    return { ...this.ageGateDiagnostics };
  }

  trackRuntimeDiagnostics(testInfo: TestInfo, options: BrowserLoggingOptions): void {
    this.page.on("console", (message) => {
      const consoleMessage = {
        type: message.type(),
        text: message.text(),
        location: message.location()
      };
      this.consoleMessages.push(consoleMessage);

      if (options.liveConsole) {
        const prefix = `[browser:${testInfo.title}]`;
        console.log(`${prefix} ${consoleMessage.type}: ${consoleMessage.text}`);
      }
    });

    this.page.on("pageerror", (error) => {
      const renderedError = String(error);
      this.pageErrors.push(renderedError);

      if (options.liveConsole) {
        console.log(`[browser:${testInfo.title}] pageerror: ${renderedError}`);
      }
    });

    this.page.on("requestfailed", (request) => {
      const failedRequest = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failureText: request.failure()?.errorText ?? "unknown"
      };
      this.failedRequests.push(failedRequest);

      if (options.liveConsole) {
        console.log(
          `[browser:${testInfo.title}] requestfailed: ${failedRequest.method} ${failedRequest.url} [${failedRequest.resourceType}] -> ${failedRequest.failureText}`
        );
      }
    });
  }

  getPageDiagnostics(): PageDiagnostics {
    return {
      ageGate: this.getAgeGateDiagnostics(),
      consoleMessages: [...this.consoleMessages],
      pageErrors: [...this.pageErrors],
      failedRequests: [...this.failedRequests]
    };
  }

  async getEvents(): Promise<AutotestEvent[]> {
    return getEvents(this.page);
  }

  async hasEvent(filter: EventFilter): Promise<boolean> {
    return hasEvent(this.page, filter);
  }

  async waitScreenOpened(screen: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "ui",
      type: "screen_opened",
      screen
    }, env.eventTimeoutMs);
  }

  async waitDialogOpened(dialog: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "ui",
      type: "dialog_opened",
      dialog
    }, env.eventTimeoutMs);
  }

  async waitDialogClosed(dialog: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "ui",
      type: "dialog_closed",
      dialog
    }, env.eventTimeoutMs);
  }

  async waitTutorMainStarted(): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "main_started"
    }, env.eventTimeoutMs);
  }

  async waitTutorSituationalStarted(): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "situational_started"
    }, env.eventTimeoutMs);
  }

  async waitTutorStepStarted(stepId: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "step_started",
      stepId
    }, env.eventTimeoutMs);
  }

  async waitTutorReplicaShown(stepId?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "replica_shown",
      ...(stepId ? { stepId } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorReplicaHidden(stepId?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "replica_hidden",
      ...(stepId ? { stepId } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorPointerShown(): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "pointer_shown"
    }, env.eventTimeoutMs);
  }

  async waitTutorIntroStarted(name?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "intro_started",
      ...(name ? { name } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorIntroCompleted(name?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "intro_completed",
      ...(name ? { name } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorHighlightRequested(name?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "highlight_requested",
      ...(name ? { name } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorEvent(eventName: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "event_emitted",
      name: eventName
    }, env.eventTimeoutMs);
  }

  async waitTutorActionExecuted(actionName?: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "action_executed",
      ...(actionName ? { name: actionName } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorStepSaved(stepId: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "step_saved",
      stepId
    }, env.eventTimeoutMs);
  }

  async waitTutorStepCompleted(stepId: string): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "step_completed",
      stepId
    }, env.eventTimeoutMs);
  }

  async waitTutorCompleted(): Promise<void> {
    await waitForEvent(this.page, {
      source: "tutor",
      type: "completed"
    }, env.eventTimeoutMs);
  }

  async clickAt(x: number, y: number): Promise<void> {
    await this.page.waitForTimeout(GameSession.actionDelayMs);
    await clickAt(this.page, x, y);
  }

  async waitMs(timeoutMs: number): Promise<void> {
    await this.page.waitForTimeout(timeoutMs);
  }
}

export const test = base.extend<{ game: GameSession }>({
  game: async ({ page }, use, testInfo) => {
    const game = new GameSession(page);
    game.setKeyPointPrefix(testInfo.title);
    game.trackRuntimeDiagnostics(testInfo, {
      liveConsole: env.browserConsoleLive,
      attachOnSuccess: env.browserLogsOnSuccess
    });
    await use(game);
    await attachAutotestSnapshot(page, testInfo, game.getPageDiagnostics(), {
      attachOnSuccess: env.browserLogsOnSuccess
    });
  }
});

export { expect } from "@playwright/test";
