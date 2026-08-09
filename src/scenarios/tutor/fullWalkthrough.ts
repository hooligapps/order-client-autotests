import type { GameSession } from "../../fixtures/game.fixture";
import type { AutotestEvent, BattleMoveAdvice, EventFilter } from "../../types/autotest";
import { matchesFilter } from "../../helpers/autotest";
import { introCoords, tutorCoords, tutorTimings, walkthroughCoords, type Point } from "./coords";
import { bootstrapTutorWalkthrough } from "./walkthrough";

function getCallerClickLabel(): string {
  const stack = new Error().stack?.split("\n") ?? [];
  const callerFrame = stack[3] ?? stack[2] ?? "";
  const match = callerFrame.match(/([^/]+\.(?:ts|js):\d+:\d+)/);
  return match?.[1] ?? "unknown";
}

async function click(game: GameSession, point: Point, label?: string): Promise<void> {
  await game.clickAt(point.x, point.y, label ?? point.label ?? getCallerClickLabel());
}

async function clickTarget(game: GameSession, target: keyof typeof tutorCoords): Promise<void> {
  await click(game, tutorCoords[target]);
}

async function clickTargetUntilTutorProgress(
  game: GameSession,
  target: keyof typeof tutorCoords,
  stepId: string,
  actionName: string,
  maxAttempts = 3
): Promise<{ matchEvent: AutotestEvent, actionEvent: AutotestEvent }> {
  const matchFilter: EventFilter = {
    source: "tutor",
    type: "event_emitted",
    name: "Match3HeroTurn",
    stepId
  };
  const actionFilter: EventFilter = {
    source: "tutor",
    type: "action_executed",
    name: actionName,
    stepId
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sequence = await game.checkpointAndClickAt(
      tutorCoords[target].x,
      tutorCoords[target].y,
      `target:${target}`
    );

    try {
      const firstEvent = await game.waitAnyEventAfter([matchFilter, actionFilter], sequence, 2500);
      const matchEvent = firstEvent.name === "Match3HeroTurn"
        ? firstEvent
        : await game.waitEventAfter(matchFilter, sequence, 5000);
      const actionEvent = firstEvent.name === actionName
        ? firstEvent
        : await game.waitEventAfter(actionFilter, sequence, 5000);

      return { matchEvent, actionEvent };
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error(`Failed to activate ${actionName}`);
}

async function clickPointUntilEventProgress(
  game: GameSession,
  point: Point,
  filters: EventFilter[],
  maxAttempts = 3,
  timeoutMs = 5000,
  label?: string
): Promise<AutotestEvent> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sequence = await game.checkpointAndClickAt(point.x, point.y, label ?? point.label ?? getCallerClickLabel());

    try {
      return await game.waitAnyEventAfter(filters, sequence, timeoutMs);
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Failed to progress after point click");
}

type TutorStepStart = {
  stepStarted: AutotestEvent,
  firstReplica: AutotestEvent,
};

type ReadyBattleAbility = {
  key: string,
  point: { x: number; y: number },
  sequence: number,
};

const mirroredBattleAbilitySteps = new Set(["BattleTower4"]);

function normalizeBattleAbilityUnityPoint(stepId: string | undefined, x: number, y: number): { x: number; y: number } {
  const normalizedX = mirroredBattleAbilitySteps.has(stepId ?? "")
    ? Math.min(x, 1279 - x)
    : x;

  return {
    x: Math.max(0, Math.min(1279, normalizedX)),
    y: Math.max(0, Math.min(719, y))
  };
}

async function beginTutorStep(game: GameSession, stepId: string): Promise<TutorStepStart> {
  const stepStarted = await game.waitTutorStepStarted(stepId);
  const firstReplica = await game.waitTutorReplicaShown(stepId, stepStarted.sequence);
  return { stepStarted, firstReplica };
}

function parseAutotestPayload(payload: string | null | undefined): Record<string, string> {
  if (!payload) return {};

  return payload
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split("=");
      if (key && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function getReadyBattleAbility(event: AutotestEvent): ReadyBattleAbility | null {
  if (event.source !== "battle" || event.type !== "ability_ready" || event.name !== "HeroAbilityReady") {
    return null;
  }

  const payload = parseAutotestPayload(event.payload);
  const x = Number(payload.screenX ?? payload.x);
  const y = Number(payload.screenY ?? payload.y);
  const cardConfigId = payload.cardConfigId ?? "unknown";
  const abilityId = payload.abilityId ?? "unknown";

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const normalizedPoint = normalizeBattleAbilityUnityPoint(event.stepId ?? undefined, x, y);

  return {
    key: `${cardConfigId}:${abilityId}`,
    point: normalizedPoint,
    sequence: event.sequence
  };
}

function getBattleMoveAdvice(event: AutotestEvent): { event: AutotestEvent, advice: BattleMoveAdvice } | null {
  if (event.source !== "battle" || event.type !== "move_advice") {
    return null;
  }

  const payload = parseAutotestPayload(event.payload);
  return {
    event,
    advice: {
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
    }
  };
}

function upsertReadyBattleAbility(queue: ReadyBattleAbility[], ability: ReadyBattleAbility): void {
  const existingIndex = queue.findIndex((item) =>
    item.key === ability.key
    && item.point.x === ability.point.x
    && item.point.y === ability.point.y
  );
  if (existingIndex >= 0) {
    return;
  }

  queue.push(ability);
}

async function tryUseBattleAbilityPoint(
  game: GameSession,
  stepId: string,
  point: { x: number; y: number },
  sourceLabel: string,
  abilityKey?: string,
  pointSpace: "page" | "unity" = "page"
): Promise<AutotestEvent | null> {
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const sequence = await game.checkpoint();
      if (pointSpace === "unity") {
        await game.clickUnityScreenPoint(point.x, point.y, `ability:${sourceLabel}:${stepId}`);
      } else {
        await click(game, point, `ability:${sourceLabel}:${stepId}`);
      }

      try {
        return await game.waitAnyEventAfter(
          [{ source: "tutor", type: "event_emitted", name: "UseBattleAbility", stepId }],
          sequence,
          2500
        );
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function tryUseQueuedBattleAbility(
  game: GameSession,
  stepId: string,
  readyAbility: ReadyBattleAbility | null,
  fallbackPoint?: { x: number; y: number },
  preferFallback = false
): Promise<AutotestEvent | null> {
  if (preferFallback && fallbackPoint) {
    const fallbackUse = await tryUseBattleAbilityPoint(
      game,
      stepId,
      fallbackPoint,
      "fallback",
      readyAbility?.key
    );
    if (fallbackUse) {
      return fallbackUse;
    }
  }

  if (readyAbility) {
    const readyUse = await tryUseBattleAbilityPoint(
      game,
      stepId,
      readyAbility.point,
      "ready",
      readyAbility.key,
      "unity"
    );
    if (readyUse) {
      return readyUse;
    }
  }

  if (!preferFallback && fallbackPoint) {
    return tryUseBattleAbilityPoint(
      game,
      stepId,
      fallbackPoint,
      "fallback",
      readyAbility?.key
    );
  }

  return null;
}

async function runBattleTurnsWithAbilityQueue(
  game: GameSession,
  stepId: string,
  initialBoundary: number,
  options?: {
    fallbackPoint?: { x: number; y: number },
    preferFallbackForAbility?: boolean,
    replicaHandler?: (event: AutotestEvent) => Promise<number>,
    extraFilters?: EventFilter[],
  }
): Promise<number> {
  let turnBoundary = initialBoundary;
  const readyQueue: ReadyBattleAbility[] = [];
  const triedThisHeroTurn = new Set<string>();

  while (true) {
    const nextEvent = await game.waitAnyEventAfter([
      { source: "battle", type: "ability_ready", name: "HeroAbilityReady", stepId },
      { source: "battle", type: "move_advice", stepId },
      { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId },
      { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated", stepId },
      { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn", stepId },
      { source: "tutor", type: "event_emitted", name: "BattleEndHeroTurn", stepId },
      { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn", stepId },
      ...(options?.extraFilters ?? [])
    ], turnBoundary);

    if (nextEvent.source === "tutor" && nextEvent.type === "event_emitted" && nextEvent.name === "BattleEnemyDefeated") {
      return nextEvent.sequence;
    }

    if (nextEvent.source === "tutor" && nextEvent.type === "event_emitted" && nextEvent.name === "BattleStartHeroTurn") {
      triedThisHeroTurn.clear();
      turnBoundary = nextEvent.sequence;
      continue;
    }

    if (nextEvent.source === "tutor" && nextEvent.type === "event_emitted" && nextEvent.name === "Match3HeroTurn") {
      turnBoundary = nextEvent.sequence;
      continue;
    }

    if (nextEvent.source === "tutor" && nextEvent.type === "event_emitted" && nextEvent.name === "BattleEndEnemyTurn") {
      turnBoundary = nextEvent.sequence;
      continue;
    }

    if (nextEvent.source === "tutor" && nextEvent.type === "event_emitted" && nextEvent.name === "BattleEndHeroTurn") {
      turnBoundary = nextEvent.sequence;
      continue;
    }

    if (nextEvent.source === "battle" && nextEvent.type === "ability_ready" && nextEvent.name === "HeroAbilityReady") {
      const readyAbility = getReadyBattleAbility(nextEvent);
      if (readyAbility) {
        upsertReadyBattleAbility(readyQueue, readyAbility);
      }
      turnBoundary = nextEvent.sequence;
      continue;
    }

    if (nextEvent.source === "battle" && nextEvent.type === "move_advice") {
      const nextReadyAbility = readyQueue.find((ability) => !triedThisHeroTurn.has(`${ability.key}@${ability.point.x},${ability.point.y}`));
      if (nextReadyAbility) {
        const useAbility = await tryUseQueuedBattleAbility(
          game,
          stepId,
          nextReadyAbility,
          options?.fallbackPoint,
          options?.preferFallbackForAbility ?? false
        );

        const readyAbilitySignature = `${nextReadyAbility.key}@${nextReadyAbility.point.x},${nextReadyAbility.point.y}`;
        triedThisHeroTurn.add(readyAbilitySignature);

        if (useAbility) {
          await game.waitBattleAbilityActivatedAfter(useAbility.sequence, stepId);
          const abilityUsed = await game.waitEventAfter(
            { source: "tutor", type: "event_emitted", name: "BattleAbilityUsed", stepId },
            useAbility.sequence
          );

          const usedIndex = readyQueue.findIndex((ability) =>
            ability.key === nextReadyAbility.key
            && ability.point.x === nextReadyAbility.point.x
            && ability.point.y === nextReadyAbility.point.y
          );
          if (usedIndex >= 0) {
            readyQueue.splice(usedIndex, 1);
          }

          turnBoundary = abilityUsed.sequence;
          continue;
        }
      }

      const moveAdvice = getBattleMoveAdvice(nextEvent);
      if (!moveAdvice) {
        turnBoundary = nextEvent.sequence;
        continue;
      }

      await game.playBattleMoveAdvice(moveAdvice.advice);
      const match = await game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "Match3HeroTurn", stepId },
        nextEvent.sequence
      );
      turnBoundary = match.sequence;
      continue;
    }

    if (options?.replicaHandler && nextEvent.source === "tutor" && nextEvent.type === "replica_shown") {
      triedThisHeroTurn.clear();
      turnBoundary = await options.replicaHandler(nextEvent);
      continue;
    }

    turnBoundary = nextEvent.sequence;
  }
}

async function skipIntroVideo(game: GameSession, name: string): Promise<void> {
  await game.waitTutorIntroStarted(name);
  await game.waitMs(tutorTimings.introReadyDelayMs);
  await click(game, introCoords.video);
  await game.waitMs(tutorTimings.introSkipDelayMs);
  await click(game, introCoords.skip);
  await game.waitTutorIntroCompleted(name);
}

async function closeGirlNewInfoDialog(
  game: GameSession,
  point: Point,
  options?: { waitForOpen?: boolean, waitForOpenAfterSequence?: number }
): Promise<AutotestEvent> {
  if (options?.waitForOpenAfterSequence !== undefined) {
    await game.waitEventAfter(
      { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
      options.waitForOpenAfterSequence
    );
  } else if (options?.waitForOpen) {
    const dialogAlreadyOpened = await game.hasEvent({
      source: "ui",
      type: "dialog_opened",
      dialog: "GirlNewInfoDialog"
    });

    if (!dialogAlreadyOpened) {
      const sequence = await game.checkpoint();
      await game.waitEventAfter(
        { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
        sequence
      );
    }
  }

  await game.waitMs(250);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const closeSequence = await game.checkpoint();
    await click(game, point);

    try {
      return await game.waitEventAfter(
        { source: "ui", type: "dialog_closed", dialog: "GirlNewInfoDialog" },
        closeSequence,
        1000
      );
    } catch {
      try {
        return await game.waitAnyEventAfter([
          { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
          { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown" },
          { source: "tutor", type: "event_emitted", name: "DashboardOpened" },
          { source: "tutor", type: "event_emitted", name: "DialogClosed" },
          { source: "tutor", type: "step_started" },
          { source: "ui", type: "screen_opened" }
        ], closeSequence, 1200);
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
      }
    }

    await game.waitMs(250);
  }

  throw new Error("GirlNewInfoDialog did not react to close clicks");
}

async function clickChatAnswerAt(game: GameSession, point: Point): Promise<void> {
  await click(game, point);
}

async function dismissContinueReplica(
  game: GameSession,
  stepId: string,
  point: Point | Point[],
  afterSequence: number,
  progressFilters?: EventFilter[]
): Promise<AutotestEvent> {
  const filters = progressFilters ?? [
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId }
  ];
  const points = Array.isArray(point) ? point : [point];

  const readyEvent = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ContinueMessageReady", stepId },
    afterSequence
  );

  await game.waitMs(250);

  let lastBoundary = readyEvent.sequence;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const pointToClick = points[attempt % points.length];
    const clickSequence = await game.checkpointAndClickAt(
      pointToClick.x,
      pointToClick.y,
      pointToClick.label ?? getCallerClickLabel()
    );

    try {
      return await game.waitAnyEventAfter(filters, Math.min(lastBoundary, clickSequence), 4000);
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      lastBoundary = Math.min(lastBoundary, clickSequence);
      await game.waitMs(350);
    }
  }

  return game.waitAnyEventAfter(filters, lastBoundary, 8000);
}

async function openChatPhoto(
  game: GameSession,
  stepId: string,
  point: Point,
  maxAttempts = 3,
  retryDelayMs = 300
): Promise<AutotestEvent> {
  const photoOpenedOrLaterFilters: EventFilter[] = [
    { source: "tutor", type: "event_emitted", name: "PhotoOpened", stepId },
    { source: "tutor", type: "event_emitted", name: "PhotoClosed", stepId },
    { source: "tutor", type: "highlight_requested", name: "chat_close_btn", stepId }
  ];

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const photoProgress = await game.clickAtAndWaitAnyEventAfter(
        point.x,
        point.y,
        [
          { source: "tutor", type: "event_emitted", name: "GalleryButtonClicked", stepId },
          { source: "tutor", type: "event_emitted", name: "PhotoOpen", stepId },
          { source: "tutor", type: "event_emitted", name: "PhotoOpened", stepId }
        ],
        2000,
        point.label ?? getCallerClickLabel()
      );

      if (photoProgress.name === "PhotoOpened"
        || photoProgress.name === "PhotoClosed"
        || photoProgress.name === "chat_close_btn") {
        return photoProgress;
      }

      return await game.waitAnyEventAfter(
        photoOpenedOrLaterFilters,
        photoProgress.sequence,
        5000
      );
    } catch {
      await game.waitMs(retryDelayMs);
    }
  }

  const sequence = await game.checkpoint();
  return game.waitAnyEventAfter(photoOpenedOrLaterFilters, sequence, 5000);
}

async function advanceChatAtUntilCompleted(
  game: GameSession,
  point: Point | Point[],
  afterSequence: number,
  stepId?: string,
  options?: {
    waitForAnswerReady?: boolean,
  }
): Promise<AutotestEvent> {
  const points = Array.isArray(point) ? point : [point];
  let boundary = afterSequence;

  for (let i = 0; i < 12; i += 1) {
    if (await game.hasEventAfter({ source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", ...(stepId ? { stepId } : {}) }, boundary)) {
      return game.waitEventAfter(
        { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", ...(stepId ? { stepId } : {}) },
        boundary
      );
    }

    if (options?.waitForAnswerReady) {
      const readyOrCompleted = await game.waitAnyEventAfter([
        { source: "chat", type: "answers_ready", name: "ChatAnswersReady", ...(stepId ? { stepId } : {}) },
        { source: "chat", type: "answer_ready", name: "ChatAnswerReady", ...(stepId ? { stepId } : {}) },
        { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", ...(stepId ? { stepId } : {}) }
      ], boundary, 10000);

      if (readyOrCompleted.source === "tutor") {
        return readyOrCompleted;
      }
    }

    const clickSequence = await game.checkpoint();
    await clickChatAnswerAt(game, points[i % points.length]);
    let nextEvent: AutotestEvent;
    try {
      nextEvent = await game.waitAnyEventAfter([
        { source: "chat", type: "answer_accepted", name: "ChatAnswerAccepted", ...(stepId ? { stepId } : {}) },
        { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", ...(stepId ? { stepId } : {}) }
      ], clickSequence, 5000);
    } catch {
      boundary = Math.max(boundary, clickSequence);
      continue;
    }

    boundary = nextEvent.sequence;
    if (nextEvent.source === "tutor") {
      return nextEvent;
    }
  }

  return game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatStoryCompleted", ...(stepId ? { stepId } : {}) },
    boundary
  );
}


async function useReadyHeroAbility(
  game: GameSession,
  stepId: string,
  readyAfterSequence: number,
  fallbackPoint: { x: number; y: number }
): Promise<{ useAbility: AutotestEvent; abilityUsed: AutotestEvent }> {
  const useAbility = await (async () => {
    try {
      const ready = await game.waitBattleAbilityReadyAfter(readyAfterSequence, stepId, 5000);
      const hasFiniteActivation =
        Number.isFinite(ready.activation.x)
        && Number.isFinite(ready.activation.y);

      if (hasFiniteActivation) {
        const readyUse = await tryUseBattleAbilityPoint(
          game,
          stepId,
          {
            x: Math.max(0, Math.min(1279, ready.activation.x)),
            y: Math.max(0, Math.min(719, ready.activation.y))
          },
          "ready",
          ready.activation.cardConfigId !== undefined || ready.activation.abilityId !== undefined
            ? `${String(ready.activation.cardConfigId ?? "unknown")}:${String(ready.activation.abilityId ?? "unknown")}`
            : undefined,
          "unity"
        );

        if (readyUse) {
          return readyUse;
        }
      }
    } catch {
      // Fallback click below handles missing or invalid ready events.
    }

    const sequence = await game.checkpoint();
    await click(game, fallbackPoint);
    return game.waitEventAfter(
      { source: "tutor", type: "event_emitted", name: "UseBattleAbility", stepId },
      sequence
    );
  })();

  await game.waitBattleAbilityActivatedAfter(useAbility.sequence, stepId);
  const abilityUsed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityUsed", stepId },
    useAbility.sequence
  );

  return { useAbility, abilityUsed };
}

async function levelUpUntilComplete(
  game: GameSession,
  stepId: string,
  point: Point | Point[],
  maxClicks = 12,
  terminalFilters: EventFilter[] = [
    { source: "tutor", type: "event_emitted", name: "GirlLevelUpComplete", stepId },
    { source: "tutor", type: "step_completed", stepId },
    { source: "ui", type: "dialog_closed", dialog: "GirlInfoDialog" }
  ]
): Promise<number> {
  const points = Array.isArray(point) ? point : [point];
  const afterSequence = await game.checkpoint();
  const perClickTimeoutMs = 5000;
  const retryCooldownMs = 1000;
  let lastSequence = afterSequence;

  for (let i = 0; i < maxClicks; i += 1) {
    for (const filter of terminalFilters) {
      if (await game.hasEventAfter(filter, lastSequence)) {
        return lastSequence;
      }
    }

    try {
      const pointToClick = points[i % points.length];
      const nextEvent = await game.clickAtAndWaitAnyEventAfter(
        pointToClick.x,
        pointToClick.y,
        [
          { source: "tutor", type: "event_emitted", name: "GirlLevelUp", stepId },
          ...terminalFilters
        ],
        perClickTimeoutMs,
        pointToClick.label ?? getCallerClickLabel()
      );

      lastSequence = nextEvent.sequence;
      if (terminalFilters.some((filter) => matchesFilter(nextEvent, filter))) {
        return lastSequence;
      }
    } catch {
      await game.waitMs(retryCooldownMs);
      continue;
    }

    await game.waitMs(retryCooldownMs);
  }

  const terminalEvent = await game.waitAnyEventAfter(terminalFilters, lastSequence);
  return terminalEvent.sequence;
}

async function runBattleTower1(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower1;

  await game.waitTutorStepStarted("BattleTower1");
  // await skipIntroVideo(game, "intro_1");
  // await skipIntroVideo(game, "intro_2");

  await game.waitTutorReplicaShown("BattleTower1");
  await game.waitTutorHighlightRequested("dashboard_battle_btn");

  let sequence = await game.checkpoint();
  const towerClick = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_battle_btn.x,
    tutorCoords.dashboard_battle_btn.y,
    { source: "tutor", type: "event_emitted", name: "TowerClick" },
    30_000,
    tutorCoords.dashboard_battle_btn.label
  );

  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    towerClick.sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    towerClick.sequence,
    60_000
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    battleStarted.sequence,
    60_000
  );

  const moveAdvice1 = await game.waitBattleMoveAdviceAfter(battleStarted.sequence);
  await game.playBattleMoveAdvice(moveAdvice1.advice);
  const match1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice1.event.sequence
  );
  const enemyTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match1.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    enemyTurn1.sequence
  );
  const heroTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn1.sequence
  );

  const moveAdvice2 = await game.waitBattleMoveAdviceAfter(heroTurn2.sequence);
  await game.playBattleMoveAdvice(moveAdvice2.advice);
  const match2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice2.event.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    match2.sequence
  );

  const heroTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    match2.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", name: "match3_elements_hint", stepId: "BattleTower1" },
    heroTurn3.sequence
  );
  const preHintMoveAdvice3 = await game.waitBattleMoveAdviceAfter(heroTurn3.sequence);
  const continueClicked = await game.clickAtAndWaitEventAfter(
    coords.continueMessage.x,
    coords.continueMessage.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.continueMessage.label
  );
  const hintHidden = await game.waitEventAfter(
    { source: "tutor", type: "action_executed", name: "HideMatch3ElementsHint", stepId: "BattleTower1" },
    continueClicked.sequence
  );
  let moveAdvice3 = preHintMoveAdvice3;
  try {
    moveAdvice3 = await game.waitBattleMoveAdviceAfter(hintHidden.sequence, 1500);
  } catch {
    // Some builds do not re-emit move_advice after the tutor hint closes.
  }
  await game.playBattleMoveAdvice(moveAdvice3.advice);
  const match3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice3.event.sequence
  );
  const battleWon = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated" },
    match3.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower1" },
    battleWon.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    battleWon.sequence
  );

  const postWinContinue = await game.clickAtAndWaitEventAfter(
    coords.postWinContinue.x,
    coords.postWinContinue.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.postWinContinue.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    postWinContinue.sequence
  );

  const winDialogClosed = await game.clickAtAndWaitEventAfter(
    tutorCoords.win_dialog_claim_btn.x,
    tutorCoords.win_dialog_claim_btn.y,
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
    30_000,
    tutorCoords.win_dialog_claim_btn.label ?? "win_dialog_claim_btn"
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower1" },
    winDialogClosed.sequence
  );

  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    winDialogClosed.sequence
  );

  const finalMessageContinue = await game.clickAtAndWaitEventAfter(
    coords.newGirlMessageContinue.x,
    coords.newGirlMessageContinue.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage" },
    30_000,
    coords.newGirlMessageContinue.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower1" },
    finalMessageContinue.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "BattleTower2" },
    finalMessageContinue.sequence
  );
}

