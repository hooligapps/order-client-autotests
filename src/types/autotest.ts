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
