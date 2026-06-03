import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';

// ====== 配置 ======
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'hazard.db');

// ====== 密码工具（独立，避免循环依赖） ======
function hashPassword(password: string): string {
  if (!password) return '';
  return createHash('sha256').update(password, 'utf8').digest('hex');
}
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ====== 数据库初始化 ======
let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  
  // 确保 data 目录存在
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');  // WAL 模式，支持并发读
  db.exec('PRAGMA busy_timeout = 5000'); // 冲突时等待 5 秒
  initTables();
  return db;
}

function initTables() {
  db!.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'inspector',
      name TEXT NOT NULL DEFAULT '',
      employee_id TEXT NOT NULL DEFAULT '',
      inspection_center TEXT NOT NULL DEFAULT '',
      inspection_department TEXT NOT NULL DEFAULT '',
      inspection_team TEXT NOT NULL DEFAULT '',
      inspection_position TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hazards (
      id TEXT PRIMARY KEY,
      serial_number TEXT DEFAULT '',
      inspection_center TEXT DEFAULT '',
      inspection_department TEXT DEFAULT '',
      inspection_team TEXT DEFAULT '',
      inspection_position TEXT DEFAULT '',
      inspector_id TEXT DEFAULT '',
      inspector_name TEXT DEFAULT '',
      inspector TEXT DEFAULT '',
      inspection_date TEXT DEFAULT '',
      inspection_location TEXT DEFAULT '',
      line TEXT DEFAULT '',
      hazard_description TEXT DEFAULT '',
      hazard_category TEXT DEFAULT '',
      hazard_level TEXT DEFAULT 'general_i',
      temporary_measures TEXT DEFAULT '',
      governance_department TEXT DEFAULT '',
      cooperating_department TEXT DEFAULT '',
      governance_person TEXT DEFAULT '',
      governance_measure TEXT DEFAULT '',
      governance_deadline TEXT DEFAULT '',
      governance_result TEXT DEFAULT '',
      governance_details TEXT DEFAULT '',
      reviewer_id TEXT DEFAULT '',
      reviewer_name TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      related_risk_id TEXT DEFAULT '',
      related_risk_serial TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      ai_analysis_result TEXT DEFAULT '',
      deadline_warning TEXT DEFAULT 'normal',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS risk_items (
      id TEXT PRIMARY KEY,
      serial_number TEXT DEFAULT '',
      business_module TEXT DEFAULT '',
      specific_location TEXT DEFAULT '',
      risk_point_description TEXT DEFAULT '',
      risk_point_location TEXT DEFAULT '',
      risk_level TEXT DEFAULT 'general',
      risk_control_measures TEXT DEFAULT '',
      hazard_inspection_method TEXT DEFAULT '',
      hazard_inspection_cycle TEXT DEFAULT '',
      hazard_inspection_position TEXT DEFAULT '',
      control_responsibility_unit TEXT DEFAULT '',
      control_responsibility_position TEXT DEFAULT '',
      remarks TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      version INTEGER DEFAULT 1
    );
  `);
}

// ====== 数据迁移：从 JSON 迁移到 SQLite ======
function migrateIfNeeded() {
  const db = getDb();
  // 检查是否已有数据
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (row.cnt > 0) return; // 已有数据，跳过

  // 尝试从旧 JSON 文件导入
  const jsonDir = DB_DIR;
  let migrated = false;

  // 迁移 users
  const usersFile = path.join(jsonDir, 'users.json');
  if (fs.existsSync(usersFile)) {
    try {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      if (Array.isArray(users) && users.length > 0) {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO users (id, username, password_hash, role, name, employee_id, inspection_center, inspection_department, inspection_team, inspection_position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of users) {
          insert.run(u.id, u.username, u.password_hash, u.role || 'inspector', u.name || '', u.employee_id || '', u.inspection_center || '', u.inspection_department || '', u.inspection_team || '', u.inspection_position || '', u.created_at || new Date().toISOString(), u.updated_at || new Date().toISOString());
        }
        migrated = true;
        console.log(`[DB] 已迁移 ${users.length} 条用户数据`);
      }
    } catch (e) {}
  }

  // 迁移 hazards
  const hazardsFile = path.join(jsonDir, 'hazards.json');
  if (fs.existsSync(hazardsFile)) {
    try {
      const hazards = JSON.parse(fs.readFileSync(hazardsFile, 'utf-8'));
      if (Array.isArray(hazards) && hazards.length > 0) {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO hazards (id, serial_number, inspection_center, inspection_department, inspection_team, inspection_position, inspector_id, inspector_name, inspector, inspection_date, inspection_location, line, hazard_description, hazard_category, hazard_level, temporary_measures, governance_department, cooperating_department, governance_person, governance_measure, governance_deadline, governance_result, governance_details, reviewer_id, reviewer_name, status, related_risk_id, related_risk_serial, images, ai_analysis_result, deadline_warning, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const h of hazards) {
          const images = Array.isArray(h.images) ? JSON.stringify(h.images) : (h.images || '[]');
          insert.run(
            h.id, h.serial_number || '', h.inspection_center || '', h.inspection_department || '',
            h.inspection_team || '', h.inspection_position || '', h.inspector_id || '',
            h.inspector_name || h.inspector || '', h.inspector || '',
            h.inspection_date || '', h.inspection_location || '', h.line || '',
            h.hazard_description || '', h.hazard_category || '', h.hazard_level || 'general_i',
            h.temporary_measures || '', h.governance_department || '', h.cooperating_department || '',
            h.governance_person || '', h.governance_measure || '', h.governance_deadline || '',
            h.governance_result || '', h.governance_details || '', h.reviewer_id || '',
            h.reviewer_name || '', h.status || 'draft', h.related_risk_id || '',
            h.related_risk_serial || '', images, h.ai_analysis_result || '',
            h.deadline_warning || 'normal', h.created_by || '',
            h.created_at || new Date().toISOString(), h.updated_at || new Date().toISOString()
          );
        }
        migrated = true;
        console.log(`[DB] 已迁移 ${hazards.length} 条隐患数据`);
      }
    } catch (e) {}
  }

  // 迁移 risk_items
  const riskFile = path.join(jsonDir, 'risk-items.json');
  if (fs.existsSync(riskFile)) {
    try {
      const items = JSON.parse(fs.readFileSync(riskFile, 'utf-8'));
      if (Array.isArray(items) && items.length > 0) {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO risk_items (id, serial_number, business_module, specific_location, risk_point_description, risk_point_location, risk_level, risk_control_measures, hazard_inspection_method, hazard_inspection_cycle, hazard_inspection_position, control_responsibility_unit, control_responsibility_position, remarks, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of items) {
          insert.run(
            r.id || Date.now().toString(), r.serial_number || '', r.business_module || '',
            r.specific_location || '', r.risk_point_description || '', r.risk_point_location || '',
            r.risk_level || 'general', r.risk_control_measures || '', r.hazard_inspection_method || '',
            r.hazard_inspection_cycle || '', r.hazard_inspection_position || '',
            r.control_responsibility_unit || '', r.control_responsibility_position || '',
            r.remarks || '', r.created_at || new Date().toISOString(),
            r.updated_at || new Date().toISOString(), r.version || 1
          );
        }
        migrated = true;
        console.log(`[DB] 已迁移 ${items.length} 条风险数据`);
      }
    } catch (e) {}
  }

  if (!migrated) {
    // 无旧数据，插入默认用户
    seedDefaultData();
  }
}

// ====== 默认数据 ======
function seedDefaultData() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (existing.cnt > 0) return;

  const insert = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, name, employee_id, inspection_center, inspection_department, inspection_team, inspection_position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  insert.run('1', 'admin', hashPassword('admin123'), 'admin', '系统管理员', 'A001', '物资后勤中心', '综合管理部', '', '');
  insert.run('2', 'inspector1', hashPassword('admin123'), 'inspector', '张三', 'E001', '物资后勤中心', '物资仓储部', '仓储班', '仓管员');
  insert.run('3', 'reviewer1', hashPassword('admin123'), 'reviewer', '李四', 'M001', '物资后勤中心', '安全工作部', '安全组', '安全工作岗');

  console.log('[DB] 已创建默认用户数据');
}

// ====== 导出函数 ======
export { hashPassword, verifyPassword };

// ----- 用户操作 -----
export async function getUsers(): Promise<any[]> {
  const db = getDb();
  migrateIfNeeded();
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as any[];
}

export async function getUserByUsername(username: string): Promise<any | null> {
  const db = getDb();
  migrateIfNeeded();
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  return row || null;
}

export async function getUserById(id: string): Promise<any | null> {
  const db = getDb();
  migrateIfNeeded();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row || null;
}

export async function saveUsers(users: any[]): Promise<boolean> {
  const db = getDb();
  const del = db.prepare('DELETE FROM users');
  const ins = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, name, employee_id, inspection_center, inspection_department, inspection_team, inspection_position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run();
    for (const u of users) {
      ins.run(u.id, u.username, u.password_hash, u.role, u.name, u.employee_id, u.inspection_center, u.inspection_department, u.inspection_team, u.inspection_position, u.created_at, u.updated_at);
    }
  });
  tx();
  return true;
}

export async function createUser(data: any): Promise<any | null> {
  const db = getDb();
  migrateIfNeeded();
  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username) as any;
  if (existing) return null;

  const id = Date.now().toString();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, name, employee_id, inspection_center, inspection_department, inspection_team, inspection_position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.username, hashPassword(data.password), data.role || 'inspector', data.name || '', data.employee_id || '', data.inspection_center || '物资后勤中心', data.inspection_department || '', data.inspection_team || '', data.inspection_position || '', now, now);

  return getUserById(id);
}

export async function updateUser(id: string, updates: any): Promise<boolean> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'password_hash') {
      // Handle password field specially
      if (key === 'password') {
        fields.push('password_hash = ?');
        values.push(hashPassword(val as string));
      } else {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
  }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return (result as any).changes > 0;
}

// ----- 隐患操作 -----
export async function getHazards(): Promise<any[]> {
  const db = getDb();
  migrateIfNeeded();
  const rows = db.prepare('SELECT * FROM hazards ORDER BY created_at DESC').all() as any[];
  // ���� images ����SQLite �4�� JSON �������
  return rows.map(row => {
    if (row.images) {
      try { row.images = JSON.parse(row.images); } catch { row.images = []; }
    } else {
      row.images = [];
    }
    return row;
  });
}

export async function getHazardById(id: string): Promise<any | null> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM hazards WHERE id = ?').get(id) as any;
  if (row && row.images) {
    try { row.images = JSON.parse(row.images); } catch { row.images = []; }
  }
  return row || null;
}

export async function saveHazards(hazards: any[]): Promise<boolean> {
  const db = getDb();
  const del = db.prepare('DELETE FROM hazards');
  const ins = db.prepare(`
    INSERT INTO hazards (id, serial_number, inspection_center, inspection_department, inspection_team, inspection_position, inspector_id, inspector_name, inspector, inspection_date, inspection_location, line, hazard_description, hazard_category, hazard_level, temporary_measures, governance_department, cooperating_department, governance_person, governance_measure, governance_deadline, governance_result, governance_details, reviewer_id, reviewer_name, status, related_risk_id, related_risk_serial, images, ai_analysis_result, deadline_warning, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run();
    for (const h of hazards) {
      const images = Array.isArray(h.images) ? JSON.stringify(h.images) : (h.images || '[]');
      ins.run(
        h.id, h.serial_number || '', h.inspection_center || '', h.inspection_department || '',
        h.inspection_team || '', h.inspection_position || '', h.inspector_id || '',
        h.inspector_name || h.inspector || '', h.inspector || '',
        h.inspection_date || '', h.inspection_location || '', h.line || '',
        h.hazard_description || '', h.hazard_category || '', h.hazard_level || 'general_i',
        h.temporary_measures || '', h.governance_department || '', h.cooperating_department || '',
        h.governance_person || '', h.governance_measure || '', h.governance_deadline || '',
        h.governance_result || '', h.governance_details || '', h.reviewer_id || '',
        h.reviewer_name || '', h.status || 'draft', h.related_risk_id || '',
        h.related_risk_serial || '', images, h.ai_analysis_result || '',
        h.deadline_warning || 'normal', h.created_by || '',
        h.created_at || new Date().toISOString(), h.updated_at || new Date().toISOString()
      );
    }
  });
  tx();
  return true;
}

