/**
 * ICEE SQLite 数据库 DDL
 * 包含所有核心表的建表语句
 *
 * 表清单:
 *   1. schema_versions  — Schema 版本管理
 *   2. migrations       — 迁移执行记录
 *   3. runs             — Run 执行实例记录
 *   4. steps            — Step 节点执行记录
 *   5. events           — StepEvent Trace 事件 (append-only)
 *   6. providers        — LLM Provider 配置
 *   7. plugins          — 已安装插件记录
 *   8. memories         — 持久记忆存储
 */

export const CREATE_SCHEMA_VERSIONS = `
  CREATE TABLE IF NOT EXISTS schema_versions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    version     TEXT    NOT NULL UNIQUE,  -- 如 "1.0.0"
    applied_at  TEXT    NOT NULL,         -- ISO 8601 时间戳
    description TEXT
  );
`;

export const CREATE_MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,  -- 迁移文件名，如 "001_init"
    applied_at  TEXT    NOT NULL,         -- ISO 8601 时间戳
    checksum    TEXT                      -- 迁移文件内容的 hash，防止篡改
  );
`;

export const CREATE_RUNS = `
  CREATE TABLE IF NOT EXISTS runs (
    run_id          TEXT    PRIMARY KEY,
    graph_id        TEXT    NOT NULL,
    graph_version   TEXT    NOT NULL,
    state           TEXT    NOT NULL DEFAULT 'IDLE',  -- RunState 枚举
    parent_run_id   TEXT,                             -- fork 时填充
    fork_from_step  TEXT,                             -- fork 的起始 step_id
    parent_version  TEXT,                             -- fork 时父 run 的 graph 版本
    input           TEXT,                             -- JSON 序列化
    output          TEXT,                             -- JSON 序列化
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    total_cost_usd  REAL    NOT NULL DEFAULT 0.0,
    duration_ms     INTEGER,
    error           TEXT,                             -- ErrorEnvelope JSON
    started_at      TEXT    NOT NULL,
    completed_at    TEXT,
    created_at      TEXT    NOT NULL,
    FOREIGN KEY (parent_run_id) REFERENCES runs(run_id)
  );
`;

export const CREATE_STEPS = `
  CREATE TABLE IF NOT EXISTS steps (
    step_id       TEXT    PRIMARY KEY,
    run_id        TEXT    NOT NULL,
    node_id       TEXT    NOT NULL,
    node_type     TEXT    NOT NULL,
    node_label    TEXT    NOT NULL,
    state         TEXT    NOT NULL DEFAULT 'PENDING',  -- NodeState 枚举
    inherited     INTEGER NOT NULL DEFAULT 0,          -- 布尔值: 1=继承自父 run
    retry_count   INTEGER NOT NULL DEFAULT 0,
    started_at    TEXT,
    completed_at  TEXT,
    duration_ms   INTEGER,
    sequence      INTEGER NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(run_id)
  );
`;

export const CREATE_EVENTS = `
  CREATE TABLE IF NOT EXISTS events (
    event_id        TEXT    PRIMARY KEY,
    run_id          TEXT    NOT NULL,
    step_id         TEXT    NOT NULL,
    node_id         TEXT    NOT NULL,
    timestamp       TEXT    NOT NULL,
    input_snapshot  TEXT,               -- JSON
    rendered_prompt TEXT,               -- 渲染后的最终 Prompt
    output          TEXT,               -- JSON
    error           TEXT,               -- ErrorEnvelope JSON
    tokens          INTEGER,
    cost_usd        REAL,
    duration_ms     INTEGER,
    provider_meta   TEXT,               -- JSON: {provider, model, temperature, top_p, ...}
    cache_hit       INTEGER,            -- 布尔值
    cache_key       TEXT,
    FOREIGN KEY (run_id)  REFERENCES runs(run_id),
    FOREIGN KEY (step_id) REFERENCES steps(step_id)
  );
`;

export const CREATE_PROVIDERS = `
  CREATE TABLE IF NOT EXISTS providers (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL,   -- openai-compatible | ollama | lm-studio | custom
    base_url        TEXT    NOT NULL,
    api_key         TEXT,               -- API Key 明文（本地应用可接受）
    model           TEXT,               -- 默认使用的模型名
    models          TEXT,               -- JSON 数组（备用，多模型支持）
    supports_streaming  INTEGER NOT NULL DEFAULT 1,
    supports_cost_reporting INTEGER NOT NULL DEFAULT 0,
    version         TEXT,
    api_key_ref     TEXT,               -- 加密存储的 key 引用（保留旧字段兼容）
    is_default      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
  );
`;

export const CREATE_PLUGINS = `
  CREATE TABLE IF NOT EXISTS plugins (
    id                  TEXT    PRIMARY KEY,
    name                TEXT    NOT NULL UNIQUE,
    version             TEXT    NOT NULL,
    type                TEXT    NOT NULL,   -- PluginType 枚举
    display_name        TEXT    NOT NULL,
    description         TEXT    NOT NULL,
    author              TEXT,
    entry               TEXT    NOT NULL,
    schema_version      TEXT    NOT NULL DEFAULT '1.0',
    permissions         TEXT    NOT NULL DEFAULT '[]',  -- JSON 数组
    granted_permissions TEXT    NOT NULL DEFAULT '[]',  -- 用户确认的权限
    dependencies        TEXT,                           -- JSON 对象
    homepage            TEXT,
    repository          TEXT,
    keywords            TEXT,                           -- JSON 数组
    min_icee_version    TEXT,
    enabled             INTEGER NOT NULL DEFAULT 1,
    local_path          TEXT    NOT NULL,
    installed_at        TEXT    NOT NULL
  );
`;

export const CREATE_MEMORIES = `
  CREATE TABLE IF NOT EXISTS memories (
    id          TEXT    PRIMARY KEY,
    run_id      TEXT,
    agent_id    TEXT,
    key         TEXT    NOT NULL,
    value       TEXT    NOT NULL,   -- JSON 序列化
    type        TEXT    NOT NULL DEFAULT 'key-value',
    created_at  TEXT    NOT NULL,
    expires_at  TEXT,
    UNIQUE (agent_id, key)          -- 同一 Agent 下 key 唯一
  );
`;

/** 建表顺序（考虑外键依赖）*/
export const ALL_CREATE_STATEMENTS = [
  CREATE_SCHEMA_VERSIONS,
  CREATE_MIGRATIONS,
  CREATE_RUNS,
  CREATE_STEPS,
  CREATE_EVENTS,
  CREATE_PROVIDERS,
  CREATE_PLUGINS,
  CREATE_MEMORIES,
] as const;

/** 核心索引，提升查询性能 */
export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_steps_run_id    ON steps(run_id);
  CREATE INDEX IF NOT EXISTS idx_steps_state     ON steps(state);
  CREATE INDEX IF NOT EXISTS idx_events_run_id   ON events(run_id);
  CREATE INDEX IF NOT EXISTS idx_events_step_id  ON events(step_id);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_runs_state      ON runs(state);
  CREATE INDEX IF NOT EXISTS idx_runs_graph_id   ON runs(graph_id);
  CREATE INDEX IF NOT EXISTS idx_memories_agent  ON memories(agent_id, key);
`;
