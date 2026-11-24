'use strict';
// dotenv never overrides variables that already exist (even empty ones), and server.js
// treats empty strings as unset, so these keep the developer's real .env out of child processes.
const NEUTRAL_ENV = Object.fromEntries([
  'GATEWAY_API_TOKEN', 'DATABASE_URL', 'TEST_DATABASE_URL', 'REQUIRE_DATABASE',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OWNER_USER_ID', 'DISABLE_LEGACY_TOKEN',
  'ALLOW_UNAUTHENTICATED', 'NODE_ENV', 'KEY_ENCRYPTION_SECRET',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_API_KEY',
  'OPENAI_COMPAT_API_KEY', 'OPENAI_COMPAT_BASE_URL', 'OPENAI_COMPAT_MODEL',
  'OPENAI_MODEL', 'GEMINI_MODEL', 'CLAUDE_MODEL', 'NVIDIA_MODEL',
].map((k) => [k, '']));
module.exports = { NEUTRAL_ENV };