function readString(name: string, fallback: string): string {
  return (process.env[name] ?? fallback).trim();
}

function readOptionalString(name: string): string | undefined {
  const value = (process.env[name] ?? "").trim();
  return value === "" ? undefined : value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

export const tutorConfig = {
  stepId: readString("TUTOR_STEP_ID", "BattleTower1"),
  clickX: readNumber("TUTOR_CLICK_X", 812),
  clickY: readNumber("TUTOR_CLICK_Y", 642),
  expectedTutorEvent: readString("TUTOR_EXPECTED_EVENT", "ClickContinueInMessage"),
  highlightName: readOptionalString("TUTOR_HIGHLIGHT_NAME")
};
