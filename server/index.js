import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDataDir, readData, writeData,
  createAutoBackup, listBackups, restoreBackup, exportAll
} from './dataManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const CLOUD_PORT = process.env.PORT || process.env.APP_PORT || process.env.DATABRICKS_APP_PORT || process.env.WEBSITES_PORT;
const PORT = Number(CLOUD_PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_INDEX_FILE = path.join(DIST_DIR, 'index.html');
const SHOULD_SERVE_CLIENT = process.env.SERVE_CLIENT === 'true' || IS_PROD || fs.existsSync(DIST_INDEX_FILE);
const SESSION_COOKIE = 'cde_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_SECRET = process.env.SESSION_SECRET || 'cde-dev-secret-change-me';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || IS_PROD;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || (IS_PROD ? '' : 'http://localhost:5173,http://127.0.0.1:5173'))
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// --- Middleware ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const pairs = raw.split(';').map(s => s.trim()).filter(Boolean);
  const out = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function createSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name || user.username,
  };
}

function sanitizeUsers(users) {
  return users.map(sanitizeUser);
}

function getRole(user) {
  return user?.role === 'reader' ? 'reader' : 'editor';
}

function attachAuth(req, _res, next) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const payload = verifySessionToken(token);
  req.authUser = payload ? { id: payload.id, username: payload.username, role: payload.role, name: payload.name } : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  return next();
}

function requireEditor(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (getRole(req.authUser) !== 'editor') {
    return res.status(403).json({ error: 'Acceso denegado: solo lectura' });
  }
  return next();
}

app.use('/api', attachAuth);

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son requeridos' });
    }
    const users = readData('users.json');
    const user = users.find(u => String(u.username || '').toLowerCase() === String(username).trim().toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const safeUser = sanitizeUser(user);
    const token = createSessionToken({
      id: safeUser.id,
      username: safeUser.username,
      role: getRole(safeUser),
      name: safeUser.name,
      exp: Date.now() + SESSION_TTL_MS,
    });
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Error en login', details: err.message });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, path: '/' });
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  if (!req.authUser) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (isWrite) {
    return requireEditor(req, res, next);
  }
  return next();
});

// Rate limiting simple (max 10 escrituras/seg)
const writeTimestamps = [];
function rateLimitWrite(req, res, next) {
  const now = Date.now();
  // Limpiar timestamps > 1 segundo
  while (writeTimestamps.length > 0 && now - writeTimestamps[0] > 1000) {
    writeTimestamps.shift();
  }
  if (writeTimestamps.length >= 10) {
    return res.status(429).json({ error: 'Demasiadas escrituras. Intente de nuevo.' });
  }
  writeTimestamps.push(now);
  next();
}

// Aplicar rate limit a métodos de escritura
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) return next();
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return rateLimitWrite(req, res, next);
  }
  next();
});

// --- Utilidades ---
function uid() {
  return Math.random().toString(36).substring(2, 10);
}

function calcPct(milestones) {
  if (!milestones || milestones.length === 0) return 0;
  const done = milestones.filter(m => m.done).length;
  return Math.round((done / milestones.length) * 100);
}

// Validaciones
const VALID_PRIORITIES = ['roca', 'piedras_urgentes', 'piedras_importantes', 'arena'];
const VALID_STATUSES = ['verde', 'amarillo', 'rojo'];
const VALID_GAPS = ['value_map', 'dpo', 'kpis', 'dataops', 'none'];

function quadrantFromPriority(priority) {
  if (priority === 'roca') return 'rocas';
  if (priority === 'piedras_importantes') return 'piedras1';
  if (priority === 'piedras_urgentes') return 'piedras2';
  if (priority === 'arena') return 'arena';
  return null;
}

function validateActivity(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    if (!body.name || typeof body.name !== 'string') errors.push('name es requerido');
    if (!body.cellId || typeof body.cellId !== 'string') errors.push('cellId es requerido');
    if (!VALID_PRIORITIES.includes(body.priority)) errors.push('priority inválido');
    if (!VALID_STATUSES.includes(body.status)) errors.push('status inválido');
    if (!body.responsible || typeof body.responsible !== 'string') errors.push('responsible es requerido');
    if (!body.startDate) errors.push('startDate es requerido');
    if (!body.endDate) errors.push('endDate es requerido');
  } else {
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) errors.push('priority inválido');
    if (body.status && !VALID_STATUSES.includes(body.status)) errors.push('status inválido');
  }
  if (body.gap && !VALID_GAPS.includes(body.gap)) errors.push('gap inválido');
  if (body.name && body.name.length > 200) errors.push('name excede 200 caracteres');
  if (body.milestones && body.milestones.length > 50) errors.push('Máximo 50 hitos');
  if (body.blockers && body.blockers.length > 20) errors.push('Máximo 20 bloqueos');
  return errors;
}