async function runBattleTower2(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower2;

  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.firstNewGirlClose);
  const afterFirstGirlClose = await game.checkpoint();
  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    afterFirstGirlClose
  );
  const beforeSecondGirlClose = await game.checkpoint();
  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.secondNewGirlClose);
  const battleEnterShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown" },
    beforeSecondGirlClose
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    battleEnterShown.sequence
  );

  const deckChanged1 = await game.clickAtAndWaitEventAfter(
    coords.deckCard1.x,
    coords.deckCard1.y,
    { source: "tutor", type: "event_emitted", name: "DeckChanged" },
    30_000,
    coords.deckCard1.label
  );

  const deckChanged2 = await game.clickAtAndWaitEventAfter(
    coords.deckCard2.x,
    coords.deckCard2.y,
    { source: "tutor", type: "event_emitted", name: "DeckChanged" },
    30_000,
    coords.deckCard2.label
  );

  const deckIsFull = await game.clickAtAndWaitEventAfter(
    coords.deckCard3.x,
    coords.deckCard3.y,
    { source: "tutor", type: "event_emitted", name: "DeckIsFull" },
    30_000,
    coords.deckCard3.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    deckIsFull.sequence
  );

  const battleStartLoading = await game.clickAtAndWaitEventAfter(
    coords.fightButton.x,
    coords.fightButton.y,
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading" },
    30_000,
    coords.fightButton.label
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted" },
    battleStartLoading.sequence
  );
  const heroTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    battleStarted.sequence
  );

  const moveAdvice1 = await game.waitBattleMoveAdviceAfter(heroTurn1.sequence);
  await game.playBattleMoveAdvice(moveAdvice1.advice);
  const match1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice1.event.sequence
  );
  const enemyTurn1 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match1.sequence
  );
  const heroTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn1.sequence
  );
  const bombReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn2.sequence
  );
  await game.waitEventAfter(
    { source: "battle", type: "input_ready", name: "BattleBoardInputReady", stepId: "BattleTower2" },
    bombReplica.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "BattleTower2" },
    bombReplica.sequence
  );

  const { matchEvent: bombUsed, actionEvent: bombAction } = await clickTargetUntilTutorProgress(
    game,
    "interact_match3BoosterBomb",
    "BattleTower2",
    "ClickedOnBomb"
  );
  const enemyTurn2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    bombAction.sequence
  );
  const heroTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn2.sequence
  );
  const moveReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn3.sequence
  );
  await game.waitEventAfter(
    { source: "battle", type: "input_ready", name: "BattleBoardInputReady", stepId: "BattleTower2" },
    moveReplica.sequence
  );
  const moveAdvice2 = await game.waitBattleMoveAdviceAfter(heroTurn3.sequence);
  await game.playBattleMoveAdvice(moveAdvice2.advice);
  const match2 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "Match3HeroTurn" },
    moveAdvice2.event.sequence
  );
  const enemyTurn3 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEndEnemyTurn" },
    match2.sequence
  );
  const heroTurn4 = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartHeroTurn" },
    enemyTurn3.sequence
  );
  const flashReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    heroTurn4.sequence
  );
  await game.waitEventAfter(
    { source: "battle", type: "input_ready", name: "BattleBoardInputReady", stepId: "BattleTower2" },
    flashReplica.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "BattleTower2" },
    flashReplica.sequence
  );

  const { matchEvent: flashUsed, actionEvent: flashAction } = await clickTargetUntilTutorProgress(
    game,
    "interact_match3BoosterFlash",
    "BattleTower2",
    "ClickedOnFlash"
  );
  const battleWon = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated" },
    flashAction.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower2" },
    battleWon.sequence
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    battleWon.sequence
  );
  const winReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    winDialogOpened.sequence
  );

  const continueMessage = await dismissContinueReplica(
    game,
    "BattleTower2",
    coords.continueMessage,
    winReplica.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower2" },
    continueMessage.sequence
  );

  const dialogClosed = await game.clickAtAndWaitEventAfter(
    tutorCoords.win_dialog_claim_btn.x,
    tutorCoords.win_dialog_claim_btn.y,
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
    30_000,
    tutorCoords.win_dialog_claim_btn.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower2" },
    dialogClosed.sequence
  );
}

