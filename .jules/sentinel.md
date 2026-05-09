## 2026-05-07 - Railway proxy trust for rate limiting
**Vulnerability:** The Express app applied `express-rate-limit` without trusting Railway's proxy, so IP-based throttling could key off the proxy hop instead of the real client.
**Learning:** This codebase runs behind Railway in production, and transport-level security middleware in `server/index.ts` must be proxy-aware or it silently degrades.
**Prevention:** When adding or reviewing IP-based controls in this project, verify `app.set('trust proxy', 1)` is present for production before relying on rate limits or client IP checks.