export async function addHazard(hazard: any): Promise<boolean> {
  const db = getDb();
  migrateIfNeeded();
  const images = Array.isArray(hazard.images) ? JSON.stringify(hazard.images) : (hazard.images || '[]');
  db.prepare(`
    INSERT INTO hazards (id, serial_number, inspection_center, inspection_department, inspection_team, inspection_position, inspector_id, inspector_name, inspector, inspection_date, inspection_location, line, hazard_description, hazard_category, hazard_level, temporary_measures, governance_department, cooperating_department, governance_person, governance_measure, governance_deadline, governance_result, governance_details, reviewer_id, reviewer_name, status, related_risk_id, related_risk_serial, images, ai_analysis_result, deadline_warning, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    hazard.id, hazard.serial_number || '', hazard.inspection_center || '', hazard.inspection_department || '',
    hazard.inspection_team || '', hazard.inspection_position || '', hazard.inspector_id || '',
    hazard.inspector_name || hazard.inspector || '', hazard.inspector || '',
    hazard.inspection_date || '', hazard.inspection_location || '', hazard.line || '',
    hazard.hazard_description || '', hazard.hazard_category || '', hazard.hazard_level || 'general_i',
    hazard.temporary_measures || '', hazard.governance_department || '', hazard.cooperating_department || '',
    hazard.governance_person || '', hazard.governance_measure || '', hazard.governance_deadline || '',
    hazard.governance_result || '', hazard.governance_details || '', hazard.reviewer_id || '',
    hazard.reviewer_name || '', hazard.status || 'draft', hazard.related_risk_id || '',
    hazard.related_risk_serial || '', images, hazard.ai_analysis_result || '',
    hazard.deadline_warning || 'normal', hazard.created_by || '',
    hazard.created_at || new Date().toISOString(), hazard.updated_at || new Date().toISOString()
  );
  return true;
}

export async function updateHazard(id: string, updates: any): Promise<boolean> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (key === 'id') continue;
    if (key === 'images') {
      fields.push('images = ?');
      values.push(Array.isArray(val) ? JSON.stringify(val) : val);
    } else {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE hazards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return true;
}

export async function deleteHazard(id: string): Promise<boolean> {
  const db = getDb();
  const result = db.prepare('DELETE FROM hazards WHERE id = ?').run(id);
  return (result as any).changes > 0;
}

// ----- 风险数据库操作 -----
export async function getRiskItems(): Promise<any[]> {
  const db = getDb();
  migrateIfNeeded();
  return db.prepare('SELECT * FROM risk_items ORDER BY serial_number ASC').all() as any[];
}

export async function saveRiskItems(items: any[]): Promise<boolean> {
  const db = getDb();
  const del = db.prepare('DELETE FROM risk_items');
  const ins = db.prepare(`
    INSERT INTO risk_items (id, serial_number, business_module, specific_location, risk_point_description, risk_point_location, risk_level, risk_control_measures, hazard_inspection_method, hazard_inspection_cycle, hazard_inspection_position, control_responsibility_unit, control_responsibility_position, remarks, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run();
    for (const r of items) {
      ins.run(
        r.id, r.serial_number || '', r.business_module || '', r.specific_location || '',
        r.risk_point_description || '', r.risk_point_location || '', r.risk_level || 'general',
        r.risk_control_measures || '', r.hazard_inspection_method || '', r.hazard_inspection_cycle || '',
        r.hazard_inspection_position || '', r.control_responsibility_unit || '',
        r.control_responsibility_position || '', r.remarks || '',
        r.created_at || new Date().toISOString(), r.updated_at || new Date().toISOString(), r.version || 1
      );
    }
  });
  tx();
  return true;
}