async function runChat1(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("Chat1");
  const chat1Started = await game.checkpoint();
  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
    chat1Started
  );

  const beforeThirdGirlClose = await game.checkpoint();
  await closeGirlNewInfoDialog(game, walkthroughCoords.chat1.thirdNewGirlClose);
  const dashboardOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpened" },
    beforeThirdGirlClose
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    dashboardOpened.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_chat_btn");

  let sequence = await game.checkpoint();
  const chatClicked = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_chat_btn.x,
    tutorCoords.dashboard_chat_btn.y,
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat" },
    30_000,
    tutorCoords.dashboard_chat_btn.label
  );
  const chatOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatOpened" },
    chatClicked.sequence
  );
  await game.waitEventAfter(
    { source: "ui", type: "dialog_opened", dialog: "ChatDialog" },
    chatOpened.sequence
  );

  const beforeChatAnswers = await game.checkpoint();
  const storyCompleted = await advanceChatAtUntilCompleted(
    game,
    [walkthroughCoords.chat1.answer, walkthroughCoords.chat3.answer],
    beforeChatAnswers,
    "Chat1"
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "Chat1" },
    storyCompleted.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    storyCompleted.sequence
  );
  await game.waitTutorHighlightRequested("chat_photo");

  const photoOpened = await openChatPhoto(game, "Chat1", walkthroughCoords.chat1.chatPhoto);

  const photoClosed = await game.clickAtAndWaitEventAfter(
    walkthroughCoords.chat1.galleryClose.x,
    walkthroughCoords.chat1.galleryClose.y,
    { source: "tutor", type: "event_emitted", name: "PhotoClosed" },
    30_000,
    walkthroughCoords.chat1.galleryClose.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat1" },
    photoClosed.sequence
  );
  await game.waitTutorHighlightRequested("chat_close_btn");

  const chatClosed = await game.clickAtAndWaitEventAfter(
    tutorCoords.chat_close_btn.x,
    tutorCoords.chat_close_btn.y,
    { source: "tutor", type: "event_emitted", name: "ChatClosed" },
    30_000,
    tutorCoords.chat_close_btn.label ?? "chat_close_btn"
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "Chat1" },
    chatClosed.sequence
  );
}