// --- RUTAS API ---

// === CELLS ===
app.get('/api/cells', (req, res) => {
  try {
    const cells = readData('cells.json');
    res.json(cells);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo células', details: err.message });
  }
});

app.put('/api/cells/:id', (req, res) => {
  try {
    const cells = readData('cells.json');
    const idx = cells.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Célula no encontrada' });

    const { name, leader } = req.body;
    if (name !== undefined) cells[idx].name = String(name).slice(0, 200);
    if (leader !== undefined) cells[idx].leader = String(leader).slice(0, 200);

    writeData('cells.json', cells);
    res.json(cells[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando célula', details: err.message });
  }
});

// === USERS (solo editor) ===
app.get('/api/users', requireEditor, (req, res) => {
  try {
    const users = readData('users.json');
    res.json(sanitizeUsers(users));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo usuarios', details: err.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { username, password, role, name } = req.body || {};
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const cleanRole = role === 'reader' ? 'reader' : role === 'editor' ? 'editor' : null;
    const cleanName = String(name || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'username debe tener al menos 3 caracteres' });
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'username solo permite letras, números, punto, guion y guion bajo' });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: 'password debe tener al menos 6 caracteres' });
    }
    if (!cleanRole) {
      return res.status(400).json({ error: 'role debe ser editor o reader' });
    }

    const users = readData('users.json');
    const exists = users.some(u => String(u.username || '').toLowerCase() === cleanUsername);
    if (exists) {
      return res.status(400).json({ error: 'username ya existe' });
    }

    const user = {
      id: uid(),
      username: cleanUsername,
      password: cleanPassword,
      role: cleanRole,
      name: cleanName || cleanUsername,
    };

    users.push(user);
    writeData('users.json', users);
    res.status(201).json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Error creando usuario', details: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const users = readData('users.json');
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

    const current = users[idx];
    const next = { ...current };

    if (req.body.name !== undefined) {
      next.name = String(req.body.name || '').trim().slice(0, 120) || current.username;
    }

    if (req.body.role !== undefined) {
      if (req.body.role !== 'editor' && req.body.role !== 'reader') {
        return res.status(400).json({ error: 'role debe ser editor o reader' });
      }
      if (current.id === req.authUser.id && req.body.role !== 'editor') {
        return res.status(400).json({ error: 'No puedes quitarte rol editor a ti mismo' });
      }
      if (current.role === 'editor' && req.body.role === 'reader') {
        const editorCount = users.filter(u => u.role === 'editor').length;
        if (editorCount <= 1) {
          return res.status(400).json({ error: 'Debe existir al menos un editor' });
        }
      }
      next.role = req.body.role;
    }

    if (req.body.password !== undefined) {
      const pass = String(req.body.password || '').trim();
      if (pass.length < 6) {
        return res.status(400).json({ error: 'password debe tener al menos 6 caracteres' });
      }
      next.password = pass;
    }

    users[idx] = next;
    writeData('users.json', users);
    res.json(sanitizeUser(next));
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando usuario', details: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const users = readData('users.json');
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

    const target = users[idx];
    if (target.id === req.authUser.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    if (target.role === 'editor') {
      const editorCount = users.filter(u => u.role === 'editor').length;
      if (editorCount <= 1) {
        return res.status(400).json({ error: 'Debe existir al menos un editor' });
      }
    }

    users.splice(idx, 1);
    writeData('users.json', users);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando usuario', details: err.message });
  }
});

// === ACTIVITIES ===
app.get('/api/activities', (req, res) => {
  try {
    let activities = readData('activities.json');
    if (req.query.cellId) {
      activities = activities.filter(a => a.cellId === req.query.cellId);
    }
    // Recalcular pct en lectura
    activities = activities.map(a => ({ ...a, pct: calcPct(a.milestones), cuadrante: quadrantFromPriority(a.priority) }));
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo actividades', details: err.message });
  }
});

