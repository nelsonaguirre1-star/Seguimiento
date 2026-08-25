# Seguimiento CDE

Sistema de Seguimiento de Actividades por Celula - Centro de Excelencia de Datos y Analitica Avanzada.

## Prerrequisitos

- Node.js 18+
- npm 9+
- VS Code con terminal integrada

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm run dev
```

Arranca simultaneamente:
- **Frontend** (Vite + React): http://localhost:5173
- **Backend** (Express API): http://127.0.0.1:3001

La carpeta `/data` se crea automaticamente en la primera ejecucion con 8 celulas y cero actividades.

## Ejecucion (producción local)

```bash
npm run build
npm run start
```

Abre: `http://127.0.0.1:3001`

## Acceso y roles

La aplicacion ahora requiere autenticacion en `http://localhost:5173`.

- **Editor**: puede crear, editar y archivar.
- **Solo lectura**: puede consultar y filtrar, sin modificar datos.

En la vista **Config**, el rol `editor` tiene además un módulo de **Administración de usuarios** para:

- Crear usuarios (`editor` o `reader`)
- Cambiar nombre visible, rol y contraseña
- Eliminar usuarios (con restricciones de seguridad)

Credenciales iniciales (archivo `data/users.json`):

- `editor` / `Editor2026!` (rol `editor`)
- `lector` / `Lector2026!` (rol `reader`)

> Recomendado: cambiar estas credenciales en `data/users.json` antes de usar en entorno productivo.

Reglas de seguridad de usuarios:

- Un `editor` no puede eliminarse a sí mismo.
- Debe existir al menos un usuario con rol `editor`.
- Usuarios `reader` nunca pueden ejecutar escrituras en API.

## Estructura

```
seguimiento-cde/
├─ data/           # Almacenamiento JSON (excluido de Git)
├─ src/            # Frontend React + Tailwind
├─ server/         # Backend Express API REST
└─ package.json    # Scripts y dependencias
```

## Vistas

| Vista | Descripcion |
|-------|-------------|
| **Bilateral** | Vista principal. Selector de celula + boton "Total" para ver todas las actividades de la gerencia. Filtros por semana, Presidencia/VP, busqueda. CRUD de actividades, hitos, bloqueos y notas bilaterales. |
| **Riesgos** | Analisis de riesgo por tiempo vs avance de cada actividad. |
| **Archivo** | Actividades marcadas como cumplimiento (archivadas). |
| **Config** | Configuracion de celulas (nombre, lider). |

## Modelo de datos

- **Cells**: celulas/equipos con nombre y lider.
- **Activities**: actividades con prioridad (roca/piedra/arena), estado semaforo (verde/amarillo/rojo), marca Presidencia/VP, hitos, bloqueos, gaps, fechas inicio/fin, responsable.
- **Notes**: notas bilaterales asociadas a una actividad.
- **Backups**: snapshots automaticos del estado completo.
- **Users**: usuarios locales con rol (`editor` o `reader`) para control de acceso.

## Despliegue público fácil (Render)

El proyecto ya incluye `render.yaml`, `Dockerfile`, `.dockerignore` y script `start`.

### Pasos rápidos

1. Sube este repositorio a GitHub.
2. En Render, crea **New + > Blueprint** y selecciona el repo.
3. Render detectará `render.yaml` y creará el servicio web con disco persistente en `/app/data`.
4. En variables de entorno valida:
	- `NODE_ENV=production`
	- `HOST=0.0.0.0`
	- `SESSION_SECRET` (ya se genera automáticamente)
	- `ALLOWED_ORIGINS` con tu dominio público (ejemplo `https://tu-app.onrender.com`)
5. Espera el deploy y abre la URL pública.

### Notas importantes

- En producción, el backend sirve el frontend compilado (`dist`) en la misma URL.
- Si no defines `ALLOWED_ORIGINS` en producción, solo se aceptan requests same-origin.
- Si cambias de dominio luego del deploy, actualiza `ALLOWED_ORIGINS`.