async function runBattleTower3(game: GameSession): Promise<void> {
  const coords = walkthroughCoords.battleTower3;

  const { firstReplica } = await beginTutorStep(game, "BattleTower3");
  await game.waitTutorHighlightRequested("dashboard_battle_btn", "BattleTower3", firstReplica.sequence);

  let sequence = await game.checkpoint();
  await clickTarget(game, "dashboard_battle_btn");
  const towerClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerClick", stepId: "BattleTower3" },
    sequence
  );
  const towerShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "TowerShown", stepId: "BattleTower3" },
    towerClick.sequence
  );
  const towerReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    towerShown.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", stepId: "BattleTower3", name: "tower_battle_btn" },
    towerReplica.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "tower_battle_btn");
  const battleClick = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleClick", stepId: "BattleTower3" },
    sequence
  );
  const battleEnterShown = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleEnterDialogShown", stepId: "BattleTower3" },
    battleClick.sequence
  );
  const battleEnterReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    battleEnterShown.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "highlight_requested", stepId: "BattleTower3", name: "interact_battleEnterGirlCard" },
    battleEnterReplica.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "interact_battleEnterGirlCard");
  const deckIsFull = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DeckIsFull", stepId: "BattleTower3" },
    sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "BattleTower3" },
    deckIsFull.sequence
  );

  sequence = await game.checkpoint();
  await clickTarget(game, "battle_enter_fight_btn");
  const battleStartLoading = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleTower3" },
    sequence
  );
  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleTower3" },
    battleStartLoading.sequence
  );
  const abilityCharged = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleAbilityCharged", stepId: "BattleTower3" },
    battleStarted.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    abilityCharged.sequence
  );

  const { abilityUsed } = await useReadyHeroAbility(
    game,
    "BattleTower3",
    battleStarted.sequence,
    tutorCoords.interact_firstBattlerWithAbility
  );

  const battleEnemyDefeated = await runBattleTurnsWithAbilityQueue(
    game,
    "BattleTower3",
    abilityUsed.sequence,
    {
      extraFilters: [{ source: "tutor", type: "replica_shown", stepId: "BattleTower3" }],
      replicaHandler: async (event) => {
        await dismissContinueReplica(
          game,
          "BattleTower3",
          [
            coords.continueMessage,
            { x: coords.continueMessage.x + 36, y: coords.continueMessage.y + 10 },
            { x: coords.continueMessage.x - 32, y: coords.continueMessage.y + 18 }
          ],
          event.sequence,
          [
            { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleTower3" },
            { source: "tutor", type: "replica_hidden", stepId: "BattleTower3" },
            { source: "tutor", type: "event_emitted", name: "BattleEnemyDefeated", stepId: "BattleTower3" },
            { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened", stepId: "BattleTower3" }
          ]
        );
        return event.sequence;
      }
    }
  );

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower3" },
    battleEnemyDefeated
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened", stepId: "BattleTower3" },
    stepSaved.sequence
  );
  const winReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    winDialogOpened.sequence
  );

  const postWinContinue = await dismissContinueReplica(
    game,
    "BattleTower3",
    coords.postWinContinue,
    winReplica.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower3" },
    postWinContinue.sequence
  );

  const dialogClosed = await game.clickAtAndWaitEventAfter(
    coords.claimButton.x,
    coords.claimButton.y,
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed", stepId: "BattleTower3" },
    30_000,
    coords.claimButton.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower3" },
    dialogClosed.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "TowerChest" },
    dialogClosed.sequence
  );
}

