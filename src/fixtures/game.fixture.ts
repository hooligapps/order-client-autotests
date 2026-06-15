import { test as base } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { env, resolveBaseUrl } from "../config/env";
import type {
  AgeGateDiagnostics,
  AutotestEvent,
  BattleAbilityActivation,
  BattleMoveAdvice,
  ChatAnswerTarget,
  BrowserLoggingOptions,
  BrowserConsoleMessage,
  EventFilter,
  FailedRequestDiagnostics,
  PageDiagnostics
} from "../types/autotest";
import { clickAt } from "../helpers/clicks";
import {
  getEvents,
  getLastEvent,
  hasAutotestStore,
  hasEvent,
  hasEventAfter,
  waitForAutotestStore,
  waitForEvent,
  waitForEventAfter
} from "../helpers/autotest";
import { attachAutotestSnapshot } from "../helpers/reporting";
import { buildAutotestUrl } from "../helpers/urls";

function matchesFilter(event: AutotestEvent, filter: EventFilter): boolean {
  return Object.entries(filter).every(([key, expectedValue]) => {
    return event[key as keyof EventFilter] === expectedValue;
  });
}

function parsePayload(payload: string | null | undefined): Record<string, string> {
  if (!payload) {
    return {};
  }

  return payload
    .split(";")
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      acc[key] = value;
      return acc;
    }, {});
}

export class GameSession {
  private static readonly ageConfirmSelector = "#age-confirm-btn";
  private static readonly ageOverlaySelector = "#age-confirmation";
  private static readonly actionDelayMs = 150;

  private readonly ageGateDiagnostics: AgeGateDiagnostics = {
    wasShown: false,
    clicked: false,
    clickCount: 0
  };

  private readonly consoleMessages: BrowserConsoleMessage[] = [];
  private readonly pageErrors: string[] = [];
  private readonly failedRequests: FailedRequestDiagnostics[] = [];
  private keyPointPrefix = "[game]";
  private eventSegmentStartSequence = 0;

  constructor(private readonly page: Page) {}

  setKeyPointPrefix(testTitle: string): void {
    this.keyPointPrefix = `[game:${testTitle}]`;
  }

  private logKeyPoint(message: string): void {
    console.log(`${this.keyPointPrefix} ${message}`);
  }


  private describeFilter(filter: EventFilter): string {
    return Object.entries(filter)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(" ");
  }

  private describeEvent(event: AutotestEvent): string {
    const details = this.describeFilter({
      source: event.source,
      type: event.type,
      ...(event.name ? { name: event.name } : {}),
      ...(event.stepId ? { stepId: event.stepId } : {}),
      ...(event.screen ? { screen: event.screen } : {}),
      ...(event.dialog ? { dialog: event.dialog } : {})
    });

    return `${details} seq=${String(event.sequence)}`;
  }

  private effectiveAfterSequence(afterSequence = 0): number {
    return Math.max(afterSequence, this.eventSegmentStartSequence);
  }

  private async waitForFilter(filter: EventFilter, timeoutMs = env.eventTimeoutMs): Promise<AutotestEvent> {
    const effectiveAfter = this.effectiveAfterSequence();

    if (effectiveAfter > 0) {
      this.logKeyPoint(`wait ${this.describeFilter(filter)} after=${String(effectiveAfter)} timeout=${String(timeoutMs)}ms`);
      const event = await waitForEventAfter(this.page, filter, effectiveAfter, timeoutMs);
      this.logKeyPoint(`got ${this.describeEvent(event)}`);
      return event;
    }

    this.logKeyPoint(`wait ${this.describeFilter(filter)} timeout=${String(timeoutMs)}ms`);
    const event = await waitForEvent(this.page, filter, timeoutMs);
    this.logKeyPoint(`got ${this.describeEvent(event)}`);
    return event;
  }

  private async waitForFilterAfter(filter: EventFilter, afterSequence: number, timeoutMs = env.eventTimeoutMs): Promise<AutotestEvent> {
    const effectiveAfter = this.effectiveAfterSequence(afterSequence);
    this.logKeyPoint(`wait ${this.describeFilter(filter)} after=${String(effectiveAfter)} timeout=${String(timeoutMs)}ms`);
    const event = await waitForEventAfter(this.page, filter, effectiveAfter, timeoutMs);
    this.logKeyPoint(`got ${this.describeEvent(event)}`);
    return event;
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
    const events = await getEvents(this.page);
    return events.filter((event) => event.sequence > this.eventSegmentStartSequence);
  }

