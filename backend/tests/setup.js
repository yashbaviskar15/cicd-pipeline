'use strict';

// Applied before every test file. Keeps tests hermetic and fast.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-please-change-1234567890';
process.env.SERVICE_VERSION = '1.0.0';
process.env.LOG_LEVEL = 'silent';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