async function runTowerChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerChest");
  await game.waitTutorReplicaShown("TowerChest");
  await game.waitTutorHighlightRequested("interact_readySlot");

  const slotOpen = await game.clickAtAndWaitEventAfter(
    tutorCoords.interact_readySlot.x,
    tutorCoords.interact_readySlot.y,
    { source: "tutor", type: "event_emitted", name: "SlotOpen", stepId: "TowerChest" },
    30_000,
    tutorCoords.interact_readySlot.label
  );
  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "TowerChest" },
    slotOpen.sequence
  );
  const rewardsDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "RewardsDialogOpened", stepId: "TowerChest" },
    stepSaved.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "TowerChest" },
    rewardsDialogOpened.sequence
  );

  const rewardsClaimed = await game.clickAtAndWaitEventAfter(
    tutorCoords.rewards_claim_btn.x,
    tutorCoords.rewards_claim_btn.y,
    { source: "tutor", type: "event_emitted", name: "RewardsClaimed", stepId: "TowerChest" },
    30_000,
    tutorCoords.rewards_claim_btn.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "TowerChest" },
    rewardsClaimed.sequence
  );
}

async function runTowerWinsChest(game: GameSession): Promise<void> {
  await game.waitTutorStepStarted("TowerWinsChest");
  await game.waitTutorReplicaShown("TowerWinsChest");
  await game.waitTutorHighlightRequested("tower_wins_banner");

  const rewardsDialogOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.tower_wins_banner.x,
    tutorCoords.tower_wins_banner.y,
    { source: "tutor", type: "event_emitted", name: "RewardsDialogOpened", stepId: "TowerWinsChest" },
    30_000,
    tutorCoords.tower_wins_banner.label
  );
  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "TowerWinsChest" },
    rewardsDialogOpened.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "TowerWinsChest" },
    stepSaved.sequence
  );

  const rewardsClaimed = await game.clickAtAndWaitEventAfter(
    tutorCoords.rewards_claim_btn.x,
    tutorCoords.rewards_claim_btn.y,
    { source: "tutor", type: "event_emitted", name: "RewardsClaimed", stepId: "TowerWinsChest" },
    30_000,
    tutorCoords.rewards_claim_btn.label
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "TowerWinsChest" },
    rewardsClaimed.sequence
  );
}

