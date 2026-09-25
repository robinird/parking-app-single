import { createClient, Client } from '@libsql/client/web';

export interface DbBranch {
  id: string;
  name: string;
  capacity?: number;
}

export interface DbBench {
  id: string;
  name: string;
  branchId: string;
  capacity?: number;
  token?: string;
  qrCodeToken?: string;
}

export interface DbUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  benchId: string;
  isParked: boolean;
  createdAt?: string;
}

export interface DbAdminConfig {
  totalSpaces: number;
}

export interface FullAppState {
  totalSpaces: number;
  availableSpaces: number;
  branches: DbBranch[];
  benches: DbBench[];
  users: DbUser[];
}

export function getDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      "Les variables d'environnement TURSO_DATABASE_URL et TURSO_AUTH_TOKEN doivent être configurées."
    );
  }

  return createClient({ url, authToken });
}

// ─── Rate Limiting (Anti-Bruteforce) ──────────────────────────────────────────

export async function checkRateLimit(ip: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT 1 FROM login_attempts WHERE ip = ? AND blocked_until IS NOT NULL AND blocked_until > datetime('now')",
    args: [ip]
  });

  return result.rows.length > 0;
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `
      INSERT INTO login_attempts (ip, attempts, blocked_until) 
      VALUES (?, 1, NULL)
      ON CONFLICT(ip) DO UPDATE SET 
        attempts = CASE 
          WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN 1
          ELSE attempts + 1 
        END,
        blocked_until = CASE 
          WHEN (CASE 
            WHEN blocked_until IS NOT NULL AND blocked_until <= datetime('now') THEN 1
            ELSE attempts + 1 
          END) >= 5 THEN datetime('now', '+5 hours')
          ELSE NULL
        END
    `,
    args: [ip]
  });
}

export async function resetFailedAttempts(ip: string): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: 'DELETE FROM login_attempts WHERE ip = ?',
    args: [ip]
  });
}

// ─── Admin Config ─────────────────────────────────────────────────────────────

export async function getAdminConfig(): Promise<DbAdminConfig> {
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT value FROM admin_config WHERE key = 'total_spaces'",
    args: [],
  });

  if (result.rows.length === 0) {
    return { totalSpaces: 50 };
  }

  return { totalSpaces: Number(result.rows[0].value) || 50 };
}

export async function updateAdminConfig(totalSpaces: number): Promise<void> {
  try {
    const client = getDbClient();
    await client.execute({
      sql: "INSERT INTO admin_config (key, value) VALUES ('total_spaces', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [String(totalSpaces)],
    });
  } catch (error) {
    console.error("Erreur DB updateAdminConfig:", error);
    throw error;
  }
}

// ─── Branches & Benches ───────────────────────────────────────────────────────

export async function getBranches(): Promise<DbBranch[]> {
  const client = getDbClient();
  const result = await client.execute(
    'SELECT id, name, capacity FROM branches ORDER BY name ASC'
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    capacity: row.capacity != null ? Number(row.capacity) : undefined,
  }));
}

export async function getBenches(): Promise<DbBench[]> {
  const client = getDbClient();
  const result = await client.execute(
    'SELECT id, branch_id, name, capacity, token, qr_code_token FROM benches ORDER BY name ASC'
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    branchId: String(row.branch_id),
    capacity: row.capacity != null ? Number(row.capacity) : undefined,
    token: row.token ? String(row.token) : undefined,
    qrCodeToken: row.qr_code_token ? String(row.qr_code_token) : undefined,
  }));
}

export async function syncBranches(branches: DbBranch[], isDeletePhase: boolean = false): Promise<void> {
  try {
    const client = getDbClient();
    
    if (isDeletePhase) {
      const currentBranches = await getBranches();
      const incomingIds = new Set(branches.map((b) => b.id));
      const toDelete = currentBranches.filter((b) => !incomingIds.has(b.id));

      for (const b of toDelete) {
        await client.execute({
          sql: 'DELETE FROM branches WHERE id = ?',
          args: [b.id],
        });
      }
    } else {
      for (const b of branches) {
        await client.execute({
          sql: `INSERT INTO branches (id, name, capacity) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, capacity = excluded.capacity`,
          args: [b.id, b.name, b.capacity ?? null],
        });
      }
    }
  } catch (error) {
    console.error("Erreur DB syncBranches:", error);
    throw error;
  }
}

export async function syncBenches(benches: DbBench[], isDeletePhase: boolean = false): Promise<void> {
  try {
    const client = getDbClient();
    
    if (isDeletePhase) {
      const currentBenches = await getBenches();
      const incomingIds = new Set(benches.map((b) => b.id));
      const toDelete = currentBenches.filter((b) => !incomingIds.has(b.id));

      for (const b of toDelete) {
        await client.execute({
          sql: 'DELETE FROM benches WHERE id = ?',
          args: [b.id],
        });
      }
    } else {
      for (const b of benches) {
        await client.execute({
          sql: `INSERT INTO benches (id, branch_id, name, capacity, token, qr_code_token) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                  branch_id = excluded.branch_id, 
                  name = excluded.name, 
                  capacity = excluded.capacity, 
                  token = excluded.token, 
                  qr_code_token = excluded.qr_code_token`,
          args: [
            b.id,
            b.branchId,
            b.name,
            b.capacity ?? null,
            b.token ?? null,
            b.qrCodeToken ?? null,
          ],
        });
      }
    }
  } catch (error) {
    console.error("Erreur DB syncBenches:", error);
    throw error;
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<DbUser[]> {
  const client = getDbClient();
  const result = await client.execute(
    'SELECT id, first_name, last_name, role, bench_id, is_parked, created_at FROM users'
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    role: row.role ? String(row.role) : undefined,
    benchId: String(row.bench_id ?? ''),
    isParked: Boolean(row.is_parked),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  }));
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: 'SELECT id, first_name, last_name, role, bench_id, is_parked, created_at FROM users WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    role: row.role ? String(row.role) : undefined,
    benchId: String(row.bench_id ?? ''),
    isParked: Boolean(row.is_parked),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function upsertUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  benchId: string;
}): Promise<void> {
  const client = getDbClient();
  await client.execute({
    sql: `
      INSERT INTO users (id, first_name, last_name, bench_id, is_parked)
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name  = excluded.last_name,
        bench_id   = excluded.bench_id
    `,
    args: [user.id, user.firstName, user.lastName, user.benchId],
  });
}

export async function setUserParkedStatus(
  userId: string,
  isParked: boolean,
  txClient?: any
): Promise<void> {
  const client = txClient || getDbClient();
  await client.execute({
    sql: 'UPDATE users SET is_parked = ? WHERE id = ?',
    args: [isParked ? 1 : 0, userId],
  });
}

export async function getFullAppState(): Promise<FullAppState> {
  const config = await getAdminConfig();
  const branches = await getBranches();
  const benches = await getBenches();
  const users = await getUsers();

  const parkedUsersCount = users.filter((u) => u.isParked).length;
  const availableSpaces = Math.max(0, config.totalSpaces - parkedUsersCount);

  return {
    totalSpaces: config.totalSpaces,
    availableSpaces,
    branches,
    benches,
    users,
  };
}