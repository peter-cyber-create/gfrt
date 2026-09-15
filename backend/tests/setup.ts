import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://musooka:musooka_dev_only@127.0.0.1:5435/musooka_test?schema=public";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-32chars-min";
process.env.COOKIE_SECURE = "false";
process.env.CORS_ORIGIN = "http://127.0.0.1:5173";
