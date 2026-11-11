'use strict';

const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'A valid email is required' }).max(255),
  name: z.string().trim().min(1, 'Name is required').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'A valid email is required' }),
  password: z.string().min(1, 'Password is required')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required')
});

module.exports = { registerSchema, loginSchema, refreshSchema };