async function runLevelUpGirl(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "LevelUpGirl");
  await game.waitTutorHighlightRequested("dashboard_girls_btn", "LevelUpGirl", dashboardReplica.sequence);
  await click(game, tutorCoords.dashboard_girls_btn);
  const girlsOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "DashboardOpenGirls", stepId: "LevelUpGirl" },
    dashboardReplica.sequence
  );

  const girlsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    girlsOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstGirlCard", "LevelUpGirl", girlsReplica.sequence);
  await click(game, tutorCoords.interact_firstGirlCard);
  const girlInfoOpen = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "GirlInfoOpen", stepId: "LevelUpGirl" },
    girlsReplica.sequence
  );

  const mainParamsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    girlInfoOpen.sequence
  );
  const mainParamsContinue = await dismissContinueReplica(
    game,
    "LevelUpGirl",
    walkthroughCoords.levelUpGirl.continueMessage,
    mainParamsReplica.sequence
  );

  const battleParamsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    mainParamsContinue.sequence
  );
  const battleParamsContinue = await dismissContinueReplica(
    game,
    "LevelUpGirl",
    walkthroughCoords.levelUpGirl.continueMessage,
    battleParamsReplica.sequence
  );

  const abilitiesReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    battleParamsContinue.sequence
  );
  const abilitiesContinue = await dismissContinueReplica(
    game,
    "LevelUpGirl",
    walkthroughCoords.levelUpGirl.continueMessage,
    abilitiesReplica.sequence
  );

  const levelUpReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl" },
    abilitiesContinue.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_level_up_btn", "LevelUpGirl", levelUpReplica.sequence);
  await game.waitMs(1500);
  const levelUpEndSequence = await levelUpUntilComplete(
    game,
    "LevelUpGirl",
    tutorCoords.girl_info_level_up_btn,
    20
  );

  try {
    await game.waitTutorHighlightRequested("close_btn", "LevelUpGirl", levelUpEndSequence);
  } catch {
    // Some builds may skip the explicit close highlight and go straight to closable state.
  }

  const closeSequence = await game.checkpoint();
  await click(game, walkthroughCoords.levelUpGirl.closeButton);
  await game.waitAnyEventAfter([
    { source: "tutor", type: "event_emitted", name: "DialogClosed", stepId: "LevelUpGirl" },
    { source: "tutor", type: "step_completed", stepId: "LevelUpGirl" },
    { source: "tutor", type: "step_started", stepId: "Chat2" },
    { source: "ui", type: "dialog_closed", dialog: "GirlInfoDialog" }
  ], closeSequence);
  await game.waitTutorStepCompleted("LevelUpGirl");
}

async function runChat2(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "Chat2");
  await game.waitTutorHighlightRequested("dashboard_chat_btn", "Chat2", dashboardReplica.sequence);
  const chatOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_chat_btn.x,
    tutorCoords.dashboard_chat_btn.y,
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat", stepId: "Chat2" },
    30_000,
    tutorCoords.dashboard_chat_btn.label
  );

  const chatReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat2" },
    chatOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstChatBtn", "Chat2", chatReplica.sequence);
  const chatDialogOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.interact_firstChatBtn.x,
    tutorCoords.interact_firstChatBtn.y,
    { source: "tutor", type: "event_emitted", name: "ChatDialogOpened", stepId: "Chat2" },
    30_000,
    tutorCoords.interact_firstChatBtn.label
  );
  await game.waitTutorStepSaved("Chat2");

  const continueReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat2" },
    chatDialogOpened.sequence
  );
  const continueClicked = await game.clickAtAndWaitEventAfter(
    walkthroughCoords.chat2.continueMessage.x,
    walkthroughCoords.chat2.continueMessage.y,
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "Chat2" },
    30_000,
    walkthroughCoords.chat2.continueMessage.label
  );

  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "Chat2" },
    continueClicked.sequence
  );
  const battleTower4Started = await game.waitEventAfter(
    { source: "tutor", type: "step_started", stepId: "BattleTower4" },
    continueClicked.sequence
  );

  await click(game, walkthroughCoords.chat2.closeButton);
  await game.waitTutorEvent("DialogClosed", "BattleTower4", battleTower4Started.sequence);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatClosed", stepId: "BattleTower4" },
    battleTower4Started.sequence
  );
}

async function runBattleTower4(game: GameSession): Promise<void> {
  const { firstReplica: towerReplica } = await beginTutorStep(game, "BattleTower4");
  await game.waitTutorHighlightRequested("tower_battle_btn", "BattleTower4", towerReplica.sequence);
  const battleClickEvent = await game.clickAtAndWaitEventAfter(
    tutorCoords.tower_battle_btn.x,
    tutorCoords.tower_battle_btn.y,
    { source: "tutor", type: "event_emitted", name: "BattleClick", stepId: "BattleTower4" },
    30_000,
    tutorCoords.tower_battle_btn.label
  );

  const battleEnterReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    battleClickEvent.sequence
  );
  const battleStartLoading = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.fightButton);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleTower4" },
    Math.max(battleEnterReplica.sequence, battleStartLoading)
  );

  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleTower4" },
    battleStartLoading
  );

  const battleEnemyDefeated = await runBattleTurnsWithAbilityQueue(
    game,
    "BattleTower4",
    battleStarted.sequence,
    { fallbackPoint: tutorCoords.interact_firstBattlerWithAbility }
  );

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleTower4" },
    battleEnemyDefeated
  );
  const winDialogOpened = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened", stepId: "BattleTower4" },
    stepSaved.sequence
  );

  let sequence = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.winDialogClose);
  const dialogClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed", stepId: "BattleTower4" },
    sequence
  );

  const sealReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    dialogClosed.sequence
  );
  await game.waitTutorHighlightRequested("interact_sealReward", "BattleTower4", sealReplica.sequence);
  const sealAdvance = await clickPointUntilEventProgress(game, walkthroughCoords.battleTower4.sealContinue, [
    { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleTower4" },
    { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
    { source: "tutor", type: "highlight_requested", name: "rewards_claim_btn", stepId: "BattleTower4" }
  ], 3, 5000);

  const claimReadySequence = sealAdvance.sequence;
  if (sealAdvance.type !== "highlight_requested") {
    await game.waitAnyEventAfter([
      { source: "tutor", type: "replica_shown", stepId: "BattleTower4" },
      { source: "tutor", type: "highlight_requested", name: "rewards_claim_btn", stepId: "BattleTower4" }
    ], claimReadySequence);
  }

  sequence = await game.checkpoint();
  await click(game, walkthroughCoords.battleTower4.rewardsClaim);
  await game.waitTutorEvent("RewardsClaimed", "BattleTower4", sequence);
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleTower4" },
    sequence
  );
}

