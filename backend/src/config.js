'use strict';

require('dotenv').config();

const { z } = require('zod');

/**
 * Coerce common truthy/falsy string representations into a real boolean.
 * (z.coerce.boolean() would treat the string "false" as truthy.)
 */
const booleanish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

/**
 * Environment schema. Every runtime configuration value is validated at
 * boot time so that a misconfigured deployment fails fast instead of
 * failing mysteriously at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SERVICE_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: booleanish.default(false),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/cicd?schema=public'),

  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  TRUST_PROXY: booleanish.default(false),

  METRICS_ENABLED: booleanish.default(true),
  OTEL_ENABLED: booleanish.default(false),
  OTEL_SERVICE_NAME: z.string().default('cicd-backend'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318')
});

function loadConfig(raw = process.env) {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration -> ${issues}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-only-insecure-secret-change-me') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }

  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    serviceVersion: env.SERVICE_VERSION,
    logLevel: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    logPretty: env.LOG_PRETTY,
    databaseUrl: env.DATABASE_URL,
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
    },
    bcryptRounds: env.BCRYPT_ROUNDS,
    corsOrigin:
      env.CORS_ORIGIN === '*'
        ? '*'
        : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      authMax: env.AUTH_RATE_LIMIT_MAX
    },
    trustProxy: env.TRUST_PROXY,
    metricsEnabled: env.METRICS_ENABLED,
    otel: {
      enabled: env.OTEL_ENABLED,
      serviceName: env.OTEL_SERVICE_NAME,
      endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT
    }
  };
}

const config = loadConfig();

module.exports = config;
module.exports.loadConfig = loadConfig;
