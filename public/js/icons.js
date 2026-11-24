/**
 * SISTEMA VECTORIAL DE ICONOS SVG — NÚCLEO FINANCIERO
 * Reemplazo corporativo de alta definición para emojis y glifos.
 * Diseño limpio basado en vectores SVG minimalistas (estándar Heroicons / Lucide).
 */

const baseSvg = (content, size = 18, className = 'svg-icon') => `
  <svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
    ${content}
  </svg>
`;

export const Icons = {
  logo: (size = 22) => `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#0284c7"/>
      <path d="M7 17V7L17 17V7" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  dashboard: (size = 18) => baseSvg(`
    <rect x="3" y="3" width="7" height="9" rx="1.5"/>
    <rect x="14" y="3" width="7" height="5" rx="1.5"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5"/>
    <rect x="3" y="16" width="7" height="5" rx="1.5"/>
  `, size),

  pos: (size = 18) => baseSvg(`
    <rect x="3" y="3" width="18" height="13" rx="2"/>
    <path d="M7 8h10"/>
    <path d="M7 12h4"/>
    <path d="M3 16l3 5h12l3-5"/>
  `, size),

  inventario: (size = 18) => baseSvg(`
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  `, size),

  facturacion: (size = 18) => baseSvg(`
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  `, size),

  empresas: (size = 18) => baseSvg(`
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  `, size),

  contabilidad: (size = 18) => baseSvg(`
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
    <path d="M6 6h10"/>
    <path d="M6 10h10"/>
    <path d="M6 14h6"/>
    <path d="M18 18h-4"/>
  `, size),

  tenants: (size = 18) => baseSvg(`
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/>
    <path d="M16 6h.01"/>
    <path d="M8 10h.01"/>
    <path d="M16 10h.01"/>
    <path d="M8 14h.01"/>
    <path d="M16 14h.01"/>
  `, size),

  rbac: (size = 18) => baseSvg(`
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  `, size),

  ajustes: (size = 18) => baseSvg(`
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  `, size),

  shield: (size = 18) => baseSvg(`
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  `, size),

  lock: (size = 18) => baseSvg(`
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  `, size),

  key: (size = 18) => baseSvg(`
    <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5-2 2 1.5 1.5L2 21h3v-2h2v-2h2l4.5-4.5"/>
    <circle cx="7.5" cy="7.5" r="3.5"/>
  `, size),

  building: (size = 18) => baseSvg(`
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/>
  `, size),

  numpad: (size = 18) => baseSvg(`
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M8 6h.01"/><path d="M12 6h.01"/><path d="M16 6h.01"/>
    <path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/>
    <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
    <path d="M12 18h.01"/>
  `, size),

  eye: (size = 18) => baseSvg(`
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  `, size),

  eyeOff: (size = 18) => baseSvg(`
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  `, size),

  arrowRight: (size = 18) => baseSvg(`
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  `, size),

  chevronDown: (size = 14) => baseSvg(`
    <path d="m6 9 6 6 6-6"/>
  `, size),

  sun: (size = 18) => baseSvg(`
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/>
    <path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/>
    <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  `, size),

  moon: (size = 18) => baseSvg(`
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  `, size),

  monitor: (size = 18) => baseSvg(`
    <rect width="20" height="14" x="2" y="3" rx="2"/>
    <line x1="8" x2="16" y1="21" y2="21"/>
    <line x1="12" x2="12" y1="17" y2="21"/>
  `, size),

  bell: (size = 18) => baseSvg(`
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  `, size),

  mapPin: (size = 16) => baseSvg(`
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  `, size),

  clock: (size = 16) => baseSvg(`
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  `, size),

  logout: (size = 16) => baseSvg(`
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  `, size),

  check: (size = 16) => baseSvg(`
    <polyline points="20 6 9 17 4 12"/>
  `, size),

  refresh: (size = 16) => baseSvg(`
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  `, size),

  download: (size = 16) => baseSvg(`
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  `, size),

  save: (size = 16) => baseSvg(`
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  `, size),

  user: (size = 16) => baseSvg(`
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  `, size),

  users: (size = 16) => baseSvg(`
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  `, size),

  truck: (size = 16) => baseSvg(`
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10"/>
    <circle cx="17" cy="18" r="2"/>
    <circle cx="7" cy="18" r="2"/>
  `, size),

  creditCard: (size = 16) => baseSvg(`
    <rect width="20" height="14" x="2" y="5" rx="2"/>
    <line x1="2" x2="22" y1="10" y2="10"/>
  `, size),

  printer: (size = 16) => baseSvg(`
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect width="12" height="8" x="6" y="14"/>
  `, size),

  plus: (size = 16) => baseSvg(`
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  `, size),

  trash: (size = 16) => baseSvg(`
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  `, size),

  edit: (size = 16) => baseSvg(`
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  `, size),

  search: (size = 16) => baseSvg(`
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" x2="16.65" y1="21" y2="16.65"/>
  `, size),

  fileText: (size = 16) => baseSvg(`
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  `, size),

  trendingUp: (size = 16) => baseSvg(`
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  `, size),

  chartBar: (size = 16) => baseSvg(`
    <line x1="12" x2="12" y1="20" y2="10"/>
    <line x1="18" x2="18" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="16"/>
  `, size),

  dollarSign: (size = 16) => baseSvg(`
    <line x1="12" x2="12" y1="2" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  `, size),

  smartphone: (size = 16) => baseSvg(`
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
    <path d="M12 18h.01"/>
  `, size),

  scissors: (size = 16) => baseSvg(`
    <circle cx="6" cy="6" r="3"/>
    <path d="M8.12 8.12 12 12"/>
    <path d="M20 4 8.12 15.88"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M14.8 14.8 20 20"/>
  `, size),

  package: (size = 16) => baseSvg(`
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  `, size),

  shoppingCart: (size = 16) => baseSvg(`
    <circle cx="8" cy="21" r="1"/>
    <circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
  `, size),

  alertCircle: (size = 16) => baseSvg(`
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  `, size),

  info: (size = 16) => baseSvg(`
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="16" y2="12"/>
    <line x1="12" x2="12.01" y1="8" y2="8"/>
  `, size),

  sparkles: (size = 16) => baseSvg(`
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  `, size),
};
