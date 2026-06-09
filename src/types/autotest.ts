export type AutotestEvent = {
  schemaVersion: number;
  sequence: number;
  timestampMs: number;
  source: string;
  type: string;
  name?: string | null;
  status?: string | null;
  stepId?: string | null;
  replicaIndex?: number | null;
  screen?: string | null;
  dialog?: string | null;
  payload?: string | null;
};

export type EventFilter = Partial<{
  source: string;
  type: string;
  name: string;
  status: string;
  stepId: string;
  replicaIndex: number;
  screen: string;
  dialog: string;
}>;


export type BattleMoveAdvice = {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  fromScreenX: number;
  fromScreenY: number;
  toScreenX: number;
  toScreenY: number;
  fromType?: string;
  toType?: string;
  fromState?: string;
  toState?: string;
};

export type BattleAbilityActivation = {
  x: number;
  y: number;
  cardConfigId?: number;
  abilityId?: number;
};

export type AgeGateDiagnostics = {
  wasShown: boolean;
  clicked: boolean;
  clickCount: number;
  overlayHiddenAfterClick?: boolean;
};

export type BrowserConsoleMessage = {
  type: string;
  text: string;
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
};

export type FailedRequestDiagnostics = {
  url: string;
  method: string;
  resourceType: string;
  failureText: string;
};

export type PageDiagnostics = {
  ageGate?: AgeGateDiagnostics;
  consoleMessages: BrowserConsoleMessage[];
  pageErrors: string[];
  failedRequests: FailedRequestDiagnostics[];
};

export type BrowserLoggingOptions = {
  liveConsole: boolean;
  attachOnSuccess: boolean;
};

export type AutotestStore = {
  version: number;
  events: AutotestEvent[];
  lastEvent: AutotestEvent | null;
  commands: Record<string, unknown>;
};

declare global {
  interface Window {
    __autotest?: AutotestStore;
  }
}