export async function addRiskItem(item: any): Promise<boolean> {
  const db = getDb();
  migrateIfNeeded();
  db.prepare(`
    INSERT INTO risk_items (id, serial_number, business_module, specific_location, risk_point_description, risk_point_location, risk_level, risk_control_measures, hazard_inspection_method, hazard_inspection_cycle, hazard_inspection_position, control_responsibility_unit, control_responsibility_position, remarks, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id || Date.now().toString(), item.serial_number || '', item.business_module || '',
    item.specific_location || '', item.risk_point_description || '', item.risk_point_location || '',
    item.risk_level || 'general', item.risk_control_measures || '', item.hazard_inspection_method || '',
    item.hazard_inspection_cycle || '', item.hazard_inspection_position || '',
    item.control_responsibility_unit || '', item.control_responsibility_position || '',
    item.remarks || '', item.created_at || new Date().toISOString(),
    item.updated_at || new Date().toISOString(), item.version || 1
  );
  return true;
}

export async function updateRiskItem(id: string, updates: any): Promise<boolean> {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE risk_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return true;
}

export async function deleteRiskItem(id: string): Promise<boolean> {
  const db = getDb();
  const result = db.prepare('DELETE FROM risk_items WHERE id = ?').run(id);
  return (result as any).changes > 0;
}

// ====== 初始化 ======
export async function initializeData() {
  getDb();
  migrateIfNeeded();
}


// ====== 密码哈希函数已直接定义在本文件上方（非公开导出），路由层从 crypto.ts 导入即可 ======