async function runSummonPremium(game: GameSession): Promise<void> {
  const stepId = "Summon";

  const { firstReplica: summonReplica } = await beginTutorStep(game, stepId);
  await game.waitTutorHighlightRequested("summon_btn", stepId, summonReplica.sequence);
  await click(game, tutorCoords.summon_btn);
  const summonClicked = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "SummonClicked", stepId },
    summonReplica.sequence
  );

  const summonOpenReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId },
    summonClicked.sequence
  );
  await game.waitTutorHighlightRequested("summon_open_one_btn", stepId, summonOpenReplica.sequence);
  const summonBuy = await game.checkpoint();
  await click(game, tutorCoords.summon_open_one_btn);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "SummonBuy", stepId },
    summonBuy
  );

  const firstGirlClosed = await closeGirlNewInfoDialog(
    game,
    walkthroughCoords.summonPremium.firstNewGirlClose,
    { waitForOpenAfterSequence: summonBuy }
  );

  try {
    const nextSummonEvent = await game.waitAnyEventAfter([
      { source: "ui", type: "dialog_opened", dialog: "GirlNewInfoDialog" },
      { source: "tutor", type: "replica_shown", stepId },
      { source: "tutor", type: "highlight_requested", name: "close_btn", stepId }
    ], firstGirlClosed.sequence, 3000);

    if (nextSummonEvent.source === "ui" && nextSummonEvent.dialog === "GirlNewInfoDialog") {
      await closeGirlNewInfoDialog(
        game,
        walkthroughCoords.summonPremium.secondNewGirlClose,
        { waitForOpenAfterSequence: firstGirlClosed.sequence }
      );
    }
  } catch {
    // Current client may open only one girl dialog here.
  }

  const closeReplica = await game.waitTutorReplicaShown(stepId, summonBuy);
  await game.waitTutorHighlightRequested("close_btn", stepId, closeReplica.sequence);
  await click(game, walkthroughCoords.summonPremium.closeButton);
  await game.waitTutorEvent("DialogClosed", stepId, closeReplica.sequence);
  await game.waitTutorStepCompleted(stepId);
}

async function runBattleCampaign1(game: GameSession): Promise<void> {
  const { firstReplica } = await beginTutorStep(game, "BattleCampaign1");
  const firstAdvance = await dismissContinueReplica(
    game,
    "BattleCampaign1",
    walkthroughCoords.battleCampaign1.continueMessage,
    firstReplica.sequence,
    [
      { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleCampaign1" },
      { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" }
    ]
  );

  const secondReplica = firstAdvance.type === "replica_shown"
    ? firstAdvance
    : await game.waitEventAfter(
      { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
      firstAdvance.sequence
    );

  const secondAdvance = await dismissContinueReplica(
    game,
    "BattleCampaign1",
    walkthroughCoords.battleCampaign1.continueMessage,
    secondReplica.sequence,
    [
      { source: "tutor", type: "event_emitted", name: "ClickContinueInMessage", stepId: "BattleCampaign1" },
      { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
      { source: "tutor", type: "highlight_requested", name: "dashboard_modes_btn", stepId: "BattleCampaign1" }
    ]
  );

  const modesReplica = secondAdvance.type === "replica_shown"
    ? secondAdvance
    : await game.waitEventAfter(
      { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
      secondAdvance.sequence
    );
  await game.waitTutorHighlightRequested("dashboard_modes_btn", "BattleCampaign1", modesReplica.sequence);
  const modesClicked = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_modes_btn.x,
    tutorCoords.dashboard_modes_btn.y,
    { source: "tutor", type: "event_emitted", name: "ModesButtonClicked", stepId: "BattleCampaign1" },
    30_000,
    tutorCoords.dashboard_modes_btn.label
  );

  const campaignReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    modesClicked.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_campaign_btn", "BattleCampaign1", campaignReplica.sequence);
  const campaignOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_campaign_btn.x,
    tutorCoords.dashboard_campaign_btn.y,
    { source: "tutor", type: "event_emitted", name: "CampaignOpen", stepId: "BattleCampaign1" },
    30_000,
    tutorCoords.dashboard_campaign_btn.label
  );

  const startReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    campaignOpened.sequence
  );
  await game.waitTutorHighlightRequested("first_campaign_btn", "BattleCampaign1", startReplica.sequence);
  const campaignStart = await game.clickAtAndWaitEventAfter(
    tutorCoords.first_campaign_btn.x,
    tutorCoords.first_campaign_btn.y,
    { source: "tutor", type: "event_emitted", name: "CampaignClickStart", stepId: "BattleCampaign1" },
    30_000,
    tutorCoords.first_campaign_btn.label
  );

  const pickBestReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    campaignStart.sequence
  );
  await game.waitTutorHighlightRequested("pick_best_btn", "BattleCampaign1", pickBestReplica.sequence);
  const pickBest = await game.clickAtAndWaitEventAfter(
    tutorCoords.pick_best_btn.x,
    tutorCoords.pick_best_btn.y,
    { source: "tutor", type: "event_emitted", name: "PickBest", stepId: "BattleCampaign1" },
    30_000,
    tutorCoords.pick_best_btn.label
  );

  const fightReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "BattleCampaign1" },
    pickBest.sequence
  );
  const battleStartLoading = await game.checkpoint();
  await click(game, walkthroughCoords.battleCampaign1.fightButton);
  await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStartLoading", stepId: "BattleCampaign1" },
    Math.max(fightReplica.sequence, battleStartLoading)
  );

  const battleStarted = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "BattleStarted", stepId: "BattleCampaign1" },
    battleStartLoading
  );

  const battleEnemyDefeated = await runBattleTurnsWithAbilityQueue(
    game,
    "BattleCampaign1",
    battleStarted.sequence,
    { fallbackPoint: tutorCoords.interact_firstBattlerWithAbility }
  );

  const stepSaved = await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "BattleCampaign1" },
    battleEnemyDefeated
  );
  const stepCompleted = await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "BattleCampaign1" },
    stepSaved.sequence
  );
  const postBattleEvent = await game.waitAnyEventAfter([
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    { source: "ui", type: "dialog_opened", dialog: "BattleWinResultDialog" },
    { source: "tutor", type: "step_started", stepId: "Chat3" }
  ], stepCompleted.sequence);

  const isBattleWinDialogOpened =
    (postBattleEvent.source === "tutor"
      && postBattleEvent.type === "event_emitted"
      && postBattleEvent.name === "BattleWinDialogOpened")
    || (postBattleEvent.source === "ui"
      && postBattleEvent.type === "dialog_opened"
      && postBattleEvent.dialog === "BattleWinResultDialog");

  if (isBattleWinDialogOpened) {
    await click(game, walkthroughCoords.battleCampaign1.winDialogClose);
    await game.waitAnyEventAfter([
      { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
      { source: "ui", type: "dialog_closed", dialog: "BattleWinResultDialog" },
      { source: "tutor", type: "step_started", stepId: "Chat3" }
    ], postBattleEvent.sequence);
    return;
  }

  const afterChat3Started = await game.waitAnyEventAfter([
    { source: "tutor", type: "event_emitted", name: "BattleWinDialogOpened" },
    { source: "ui", type: "dialog_opened", dialog: "BattleWinResultDialog" },
    { source: "tutor", type: "replica_shown", stepId: "Chat3" }
  ], postBattleEvent.sequence);

  const isDelayedBattleWinDialogOpened =
    (afterChat3Started.source === "tutor"
      && afterChat3Started.type === "event_emitted"
      && afterChat3Started.name === "BattleWinDialogOpened")
    || (afterChat3Started.source === "ui"
      && afterChat3Started.type === "dialog_opened"
      && afterChat3Started.dialog === "BattleWinResultDialog");

  if (isDelayedBattleWinDialogOpened) {
    await click(game, walkthroughCoords.battleCampaign1.winDialogClose);
    await game.waitAnyEventAfter([
      { source: "tutor", type: "event_emitted", name: "BattleWinDialogClosed" },
      { source: "ui", type: "dialog_closed", dialog: "BattleWinResultDialog" },
      { source: "tutor", type: "replica_shown", stepId: "Chat3" }
    ], afterChat3Started.sequence);
  }
}

