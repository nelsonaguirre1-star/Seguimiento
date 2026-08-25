import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

// Células iniciales del CDE
const DEFAULT_CELLS = [
  { id: 'cell_1', name: 'Célula arquitectura de datos', leader: '' },
  { id: 'cell_2', name: 'Célula Gobierno de Datos', leader: '' },
  { id: 'cell_6', name: 'Célula ingenieria analítica', leader: '' },
  { id: 'cell_3', name: 'Capítulo de Machine Learning', leader: '' },
  { id: 'cell_7', name: 'Capítulo de análisis de datos y BI', leader: '' },
  { id: 'cell_8', name: 'Dominio de Analítica', leader: '' },
];

const DEFAULT_USERS = [
  { id: 'u_editor', username: 'editor', password: 'Editor2026!', role: 'editor', name: 'Usuario Editor' },
  { id: 'u_reader', username: 'lector', password: 'Lector2026!', role: 'reader', name: 'Usuario Consulta' },
];

/**
 * Inicializa la carpeta /data con archivos por defecto si no existen.
 */
export function initDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const defaults = {
    'cells.json': DEFAULT_CELLS,
    'activities.json': [],
    'archive.json': [],
    'notes.json': [],
    'users.json': DEFAULT_USERS,
  };

  for (const [filename, defaultData] of Object.entries(defaults)) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      writeFileAtomic(filePath, defaultData);
    }
  }
}

/**
 * Lee un archivo JSON de /data.
 * @param {string} filename - Nombre del archivo (e.g. 'cells.json')
 * @returns {any} Datos parseados
 */
export function readData(filename) {
  validateFilename(filename);
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const sanitized = raw.replace(/^\uFEFF/, '');
    return JSON.parse(sanitized);
  } catch (err) {
    console.error(`Error leyendo ${filename}:`, err.message);
    throw err;
  }
}

/**
 * Escribe datos a un archivo JSON con escritura atómica (tmp + rename).
 * Genera backup automático antes de escribir.
 * @param {string} filename - Nombre del archivo
 * @param {any} data - Datos a escribir
 */
export function writeData(filename, data) {
  validateFilename(filename);
  const filePath = path.join(DATA_DIR, filename);
  createAutoBackup();
  writeFileAtomic(filePath, data);
}

/**
 * Escritura atómica: escribe a .tmp y luego renombra.
 */
function writeFileAtomic(filePath, data) {
  const tmpPath = filePath + '.tmp';
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Genera un backup consolidado de todos los archivos de datos.
 */
export function createAutoBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFilename = `backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    const snapshot = {
      timestamp: new Date().toISOString(),
      cells: readData('cells.json'),
      activities: readData('activities.json'),
      archive: readData('archive.json'),
      notes: readData('notes.json'),
      users: readData('users.json'),
    };

    fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    pruneBackups();
    return backupFilename;
  } catch (err) {
    console.error('Error creando backup:', err.message);
    return null;
  }
}

/**
 * Elimina backups antiguos si exceden MAX_BACKUPS.
 */
function pruneBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort();

  while (files.length > MAX_BACKUPS) {
    const oldest = files.shift();
    fs.unlinkSync(path.join(BACKUP_DIR, oldest));
  }
}

/**
 * Lista backups disponibles.
 */
export function listBackups() {
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
}

/**
 * Restaura estado desde un backup.
 * @param {string} backupFilename
 */
export function restoreBackup(backupFilename) {
  validateFilename(backupFilename);
  const backupPath = path.join(BACKUP_DIR, backupFilename);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup no encontrado: ${backupFilename}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf-8');
  const snapshot = JSON.parse(raw);

  writeFileAtomic(path.join(DATA_DIR, 'cells.json'), snapshot.cells);
  writeFileAtomic(path.join(DATA_DIR, 'activities.json'), snapshot.activities);
  writeFileAtomic(path.join(DATA_DIR, 'archive.json'), snapshot.archive);
  writeFileAtomic(path.join(DATA_DIR, 'notes.json'), snapshot.notes);
  writeFileAtomic(path.join(DATA_DIR, 'users.json'), Array.isArray(snapshot.users) ? snapshot.users : readData('users.json'));
}

/**
 * Exporta todos los datos consolidados.
 */
export function exportAll() {
  return {
    exportDate: new Date().toISOString(),
    cells: readData('cells.json'),
    activities: readData('activities.json'),
    archive: readData('archive.json'),
    notes: readData('notes.json'),
    users: readData('users.json').map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
    })),
  };
}

/**
 * Valida que un filename no contenga path traversal.
 */
function validateFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename inválido');
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Path traversal detectado');
  }
}
