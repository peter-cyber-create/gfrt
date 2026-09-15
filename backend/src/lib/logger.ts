type LogFields = Record<string, unknown>;

function line(level: string, message: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  // Avoid logging secrets
  const safe = JSON.parse(
    JSON.stringify(payload, (key, value) => {
      if (/password|token|cookie|secret|authorization/i.test(key)) return "[redacted]";
      return value;
    })
  );
  const text = JSON.stringify(safe);
  if (level === "error") console.error(text);
  else console.log(text);
}

export const logger = {
  info: (message: string, fields?: LogFields) => line("info", message, fields),
  warn: (message: string, fields?: LogFields) => line("warn", message, fields),
  error: (message: string, fields?: LogFields) => line("error", message, fields),
};