async function runChat3(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "Chat3");
  await game.waitTutorHighlightRequested("dashboard_chat_btn", "Chat3", dashboardReplica.sequence);
  const chatOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.dashboard_chat_btn.x,
    tutorCoords.dashboard_chat_btn.y,
    { source: "tutor", type: "event_emitted", name: "DashboardOpenChat", stepId: "Chat3" },
    30_000,
    tutorCoords.dashboard_chat_btn.label
  );

  const girlReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    chatOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_chatGirl21", "Chat3", girlReplica.sequence);
  await game.waitEventAfter(
    { source: "tutor", type: "action_executed", name: "RunChats", stepId: "Chat3" },
    girlReplica.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "Chat3" },
    girlReplica.sequence
  );
  await game.waitMs(500);
  const chatDialogOpened = await game.clickAtAndWaitEventAfter(
    tutorCoords.interact_chatGirl21.x,
    tutorCoords.interact_chatGirl21.y,
    { source: "tutor", type: "event_emitted", name: "ChatDialogOpened", stepId: "Chat3" },
    30_000,
    tutorCoords.interact_chatGirl21.label
  );

  const beforeChatAnswers = chatDialogOpened.sequence;
  const storyCompleted = await advanceChatAtUntilCompleted(
    game,
    [walkthroughCoords.chat3.answer, walkthroughCoords.chat1.answer],
    beforeChatAnswers,
    "Chat3",
    { waitForAnswerReady: true }
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_saved", stepId: "Chat3" },
    storyCompleted.sequence
  );
  const photoReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    Math.max(chatDialogOpened.sequence, storyCompleted.sequence)
  );
  await game.waitTutorHighlightRequested("chat_photo", "Chat3", photoReplica.sequence);
  await game.waitMs(2000);
  const photoOpened = await openChatPhoto(game, "Chat3", walkthroughCoords.chat3.chatPhoto, 5, 2000);

  await click(game, walkthroughCoords.chat3.galleryClose);
  const photoClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "PhotoClosed", stepId: "Chat3" },
    photoOpened.sequence
  );

  await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "Chat3" },
    photoClosed.sequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "pointer_shown", stepId: "Chat3" },
    photoClosed.sequence
  );
  await game.waitTutorHighlightRequested("chat_close_btn", "Chat3", photoClosed.sequence);
  const closeSequence = await game.checkpoint();
  await clickTarget(game, "chat_close_btn");
  const chatClosed = await game.waitEventAfter(
    { source: "tutor", type: "event_emitted", name: "ChatClosed", stepId: "Chat3" },
    closeSequence
  );
  await game.waitEventAfter(
    { source: "tutor", type: "step_completed", stepId: "Chat3" },
    chatClosed.sequence
  );
}

async function runLevelUpGirl2(game: GameSession): Promise<void> {
  const { firstReplica: dashboardReplica } = await beginTutorStep(game, "LevelUpGirl2");
  await game.waitTutorHighlightRequested("dashboard_girls_btn", "LevelUpGirl2", dashboardReplica.sequence);
  const girlsOpened = await game.clickAtAndWaitEventAfter(
    walkthroughCoords.levelUpGirl2.dashboardGirlsButton.x,
    walkthroughCoords.levelUpGirl2.dashboardGirlsButton.y,
    { source: "tutor", type: "event_emitted", name: "DashboardOpenGirls", stepId: "LevelUpGirl2" },
    30_000,
    walkthroughCoords.levelUpGirl2.dashboardGirlsButton.label
  );

  const girlsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl2" },
    girlsOpened.sequence
  );
  await game.waitTutorHighlightRequested("interact_firstGirlCard", "LevelUpGirl2", girlsReplica.sequence);
  await game.waitMs(1500);
  const girlInfoOpen = await game.clickAtAndWaitEventAfter(
    walkthroughCoords.levelUpGirl2.firstGirlCard.x,
    walkthroughCoords.levelUpGirl2.firstGirlCard.y,
    { source: "tutor", type: "event_emitted", name: "GirlInfoOpen", stepId: "LevelUpGirl2" },
    30_000,
    walkthroughCoords.levelUpGirl2.firstGirlCard.label
  );

  const levelUpReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LevelUpGirl2" },
    girlInfoOpen.sequence
  );
  await game.waitTutorHighlightRequested("girl_info_level_up_btn", "LevelUpGirl2", levelUpReplica.sequence);
  await levelUpUntilComplete(
    game,
    "LevelUpGirl2",
    walkthroughCoords.levelUpGirl2.levelUpButton,
    12
  );

  const closeReplica = await game.waitTutorReplicaShown("LevelUpGirl2", girlInfoOpen.sequence);
  await game.waitTutorHighlightRequested("close_btn", "LevelUpGirl2", closeReplica.sequence);
  await click(game, walkthroughCoords.levelUpGirl2.closeButton);
  await game.waitTutorEvent("DialogClosed", "LevelUpGirl2", closeReplica.sequence);
  await game.waitTutorStepCompleted("LevelUpGirl2");
}

async function runLastMessage(game: GameSession): Promise<void> {
  const { firstReplica } = await beginTutorStep(game, "LastMessage");
  const continueClicked = await dismissContinueReplica(
    game,
    "LastMessage",
    walkthroughCoords.lastMessage.continueMessage,
    firstReplica.sequence
  );

  const questsReplica = await game.waitEventAfter(
    { source: "tutor", type: "replica_shown", stepId: "LastMessage" },
    continueClicked.sequence
  );
  await game.waitTutorHighlightRequested("dashboard_quests_btn", "LastMessage", questsReplica.sequence);
  await click(game, tutorCoords.dashboard_quests_btn);
  await game.waitTutorEvent("QuestsClicked", "LastMessage", questsReplica.sequence);
  await game.waitTutorStepCompleted("LastMessage");
  await game.waitTutorCompleted();
}

export async function runFullTutorWalkthrough(game: GameSession): Promise<void> {
  await bootstrapTutorWalkthrough(game);
  await runBattleTower1(game);
  await runBattleTower2(game);
  await runChat1(game);
  await runBattleTower3(game);
  await runTowerChest(game);
  await runTowerWinsChest(game);
  await runLevelUpGirl(game);
  await runChat2(game);
  await runBattleTower4(game);
  await runSummonPremium(game);
  await runBattleCampaign1(game);
  await runChat3(game);
  await runLevelUpGirl2(game);
  await runLastMessage(game);
}