app.post('/api/activities', (req, res) => {
  try {
    const errors = validateActivity(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validación fallida', details: errors });

    const activities = readData('activities.json');
    if (activities.length >= 200) {
      return res.status(400).json({ error: 'Máximo 200 actividades activas alcanzado' });
    }

    const activity = {
      id: uid(),
      cellId: req.body.cellId,
      name: req.body.name.slice(0, 200),
      priority: req.body.priority,
      status: req.body.status,
      responsible: req.body.responsible.slice(0, 200),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      gap: req.body.gap || 'none',
      executive: !!req.body.executive,
      milestones: (req.body.milestones || []).map(m => ({
        id: uid(),
        name: String(m.name || '').slice(0, 200),
        date: m.date || new Date().toISOString().slice(0, 10),
        done: false,
      })),
      blockers: (req.body.blockers || []).map(b => ({
        id: uid(),
        text: String(b.text || '').slice(0, 500),
        date: new Date().toISOString().slice(0, 10),
        resolved: false,
      })),
      pct: 0,
      archived: false,
    };

    activity.pct = calcPct(activity.milestones);
    activities.push(activity);
    writeData('activities.json', activities);
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Error creando actividad', details: err.message });
  }
});

app.put('/api/activities/:id', (req, res) => {
  try {
    const errors = validateActivity(req.body, true);
    if (errors.length > 0) return res.status(400).json({ error: 'Validación fallida', details: errors });

    const activities = readData('activities.json');
    const idx = activities.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Actividad no encontrada' });

    const act = activities[idx];
    const fields = ['name', 'cellId', 'priority', 'status', 'responsible', 'startDate', 'endDate', 'gap', 'executive'];
    for (const field of fields) {
      if (req.body[field] !== undefined) act[field] = req.body[field];
    }

    if (req.body.milestones !== undefined) {
      act.milestones = req.body.milestones.slice(0, 50).map(m => ({
        id: m.id || uid(),
        name: String(m.name || '').slice(0, 200),
        date: m.date || new Date().toISOString().slice(0, 10),
        done: !!m.done,
      }));
    }

    if (req.body.blockers !== undefined) {
      act.blockers = req.body.blockers.slice(0, 20).map(b => ({
        id: b.id || uid(),
        text: String(b.text || '').slice(0, 500),
        date: b.date || new Date().toISOString().slice(0, 10),
        resolved: !!b.resolved,
      }));
    }

    act.pct = calcPct(act.milestones);
    activities[idx] = act;
    writeData('activities.json', activities);
    res.json(act);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando actividad', details: err.message });
  }
});

app.delete('/api/activities/:id', (req, res) => {
  try {
    let activities = readData('activities.json');
    const idx = activities.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Actividad no encontrada' });
    activities.splice(idx, 1);
    writeData('activities.json', activities);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando actividad', details: err.message });
  }
});

app.patch('/api/activities/:id/milestone/:mid', (req, res) => {
  try {
    const activities = readData('activities.json');
    const act = activities.find(a => a.id === req.params.id);
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });

    const milestone = (act.milestones || []).find(m => m.id === req.params.mid);
    if (!milestone) return res.status(404).json({ error: 'Hito no encontrado' });

    milestone.done = typeof req.body.done === 'boolean' ? req.body.done : !milestone.done;
    act.pct = calcPct(act.milestones);

    writeData('activities.json', activities);
    res.json(act);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling hito', details: err.message });
  }
});

app.post('/api/activities/:id/archive', (req, res) => {
  try {
    const activities = readData('activities.json');
    const archive = readData('archive.json');
    const idx = activities.findIndex(a => a.id === req.params.id);

    if (idx !== -1) {
      // Archivar
      const [act] = activities.splice(idx, 1);
      act.archived = true;
      archive.push(act);
      writeData('activities.json', activities);
      writeData('archive.json', archive);
      return res.json(act);
    }

    // Restaurar desde archivo
    const archIdx = archive.findIndex(a => a.id === req.params.id);
    if (archIdx !== -1) {
      const [act] = archive.splice(archIdx, 1);
      act.archived = false;
      activities.push(act);
      writeData('archive.json', archive);
      writeData('activities.json', activities);
      return res.json(act);
    }

    res.status(404).json({ error: 'Actividad no encontrada' });
  } catch (err) {
    res.status(500).json({ error: 'Error archivando actividad', details: err.message });
  }
});

