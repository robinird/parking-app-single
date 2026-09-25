PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS parking_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS benches;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS admin_config;

CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE benches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    bench_id TEXT NOT NULL,
    is_parked INTEGER DEFAULT 0 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bench_id) REFERENCES benches(id) ON DELETE RESTRICT
);

CREATE TABLE parking_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_spaces INTEGER NOT NULL DEFAULT 50,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin_config (id, total_spaces) VALUES (1, 50);

PRAGMA foreign_keys = ON;