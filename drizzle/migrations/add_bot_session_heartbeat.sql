-- Migración: add_bot_session_heartbeat
-- Aplicar con: turso db shell <nombre-db> < add_bot_session_heartbeat.sql
-- O ejecutar manualmente en la consola Turso

-- 1. Agregar columnas nuevas a bot_queue (si no existen)
-- Turso/SQLite no soporta IF NOT EXISTS en ALTER TABLE, usar con precaución
-- Si las columnas ya existen, estos comandos darán error y se pueden ignorar.

ALTER TABLE bot_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE bot_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bot_queue ADD COLUMN error_msg TEXT;
ALTER TABLE bot_queue ADD COLUMN last_attempt_at INTEGER;
ALTER TABLE bot_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- 2. Crear tabla bot_heartbeat (registra el último ping del bot local)
CREATE TABLE IF NOT EXISTS bot_heartbeat (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  bot_version  TEXT,
  pending_count INTEGER NOT NULL DEFAULT 0
);

-- 3. Crear tabla bot_session (sesión de conversación por número WhatsApp)
CREATE TABLE IF NOT EXISTS bot_session (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_number       TEXT NOT NULL UNIQUE,
  user_type       TEXT NOT NULL CHECK(user_type IN ('employee', 'admin', 'sales')),
  user_id         INTEGER NOT NULL,
  user_name       TEXT NOT NULL,
  current_menu    TEXT NOT NULL DEFAULT 'main',
  context_data    TEXT,          -- JSON: { tareaId, rondaId, page, step, ... }
  menu_history    TEXT,          -- JSON array: ["main","tareas_lista"]
  last_activity_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Índice para búsqueda rápida por wa_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_session_wa_number ON bot_session(wa_number);
