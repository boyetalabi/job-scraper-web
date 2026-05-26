const path = require('path');
const { Pool } = require('pg');

let dbInstance = null;
const usePg = !!process.env.DATABASE_URL;

class DbWrapper {
  constructor(poolOrDb) {
    this.db = poolOrDb;
  }

  _convertSql(sql) {
    if (!usePg) return sql;
    let count = 1;
    return sql.replace(/\?/g, () => `$${count++}`);
  }

  _mapRow(row) {
    if (!row || !usePg) return row;
    const mapped = {};
    for (const key in row) {
      if (key === 'searchcriteria') mapped.searchCriteria = row[key];
      else if (key === 'notificationemails') mapped.notificationEmails = row[key];
      else if (key === 'frequencyminutes') mapped.frequencyMinutes = row[key];
      else if (key === 'targeturls') mapped.targetUrls = row[key];
      else if (key === 'maxdaysold') mapped.maxDaysOld = row[key];
      else if (key === 'dateposted') mapped.datePosted = row[key];
      else if (key === 'matchedcriteria') mapped.matchedCriteria = row[key];
      else if (key === 'seenat') mapped.seenAt = row[key];
      else mapped[key] = row[key];
    }
    return mapped;
  }

  async get(sql, params = []) {
    if (usePg) {
      const res = await this.db.query(this._convertSql(sql), params);
      return this._mapRow(res.rows[0]);
    } else {
      return this.db.get(sql, params);
    }
  }

  async all(sql, params = []) {
    if (usePg) {
      const res = await this.db.query(this._convertSql(sql), params);
      return res.rows.map(r => this._mapRow(r));
    } else {
      return this.db.all(sql, params);
    }
  }

  async run(sql, params = []) {
    if (usePg) {
      await this.db.query(this._convertSql(sql), params);
    } else {
      await this.db.run(sql, params);
    }
  }

  async exec(sql) {
    if (usePg) {
      await this.db.query(sql);
    } else {
      await this.db.exec(sql);
    }
  }
}

async function getDb() {
  if (dbInstance) return dbInstance;

  if (usePg) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    dbInstance = new DbWrapper(pool);
  } else {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    const sqliteDb = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });
    dbInstance = new DbWrapper(sqliteDb);
  }

  return dbInstance;
}

async function initDb() {
  const db = await getDb();
  
  // Postgres requires slightly different types, e.g. SERIAL instead of INTEGER PRIMARY KEY AUTOINCREMENT
  // But for simple tables, INTEGER PRIMARY KEY works if we provide IDs (which we do for config, but what about jobs? id is TEXT).
  const configTableQuery = usePg 
    ? `CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        searchCriteria TEXT,
        notificationEmails TEXT,
        frequencyMinutes INTEGER,
        targetUrls TEXT,
        maxDaysOld INTEGER
      );`
    : `CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        searchCriteria TEXT,
        notificationEmails TEXT,
        frequencyMinutes INTEGER,
        targetUrls TEXT,
        maxDaysOld INTEGER
      );`;

  const jobsTableQuery = usePg
    ? `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT,
        location TEXT,
        type TEXT,
        datePosted TEXT,
        url TEXT,
        matchedCriteria TEXT,
        seenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    : `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT,
        location TEXT,
        type TEXT,
        datePosted TEXT,
        url TEXT,
        matchedCriteria TEXT,
        seenAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`;

  await db.exec(configTableQuery);
  await db.exec(jobsTableQuery);

  const config = await db.get('SELECT * FROM config WHERE id = 1');
  if (!config) {
    await db.run(`
      INSERT INTO config (id, searchCriteria, notificationEmails, frequencyMinutes, targetUrls, maxDaysOld)
      VALUES (
        1, 
        'Clinical Care Technician, Essex County New Jersey, Medical Assistant, Full time',
        'olubunmiakande220@gmail.com',
        5,
        'https://pm.healthcaresource.com/CS/rwjbarnabashealth',
        7
      )
    `);
  }
}

module.exports = { getDb, initDb };
