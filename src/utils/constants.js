export const PRIORITIES = {
  roca: { key: 'roca', label: 'Roca', color: '#6E2424', bg: '#F2DCDC', weight: 4 },
  piedras_urgentes: { key: 'piedras_urgentes', label: 'Piedras urgentes', color: '#8A5A1B', bg: '#F4E5C9', weight: 3 },
  piedras_importantes: { key: 'piedras_importantes', label: 'Piedras importantes', color: '#9D6B2A', bg: '#F7E9D3', weight: 2 },
  arena: { key: 'arena', label: 'Arena', color: '#555B6E', bg: '#E6E5DD', weight: 1 },
};

export const STATUSES = {
  verde: { key: 'verde', label: 'Verde', color: '#2D6A4F', bg: '#DCEBE0' },
  amarillo: { key: 'amarillo', label: 'Amarillo', color: '#B96B11', bg: '#FBEAD0' },
  rojo: { key: 'rojo', label: 'Rojo', color: '#A02B2B', bg: '#F6DCDC' },
};

export const GAPS = {
  value_map: { key: 'value_map', label: 'Value Map' },
  dpo: { key: 'dpo', label: 'Data Product Owner' },
  kpis: { key: 'kpis', label: 'KPIs / Medición' },
  dataops: { key: 'dataops', label: 'DataOps / Lineage' },
  none: { key: 'none', label: 'Sin mapeo' },
};

export const PRIORITY_ORDER = ['roca', 'piedras_urgentes', 'piedras_importantes', 'arena'];