  async hasEvent(filter: EventFilter): Promise<boolean> {
    if (this.eventSegmentStartSequence > 0) {
      return hasEventAfter(this.page, filter, this.eventSegmentStartSequence);
    }

    return hasEvent(this.page, filter);
  }

  async checkpoint(): Promise<number> {
    return (await getLastEvent(this.page))?.sequence ?? 0;
  }

  async startEventSegment(afterSequence?: number, label?: string): Promise<number> {
    const sequence = afterSequence ?? await this.checkpoint();
    this.eventSegmentStartSequence = sequence;
    this.logKeyPoint(`segment start after=${String(sequence)}${label ? ` label=${label}` : ""}`);

    await this.page.evaluate((minSequence) => {
      const store = window.__autotest;
      if (!store?.events) {
        return;
      }

      store.events = store.events.filter((event) => (event.sequence ?? 0) > minSequence);
    }, sequence);

    return sequence;
  }

  async hasEventAfter(filter: EventFilter, afterSequence: number): Promise<boolean> {
    return hasEventAfter(this.page, filter, this.effectiveAfterSequence(afterSequence));
  }

  async waitEventAfter(filter: EventFilter, afterSequence: number, timeoutMs = env.eventTimeoutMs): Promise<AutotestEvent> {
    return this.waitForFilterAfter(filter, afterSequence, timeoutMs);
  }

  async waitAnyEventAfter(filters: EventFilter[], afterSequence: number, timeoutMs = env.eventTimeoutMs): Promise<AutotestEvent> {
    const effectiveAfter = this.effectiveAfterSequence(afterSequence);
    this.logKeyPoint(`wait any after=${String(effectiveAfter)} timeout=${String(timeoutMs)}ms :: ${filters.map((filter) => this.describeFilter(filter)).join(" || ")}`);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const events = await this.getEvents();
      const matched = events
        .filter((event) => event.sequence > effectiveAfter && filters.some((filter) => matchesFilter(event, filter)))
        .sort((a, b) => a.sequence - b.sequence)[0];

      if (matched) {
        this.logKeyPoint(`got ${this.describeEvent(matched)}`);
        return matched;
      }

      await this.waitMs(env.pollIntervalMs);
    }

