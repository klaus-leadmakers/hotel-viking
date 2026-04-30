#!/usr/bin/env node
// Hotel Viking Staging Ops Server
// Handles backup (DB + code), restore and deploy-to-live

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4601;
const OPS_TOKEN = 'ops-hvk-d3a5f2e1b8c9';
const BACKUP_DIR = '/opt/hotel-backups';
const STAGING_DIR = '/opt/hotel-platform-staging';
const LIVE_DIR = '/opt/hotel-platform';
const STG_DB_CONTAINER = 'hotel-staging-postgres';
const STG_DB_NAME = 'hotel_platform_staging';
const STG_DB_USER = 'hotelapp';

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ops-token');
}
function ok(res, data, status) {
  cors(res); res.writeHead(status||200, {'Content-Type':'application/json'}); res.end(JSON.stringify(data));
}
function run(cmd) { return execSync(cmd, {encoding:'utf8', timeout:600000}); }
function runBg(cmd, logFile) {
  const child = require('child_process').spawn('bash', ['-c', cmd + ' >> ' + logFile + ' 2>&1'], {detached:true, stdio:'ignore'});
  child.unref(); return child.pid;
}
function readBody(req) {
  return new Promise(r => { let b=''; req.on('data', d => b+=d); req.on('end', () => r(b||'{}')); });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }
  const authed = req.headers['x-ops-token'] === OPS_TOKEN;
  const url = req.url.split('?')[0];
  const qs = new URL('http://x' + req.url).searchParams;

  if (url === '/health') return ok(res, { ok: true, ts: new Date().toISOString() });
  if (!authed) return ok(res, { error: 'Unauthorized' }, 401);

  try {
    // ── LIST BACKUPS ──────────────────────────────────────────────────
    if (url === '/backups' && req.method === 'GET') {
      const dirs = fs.existsSync(BACKUP_DIR)
        ? fs.readdirSync(BACKUP_DIR).filter(d => {
            try { return fs.statSync(path.join(BACKUP_DIR,d)).isDirectory(); } catch { return false; }
          }).sort().reverse()
        : [];
      const backups = dirs.map(d => {
        const mf = path.join(BACKUP_DIR, d, 'meta.json');
        const meta = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf,'utf8')) : {};
        const dbf = path.join(BACKUP_DIR, d, 'db.sql.gz');
        const codef = path.join(BACKUP_DIR, d, 'code.tar.gz');
        return {
          id: d,
          dbBytes: fs.existsSync(dbf) ? fs.statSync(dbf).size : 0,
          codeBytes: fs.existsSync(codef) ? fs.statSync(codef).size : 0,
          hasCode: fs.existsSync(codef),
          ...meta
        };
      });
      return ok(res, { backups });
    }

    // ── CREATE BACKUP (DB + code snapshot) ───────────────────────────
    if (url === '/backup' && req.method === 'POST') {
      const ts = new Date().toISOString().replace(/[:.]/g,'-').replace('T','_').slice(0,19);
      const dir = path.join(BACKUP_DIR, ts);
      fs.mkdirSync(dir, { recursive: true });
      const meta = { id: ts, createdAt: new Date().toISOString(), status: 'running' };
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta));
      const logFile = path.join(dir, 'backup.log');

      const cmd = [
        'echo "=== Step 1/6: Syncing API code ==="',
        'rsync -a --delete --exclude=node_modules --exclude=dist --exclude=.env ' + STAGING_DIR + '/api/ ' + LIVE_DIR + '/api/',
        'echo "=== Step 2/6: Syncing admin code ==="',
        'rsync -a --delete --exclude=node_modules --exclude=.next --exclude=\".env*\" ' + STAGING_DIR + '/admin/ ' + LIVE_DIR + '/admin/',
        'echo "=== Step 3/6: Git commit + push ==="',
        'cd ' + LIVE_DIR + ' && git add -A && (git diff --cached --quiet || git commit -m "deploy: sync from staging $(date +%H:%M)") && git push origin main || true',
        'echo "=== Step 4/6: Building live admin ==="',
        'cd ' + LIVE_DIR + ' && docker compose build admin',
        'echo "=== Step 5/6: Restarting live admin ==="',
        'cd ' + LIVE_DIR + ' && docker compose up -d --no-deps admin',
        'echo "DEPLOY_COMPLETE"'
      ].join(' && ');

      runBg(cmd, logFile);
      return ok(res, { ok: true, id: ts });
    }

    // ── BACKUP STATUS ─────────────────────────────────────────────────
    if (url === '/backup-status' && req.method === 'GET') {
      const id = qs.get('id');
      const dir = path.join(BACKUP_DIR, id);
      const mf = path.join(dir, 'meta.json');
      if (!fs.existsSync(mf)) return ok(res, { error: 'Not found' }, 404);
      const meta = JSON.parse(fs.readFileSync(mf,'utf8'));
      const log = fs.existsSync(path.join(dir,'backup.log')) ? fs.readFileSync(path.join(dir,'backup.log'),'utf8') : '';
      const done = log.includes('BACKUP_COMPLETE') || meta.status === 'completed';
      const dbBytes = fs.existsSync(path.join(dir,'db.sql.gz')) ? fs.statSync(path.join(dir,'db.sql.gz')).size : 0;
      const codeBytes = fs.existsSync(path.join(dir,'code.tar.gz')) ? fs.statSync(path.join(dir,'code.tar.gz')).size : 0;
      if (done && meta.status === 'running') {
        meta.status = 'completed';
        meta.completedAt = new Date().toISOString();
        fs.writeFileSync(mf, JSON.stringify(meta));
      }
      return ok(res, { ...meta, log, dbBytes, codeBytes, hasCode: codeBytes > 0 });
    }

    // ── RESTORE (DB + code, then rebuild) ────────────────────────────
    if (url === '/restore' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const { id } = body;
      const dir = path.join(BACKUP_DIR, id);
      const dbf = path.join(dir, 'db.sql.gz');
      const codef = path.join(dir, 'code.tar.gz');
      if (!fs.existsSync(dbf)) return ok(res, { error: 'Backup not found' }, 404);

      const logFile = '/tmp/restore_' + Date.now() + '.log';
      fs.writeFileSync(logFile, 'Starting restore from ' + id + '\n');

      const hasCode = fs.existsSync(codef);
      const codeSteps = hasCode ? [
        'echo "=== Step 3/4: Restoring code snapshot ==="',
        'tar -xzf ' + codef + ' -C /',
        'echo "Code restored OK"',
        'echo "=== Step 4/4: Rebuilding admin container ==="',
        'cd ' + STAGING_DIR + ' && docker compose -f docker-compose.staging.yml build staging-admin',
        'cd ' + STAGING_DIR + ' && docker compose -f docker-compose.staging.yml up -d staging-admin',
        'echo "Admin rebuilt OK"'
      ] : [
        'echo "No code snapshot in this backup — skipping code restore"'
      ];

      const cmd = [
        'echo "=== Step 1/4: Stopping API ==="',
        'docker stop hotel-staging-api 2>/dev/null || true',
        'echo "=== Step 2/4: Restoring database ==="',
        'docker exec ' + STG_DB_CONTAINER + ' psql -U ' + STG_DB_USER + ' -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=\'' + STG_DB_NAME + '\' AND pid<>pg_backend_pid();" postgres',
        'docker exec ' + STG_DB_CONTAINER + ' psql -U ' + STG_DB_USER + ' -c "DROP DATABASE IF EXISTS ' + STG_DB_NAME + ';" postgres',
        'docker exec ' + STG_DB_CONTAINER + ' psql -U ' + STG_DB_USER + ' -c "CREATE DATABASE ' + STG_DB_NAME + ';" postgres',
        'zcat ' + dbf + ' | docker exec -i ' + STG_DB_CONTAINER + ' psql -U ' + STG_DB_USER + ' ' + STG_DB_NAME,
        'echo "Database restored OK"',
        'echo "Restarting API"',
        'cd ' + STAGING_DIR + ' && docker compose -f docker-compose.staging.yml up -d staging-api',
        ...codeSteps,
        'echo "RESTORE_COMPLETE"'
      ].join(' && ');

      runBg(cmd, logFile);
      return ok(res, { ok: true, logFile, hasCode });
    }

    // ── RESTORE LOG ───────────────────────────────────────────────────
    if (url === '/restore-log' && req.method === 'GET') {
      const f = qs.get('file');
      if (!f || !f.startsWith('/tmp/restore_')) return ok(res, { error: 'Invalid' }, 400);
      const log = fs.existsSync(f) ? fs.readFileSync(f,'utf8') : '';
      const done = log.includes('RESTORE_COMPLETE') || log.includes('Error');
      return ok(res, { log, done });
    }

    // ── DEPLOY TO LIVE ────────────────────────────────────────────────
    if (url === '/deploy' && req.method === 'POST') {
      const logFile = '/tmp/deploy_' + Date.now() + '.log';
      fs.writeFileSync(logFile, 'Starting deploy to live...\n');

      const cmd = [
        'echo "=== Step 1/5: Syncing API code ==="',
        'rsync -a --delete --exclude=node_modules --exclude=dist --exclude=.env ' + STAGING_DIR + '/api/ ' + LIVE_DIR + '/api/',
        'echo "=== Step 2/5: Syncing admin code ==="',
        'rsync -a --delete --exclude=node_modules --exclude=.next --exclude=\".env*\" ' + STAGING_DIR + '/admin/ ' + LIVE_DIR + '/admin/',
        'echo "=== Step 3/5: Git commit + push til GitHub ==="',
        'cd ' + LIVE_DIR + ' && git add -A && (git diff --cached --quiet || git commit -m "deploy: sync from staging") && git push origin main || true',
        'echo "=== Step 4/5: Building live admin ==="',
        'cd ' + LIVE_DIR + ' && docker compose build admin',
        'echo "=== Step 5/5: Restarting live admin ==="',
        'cd ' + LIVE_DIR + ' && docker compose up -d --no-deps admin',
        'echo "DEPLOY_COMPLETE"'
      ].join(' && ');

      runBg(cmd, logFile);
      return ok(res, { ok: true, logFile });
    }

    // ── DEPLOY LOG ────────────────────────────────────────────────────
    if (url === '/deploy-log' && req.method === 'GET') {
      const f = qs.get('file');
      if (!f || !f.startsWith('/tmp/deploy_')) return ok(res, { error: 'Invalid' }, 400);
      const log = fs.existsSync(f) ? fs.readFileSync(f,'utf8') : 'Log not ready...';
      const done = log.includes('DEPLOY_COMPLETE') || log.includes('error:');
      return ok(res, { log, done });
    }


    if (url === '/backup' && req.method === 'DELETE') {
      const body = JSON.parse(await readBody(req));
      const { id } = body;
      if (!id || id.includes('..') || id.includes('/')) return ok(res, { error: 'Invalid id' }, 400);
      const dir = path.join(BACKUP_DIR, id);
      if (!fs.existsSync(dir)) return ok(res, { error: 'Not found' }, 404);
      run('rm -rf ' + dir);
      return ok(res, { ok: true });
    }

    // ── DELETE BACKUP ─────────────────────────────────────────────────
    if (url === '/backup' && req.method === 'DELETE') {
      const body = JSON.parse(await readBody(req));
      const { id } = body;
      if (!id || id.includes('..') || id.includes('/')) return ok(res, { error: 'Invalid id' }, 400);
      const dir = path.join(BACKUP_DIR, id);
      if (!fs.existsSync(dir)) return ok(res, { error: 'Not found' }, 404);
      run('rm -rf ' + dir);
      return ok(res, { ok: true });
    }

    return ok(res, { error: 'Not found' }, 404);
  } catch(e) {
    return ok(res, { error: e.message }, 500);
  }
}

const server = http.createServer(handle);
server.listen(PORT, '127.0.0.1', () => console.log('Ops server on ' + PORT));
process.on('uncaughtException', e => console.error('uncaught:', e.message));