app.get('/api/archive', (req, res) => {
  try {
    let archive = readData('archive.json');
    archive = archive.map(a => ({ ...a, pct: calcPct(a.milestones), cuadrante: quadrantFromPriority(a.priority) }));
    res.json(archive);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo archivo', details: err.message });
  }
});

// === NOTES ===
app.get('/api/notes/:activityId', (req, res) => {
  try {
    const notes = readData('notes.json');
    const filtered = notes.filter(n => n.activityId === req.params.activityId);
    res.json(filtered.sort((a, b) => b.date.localeCompare(a.date)));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo notas', details: err.message });
  }
});

app.post('/api/notes/:activityId', (req, res) => {
  try {
    if (!req.body.text || typeof req.body.text !== 'string') {
      return res.status(400).json({ error: 'text es requerido' });
    }
    if (req.body.text.length > 2000) {
      return res.status(400).json({ error: 'text excede 2000 caracteres' });
    }

    const notes = readData('notes.json');
    const actNotes = notes.filter(n => n.activityId === req.params.activityId);
    if (actNotes.length >= 100) {
      return res.status(400).json({ error: 'Máximo 100 notas por actividad' });
    }

    const note = {
      id: uid(),
      activityId: req.params.activityId,
      date: new Date().toISOString().slice(0, 10),
      text: req.body.text.slice(0, 2000),
    };

    notes.push(note);
    writeData('notes.json', notes);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Error creando nota', details: err.message });
  }
});

app.put('/api/notes/:activityId/:noteId', (req, res) => {
  try {
    if (!req.body.text || typeof req.body.text !== 'string') {
      return res.status(400).json({ error: 'text es requerido' });
    }
    if (req.body.text.length > 2000) {
      return res.status(400).json({ error: 'text excede 2000 caracteres' });
    }
    const notes = readData('notes.json');
    const idx = notes.findIndex(n => n.id === req.params.noteId && n.activityId === req.params.activityId);
    if (idx === -1) return res.status(404).json({ error: 'Nota no encontrada' });
    notes[idx].text = req.body.text.slice(0, 2000);
    writeData('notes.json', notes);
    res.json(notes[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error editando nota', details: err.message });
  }
});

app.delete('/api/notes/:activityId/:noteId', (req, res) => {
  try {
    let notes = readData('notes.json');
    const idx = notes.findIndex(n => n.id === req.params.noteId && n.activityId === req.params.activityId);
    if (idx === -1) return res.status(404).json({ error: 'Nota no encontrada' });
    notes.splice(idx, 1);
    writeData('notes.json', notes);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando nota', details: err.message });
  }
});

// === BACKUP / RESTORE / EXPORT ===
app.post('/api/backup', (req, res) => {
  try {
    const filename = createAutoBackup();
    res.json({ filename, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Error creando backup', details: err.message });
  }
});

app.get('/api/backups', (req, res) => {
  try {
    res.json(listBackups());
  } catch (err) {
    res.status(500).json({ error: 'Error listando backups', details: err.message });
  }
});

app.post('/api/restore', (req, res) => {
  try {
    if (!req.body.filename) {
      return res.status(400).json({ error: 'filename es requerido' });
    }
    restoreBackup(req.body.filename);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error restaurando backup', details: err.message });
  }
});

app.get('/api/export', (req, res) => {
  try {
    res.json(exportAll());
  } catch (err) {
    res.status(500).json({ error: 'Error exportando datos', details: err.message });
  }
});

if (SHOULD_SERVE_CLIENT) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(DIST_INDEX_FILE);
  });
}

process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 unhandledRejection:', reason);
  process.exit(1);
});

// --- Inicialización ---
try {
  initDataDir();
  app.listen(PORT, HOST, () => {
    console.log(`✅ Seguimiento CDE API corriendo en http://${HOST}:${PORT}`);
    console.log(`ℹ️ NODE_ENV=${process.env.NODE_ENV || 'undefined'} SHOULD_SERVE_CLIENT=${SHOULD_SERVE_CLIENT}`);
  });
} catch (err) {
  console.error('❌ Error fatal al iniciar la aplicación:', err);
  process.exit(1);
}