    throw new Error(`Timed out after ${String(timeoutMs)}ms waiting for any of ${JSON.stringify(filters)} after sequence ${String(afterSequence)}`);
  }

  async waitBattleMoveAdviceAfter(afterSequence: number): Promise<{ event: AutotestEvent; advice: BattleMoveAdvice }> {
    const event = await this.waitEventAfter({
      source: "battle",
      type: "move_advice"
    }, afterSequence);

    const payload = parsePayload(event.payload);
    const advice: BattleMoveAdvice = {
      fromCol: Number(payload.fromCol),
      fromRow: Number(payload.fromRow),
      toCol: Number(payload.toCol),
      toRow: Number(payload.toRow),
      fromScreenX: Number(payload.fromScreenX),
      fromScreenY: Number(payload.fromScreenY),
      toScreenX: Number(payload.toScreenX),
      toScreenY: Number(payload.toScreenY),
      fromType: payload.fromType,
      toType: payload.toType,
      fromState: payload.fromState,
      toState: payload.toState
    };

    this.logKeyPoint(`move_advice ${advice.fromCol},${advice.fromRow} -> ${advice.toCol},${advice.toRow}`);
    return { event, advice };
  }

  async waitBattleAbilityActivatedAfter(
    afterSequence: number,
    stepId?: string
  ): Promise<{ event: AutotestEvent; activation: BattleAbilityActivation }> {
    const event = await this.waitEventAfter({
      source: "battle",
      type: "ability_activated",
      name: "HeroAbilityActivated",
      ...(stepId ? { stepId } : {})
    }, afterSequence);

    const payload = parsePayload(event.payload);
    const activation: BattleAbilityActivation = {
      x: Number(payload.screenX ?? payload.x),
      y: Number(payload.screenY ?? payload.y),
      ...(payload.cardConfigId ? { cardConfigId: Number(payload.cardConfigId) } : {}),
      ...(payload.abilityId ? { abilityId: Number(payload.abilityId) } : {})
    };

    this.logKeyPoint(
      `ability_activated x=${String(activation.x)} y=${String(activation.y)}`
      + (activation.cardConfigId !== undefined ? ` cardConfigId=${String(activation.cardConfigId)}` : "")
      + (activation.abilityId !== undefined ? ` abilityId=${String(activation.abilityId)}` : "")
    );

    return { event, activation };
  }

  async waitChatAnswerReadyAfter(
    afterSequence: number,
    stepId?: string,
    timeoutMs = env.eventTimeoutMs
  ): Promise<{ event: AutotestEvent; target: ChatAnswerTarget }> {
    const event = await this.waitForFilterAfter({
      source: "chat",
      type: "answer_ready",
      name: "ChatAnswerReady",
      ...(stepId ? { stepId } : {})
    }, afterSequence, timeoutMs);

    const payload = parsePayload(event.payload);
    const target: ChatAnswerTarget = {
      x: Number(payload.screenX ?? payload.x),
      y: Number(payload.screenY ?? payload.y),
      ...(payload.answerIndex ? { answerIndex: Number(payload.answerIndex) } : {})
    };

    this.logKeyPoint(
      `chat_answer_ready x=${String(target.x)} y=${String(target.y)}`
      + (target.answerIndex !== undefined ? ` answerIndex=${String(target.answerIndex)}` : "")
    );

    return { event, target };
  }

  async waitBattleAbilityReadyAfter(
    afterSequence: number,
    stepId?: string,
    timeoutMs = env.eventTimeoutMs
  ): Promise<{ event: AutotestEvent; activation: BattleAbilityActivation }> {
    const event = await this.waitForFilterAfter({
      source: "battle",
      type: "ability_ready",
      name: "HeroAbilityReady",
      ...(stepId ? { stepId } : {})
    }, afterSequence, timeoutMs);

    const payload = parsePayload(event.payload);
    const activation: BattleAbilityActivation = {
      x: Number(payload.screenX ?? payload.x),
      y: Number(payload.screenY ?? payload.y),
      ...(payload.cardConfigId ? { cardConfigId: Number(payload.cardConfigId) } : {}),
      ...(payload.abilityId ? { abilityId: Number(payload.abilityId) } : {})
    };

    this.logKeyPoint(
      `ability_ready x=${String(activation.x)} y=${String(activation.y)}`
      + (activation.cardConfigId !== undefined ? ` cardConfigId=${String(activation.cardConfigId)}` : "")
      + (activation.abilityId !== undefined ? ` abilityId=${String(activation.abilityId)}` : "")
    );

    return { event, activation };
  }

  private async mapUnityScreenToPageCoords(x: number, y: number): Promise<{ x: number; y: number }> {
    return this.page.evaluate(({ screenX, screenY }) => {
      const canvas = document.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        return { x: screenX, y: screenY };
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? rect.width / canvas.width : 1;
      const scaleY = rect.height > 0 ? rect.height / canvas.height : 1;

      return {
        x: rect.left + screenX * scaleX,
        y: rect.top + screenY * scaleY
      };
    }, { screenX: x, screenY: y });
  }

  async playBattleMoveAdvice(advice: BattleMoveAdvice): Promise<void> {
    const fromPoint = await this.mapUnityScreenToPageCoords(advice.fromScreenX, advice.fromScreenY);
    const toPoint = await this.mapUnityScreenToPageCoords(advice.toScreenX, advice.toScreenY);
    this.logKeyPoint(
      `battle_click x=${fromPoint.x.toFixed(0)} y=${fromPoint.y.toFixed(0)} -> x=${toPoint.x.toFixed(0)} y=${toPoint.y.toFixed(0)}`
    );
    await clickAt(this.page, fromPoint.x, fromPoint.y);
    await this.page.waitForTimeout(50);
    await clickAt(this.page, toPoint.x, toPoint.y);
  }

  async clickUnityScreenPoint(x: number, y: number): Promise<void> {
    const point = await this.mapUnityScreenToPageCoords(x, y);
    this.logKeyPoint(`battle_click_point x=${point.x.toFixed(0)} y=${point.y.toFixed(0)} from unity x=${String(x)} y=${String(y)}`);
    await clickAt(this.page, point.x, point.y);
  }

  async playBattleMoveAdviceAfter(afterSequence: number): Promise<{ event: AutotestEvent; advice: BattleMoveAdvice }> {
    const result = await this.waitBattleMoveAdviceAfter(afterSequence);
    await this.playBattleMoveAdvice(result.advice);
    return result;
  }

  async waitScreenOpened(screen: string): Promise<void> {
    await this.waitForFilter({
      source: "ui",
      type: "screen_opened",
      screen
    }, env.eventTimeoutMs);
  }

  async waitDialogOpened(dialog: string): Promise<void> {
    await this.waitForFilter({
      source: "ui",
      type: "dialog_opened",
      dialog
    }, env.eventTimeoutMs);
  }

  async waitDialogClosed(dialog: string): Promise<void> {
    await this.waitForFilter({
      source: "ui",
      type: "dialog_closed",
      dialog
    }, env.eventTimeoutMs);
  }

  async waitTutorMainStarted(): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "main_started"
    }, env.eventTimeoutMs);
  }

  async waitTutorSituationalStarted(): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "situational_started"
    }, env.eventTimeoutMs);
  }

  async waitTutorStepStarted(stepId: string): Promise<AutotestEvent> {
    const event = await this.waitForFilter({
      source: "tutor",
      type: "step_started",
      stepId
    }, env.eventTimeoutMs);

    await this.startEventSegment(event.sequence, `step:${stepId}`);
    return event;
  }

  async waitTutorReplicaShown(stepId?: string, afterSequence?: number): Promise<AutotestEvent> {
    const filter: EventFilter = {
      source: "tutor",
      type: "replica_shown",
      ...(stepId ? { stepId } : {})
    };

    if (afterSequence !== undefined) {
      return this.waitForFilterAfter(filter, afterSequence, env.eventTimeoutMs);
    }

    return this.waitForFilter(filter, env.eventTimeoutMs);
  }

  async waitTutorReplicaHidden(stepId?: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "replica_hidden",
      ...(stepId ? { stepId } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorPointerShown(): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "pointer_shown"
    }, env.eventTimeoutMs);
  }

  async waitTutorIntroStarted(name?: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "intro_started",
      ...(name ? { name } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorIntroCompleted(name?: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "intro_completed",
      ...(name ? { name } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorHighlightRequested(name?: string, stepId?: string, afterSequence?: number): Promise<void> {
    const filter: EventFilter = {
      source: "tutor",
      type: "highlight_requested",
      ...(name ? { name } : {}),
      ...(stepId ? { stepId } : {})
    };

    if (afterSequence !== undefined) {
      await this.waitForFilterAfter(filter, afterSequence, env.eventTimeoutMs);
      return;
    }

    await this.waitForFilter(filter, env.eventTimeoutMs);
  }

  async waitTutorEvent(eventName: string, stepId?: string, afterSequence?: number): Promise<void> {
    const filter: EventFilter = {
      source: "tutor",
      type: "event_emitted",
      name: eventName,
      ...(stepId ? { stepId } : {})
    };

    if (afterSequence !== undefined) {
      await this.waitForFilterAfter(filter, afterSequence, env.eventTimeoutMs);
      return;
    }

    await this.waitForFilter(filter, env.eventTimeoutMs);
  }

  async waitTutorActionExecuted(actionName?: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "action_executed",
      ...(actionName ? { name: actionName } : {})
    }, env.eventTimeoutMs);
  }

  async waitTutorStepSaved(stepId: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "step_saved",
      stepId
    }, env.eventTimeoutMs);
  }

  async waitTutorStepCompleted(stepId: string): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "step_completed",
      stepId
    }, env.eventTimeoutMs);
  }

  async waitTutorCompleted(): Promise<void> {
    await this.waitForFilter({
      source: "tutor",
      type: "completed"
    }, env.eventTimeoutMs);
  }

  async clickAt(x: number, y: number): Promise<void> {
    this.logKeyPoint(`click x=${x.toFixed(0)} y=${y.toFixed(0)}`);
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
