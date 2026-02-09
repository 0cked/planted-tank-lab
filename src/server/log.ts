export type LogLevel = "info" | "warn" | "error";

type LogEvent = Record<string, unknown>;

function toConsoleMethod(level: LogLevel): (line?: unknown) => void {
  switch (level) {
    case "info":
      return console.log;
    case "warn":
      return console.warn;
    case "error":
      return console.error;
  }
}

export function logEvent(level: LogLevel, event: LogEvent): void {
  const payload = {
    level,
    ts: new Date().toISOString(),
    ...event,
  };

  // Emit structured JSON for easy filtering in Vercel logs.
  const line = JSON.stringify(payload);
  toConsoleMethod(level)(line);
}

export function safeErrorFields(err: unknown): { name?: string; message?: string; stack?: string } {
  if (!(err instanceof Error)) return {};
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

