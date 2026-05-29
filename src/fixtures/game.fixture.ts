import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { env, resolveBaseUrl } from "../config/env";
import type { AutotestEvent, EventFilter } from "../types/autotest";
import { clickAt } from "../helpers/clicks";
import {
  getEvents,
  hasEvent,
  waitForAutotestStore,
  waitForEvent
} from "../helpers/autotest";
import { attachAutotestSnapshot } from "../helpers/reporting";
import { buildAutotestUrl } from "../helpers/urls";

export class GameSession {
  constructor(private readonly page: Page) {}

  get resolvedUrl(): string {
    return buildAutotestUrl(resolveBaseUrl(), env.extraQuery);
  }

  async open(): Promise<void> {
    await this.page.goto(this.resolvedUrl, {
      waitUntil: "domcontentloaded"
    });
  }

  async waitReady(): Promise<void> {
    await waitForAutotestStore(this.page, env.readyTimeoutMs);
    await waitForEvent(
      this.page,
      {
        source: "app",
        type: "ready"
      },
      env.readyTimeoutMs
    );
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
    await clickAt(this.page, x, y);
  }
}

export const test = base.extend<{ game: GameSession }>({
  game: async ({ page }, use, testInfo) => {
    const game = new GameSession(page);
    await use(game);
    await attachAutotestSnapshot(page, testInfo);
  }
});

export { expect } from "@playwright/test";
