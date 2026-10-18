/**
 * APLICACIÓN PRINCIPAL (APP ROUTER & SHELL) — NÚCLEO FINANCIERO
 * Arquitectura modular con Control de Acceso Basado en Roles (RBAC),
 * Navegación dinámica filtrada por perfil, Multi-Tenant y Motor de Temas.
 */

import { state } from './state.js';
import { LoginView } from './views/login.view.js';
import { DashboardView } from './views/dashboard.view.js';
import { FacturacionView } from './views/facturacion.view.js';
import { PosView } from './views/pos.view.js';
import { RbacView } from './views/rbac.view.js';
import { ContabilidadView } from './views/contabilidad.view.js';
import { PlaceholderView } from './views/placeholder.view.js';
import { AjustesView } from './views/ajustes.view.js';
import { RestrictedView } from './views/restricted.view.js';
import { ROLE_DEFINITIONS } from './demo-fixtures.js';

// Catálogo maestro de navegación del sistema
const MASTER_NAV_ITEMS = [
  {
    category: 'Operación y Salón',
    id: 'pos',
    icon: '☕',
    title: 'Punto de Venta',
    subtitle: 'POS, Mesas & Comandas',
    module: 'pos',
  },
  {
    category: 'Gestión Administrativa',
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    subtitle: 'Resumen ejecutivo',
    module: 'gestion',
  },
  {
    category: 'Gestión Administrativa',
    id: 'facturacion',
    icon: '📑',
    title: 'Facturación',
    subtitle: 'Facturas electrónicas DIAN',
    module: 'gestion',
  },
  {
    category: 'Gestión Administrativa',
    id: 'contabilidad',
    icon: '🏛️',
    title: 'Contabilidad',
    subtitle: 'Módulo DIAN F-350',
    badge: 'Demo',
    module: 'gestion',
  },
  {
    category: 'Operación y Salón',
    id: 'inventario',
    icon: '📦',
    title: 'Inventario',
    subtitle: 'Existencias y kardex',
    badge: 'WIP',
    module: 'gestion',
  },
  {
    category: 'Gestión Administrativa',
    id: 'clientes',
    icon: '👥',
    title: 'Clientes CRM',
    subtitle: 'Directorio de terceros',
    badge: 'WIP',
    module: 'gestion',
  },
  {
    category: 'Gestión Administrativa',
    id: 'reportes',
    icon: '📈',
    title: 'Reportes',
    subtitle: 'Inteligencia de negocio',
    badge: 'WIP',
    module: 'gestion',
  },
  {
    category: 'Seguridad y Control',
    id: 'rbac',
    icon: '🛡️',
    title: 'Roles & Permisos',
    subtitle: 'Matriz RBAC y usuarios',
    module: 'gestion',
  },
  {
    category: 'Preferencias',
    id: 'ajustes',
    icon: '⚙️',
    title: 'Ajustes & Tema',
    subtitle: 'Personalizar apariencia',
    module: 'gestion',
  },
];

class App {
  static init() {
    this.root = document.getElementById('app-root');

    // Suscribirse a cambios de estado para reactividad
    state.subscribe((event, payload) => {
      if (
        event === 'view_changed' ||
        event === 'user_changed' ||
        event === 'tenant_changed' ||
        event === 'module_changed' ||
        event === 'theme_changed'
      ) {
        this.render();
      }
    });

    this.render();
  }

  static render() {
    // Si no hay usuario autenticado o la vista es login, mostrar Login View
    if (!state.currentUser || state.currentView === 'login') {
      this.root.innerHTML = `
        <div class="dev-env-banner">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="badge-pill">Entorno Dev</span>
            <span>Schema: <code>${state.currentTenant.slug}</code></span>
          </div>
          <div class="tenant-indicator">
            <span>Empresa:</span>
            <span class="tenant-name-highlight">${state.currentTenant.name}</span>
          </div>
        </div>
        <div id="login-view-mount" style="flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;"></div>
      `;
      LoginView.mount(document.getElementById('login-view-mount'));
      return;
    }

    // Usuario autenticado: Renderizar Shell con Topbar, Sidebar y Contenido
    const user = state.currentUser;
    const tenant = state.currentTenant;
    const view = state.currentView;
    const isPosModule = state.currentModule === 'pos';
    const roleDef = state.getRoleDefinition() || ROLE_DEFINITIONS.mesero;
    const canSwitchModule = state.canSwitchModule();

    const userInitials = user.nombre
      ? user.nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
      : 'CM';

    // Configuración del botón de tema en Topbar
    const themeSetting = state.themeSetting; // 'light' | 'dark' | 'system'
    const effectiveTheme = state.getEffectiveTheme(); // 'light' | 'dark'
    let themeIcon = '☀️';
    let themeLabel = 'Claro';
    if (themeSetting === 'dark') {
      themeIcon = '🌙';
      themeLabel = 'Oscuro';
    } else if (themeSetting === 'system') {
      themeIcon = '💻';
      themeLabel = effectiveTheme === 'dark' ? 'Auto (Oscuro)' : 'Auto (Claro)';
    }

    // Filtrar elementos de navegación permitidos exclusivamente para este rol (RBAC Filtering)
    const allowedNavItems = MASTER_NAV_ITEMS.filter((item) => state.canAccessView(item.id));

    // Agrupar por categoría
    const categoriesMap = new Map();
    allowedNavItems.forEach((item) => {
      if (!categoriesMap.has(item.category)) {
        categoriesMap.set(item.category, []);
      }
      categoriesMap.get(item.category).push(item);
    });

    let navHtml = '';
    for (const [catName, items] of categoriesMap.entries()) {
      navHtml += `<div class="nav-section-title">${catName}</div>`;
      for (const item of items) {
        const isActive = view === item.id;
        navHtml += `
          <div class="nav-item ${isActive ? 'active' : ''}" data-nav="${item.id}" data-mod="${item.module}">
            <span class="nav-item-icon">${item.icon}</span>
            <div>
              <span>${item.title}</span>
              <span class="nav-item-sub">${item.subtitle}</span>
            </div>
            ${item.badge ? `<span class="nav-badge-wip">${item.badge}</span>` : ''}
          </div>
        `;
      }
    }

    // Badge visual de Rol
    const roleBadgeColor = roleDef.color || '#2563eb';

    this.root.innerHTML = `
      <!-- Banner de Entorno de Desarrollo -->
      <div class="dev-env-banner">
        <div class="dev-banner-left">
          <span class="badge-pill">Demo</span>
          <span class="dev-banner-schema">Schema: <code>${tenant.slug}</code></span>
        </div>
        <div class="tenant-indicator">
          <span class="dev-banner-user"><b>${user.nombre}</b> (<span style="color: ${roleBadgeColor}; font-weight: 700;">${user.rol.nombre}</span>)</span>
          <button type="button" class="btn-switch-tenant" id="btn-quick-switch-tenant" title="Cambiar Empresa">
            🔄 <span class="desktop-only">Cambiar</span> Empresa
          </button>
        </div>
      </div>

      <div class="app-container">
        <!-- Sidebar Izquierda con Navegación Dinámica según Rol -->
        <!-- Backdrop oscuro para sidebar drawer en móvil/tablet -->
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="brand-icon-box">🏛️</div>
              <div>
                <div class="brand-title">NÚCLEO</div>
                <div class="brand-subtitle">Claridad empresarial</div>
              </div>
              <button type="button" class="sidebar-close-btn" id="btn-sidebar-close" title="Cerrar menú">✕</button>
            </div>
          </div>

          <!-- Badge de Empresa Activa (Aislamiento Visible) -->
          <div class="sidebar-tenant-badge">
            <div class="tenant-status-dot"></div>
            <div class="tenant-badge-info">
              <span class="tenant-badge-name">${tenant.name}</span>
              <span class="tenant-badge-city">${tenant.city}</span>
            </div>
          </div>

          <!-- Navegación Filtrada por RBAC -->
          <nav class="sidebar-nav">
            ${navHtml}
          </nav>

          <!-- Pie del Sidebar con el Usuario en Sesión y su Rol -->
          <div class="sidebar-footer">
            <div class="user-profile-widget" id="user-profile-trigger" title="Ver información de perfil">
              <div class="user-avatar-circle" style="background: linear-gradient(135deg, ${roleBadgeColor} 0%, #1e3a8a 100%);">${userInitials}</div>
              <div class="user-info-text">
                <span class="user-name">${user.nombre}</span>
                <span class="user-role-badge" style="font-weight: 700; color: ${roleBadgeColor};">${user.rol.nombre}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Área de Contenido Principal -->
        <main class="main-viewport">
          <!-- Barra Superior (Topbar de Figma) -->
          <header class="topbar">
            <div class="topbar-left">
              <button type="button" class="btn-hamburger" id="btn-hamburger" title="Abrir menú de navegación">☰</button>
              <div class="topbar-titles-box">
                <div class="topbar-view-title">${this.getViewTitle(view)}</div>
                <div class="topbar-view-subtitle">${tenant.name}</div>
              </div>

              <!-- Píldora Selectora de Módulo (visible solo en escritorio para evitar colisiones en móvil) -->
              ${
                canSwitchModule
                  ? `
                <button type="button" class="module-switcher-pill desktop-only ${isPosModule ? 'pos-mode' : ''}" id="topbar-module-pill" title="Alternar entre Gestión y Punto de Venta">
                  <span>${isPosModule ? '☕ Punto de Venta' : '🌐 Gestión'}</span>
                  <span style="font-size: 10px;">▼</span>
                </button>
              `
                  : `
                <div class="module-switcher-pill desktop-only ${isPosModule ? 'pos-mode' : ''}" style="cursor: default;" title="Módulo operativo">
                  <span>${isPosModule ? '☕ Punto de Venta' : '🌐 Gestión'}</span>
                </div>
              `
              }
            </div>

            <div class="topbar-right">
              <div class="topbar-location">
                <span>📍</span>
                <span>${tenant.sucursales[0] || 'Sede Principal'}</span>
              </div>

              <div class="topbar-timer">
                <span>⏱</span>
                <span>7h 57m</span>
              </div>

              <!-- Selector Rápido de Tema (Claro / Oscuro / Sistema) -->
              <div class="theme-switcher-wrapper">
                <button type="button" class="btn-theme-toggle" id="btn-theme-quick-toggle" title="Cambiar tema visual">
                  <span id="theme-btn-icon">${themeIcon}</span>
                  <span id="theme-btn-label" class="desktop-only">${themeLabel}</span>
                  <span class="desktop-only" style="font-size: 9px; opacity: 0.7;">▼</span>
                </button>
                <div class="theme-dropdown-menu" id="theme-dropdown-menu" style="display: none;">
                  <div class="theme-dropdown-item ${themeSetting === 'light' ? 'active' : ''}" data-theme-val="light">
                    <span>☀️</span> <span>Modo Claro</span>
                  </div>
                  <div class="theme-dropdown-item ${themeSetting === 'dark' ? 'active' : ''}" data-theme-val="dark">
                    <span>🌙</span> <span>Modo Oscuro</span>
                  </div>
                  <div class="theme-dropdown-item ${themeSetting === 'system' ? 'active' : ''}" data-theme-val="system">
                    <span>💻</span> <span>Sistema (Auto)</span>
                  </div>
                </div>
              </div>

              <button type="button" class="btn-icon desktop-only" title="Notificaciones DIAN" onclick="alert('Sistema de notificaciones DIAN: Todos los servicios operativos.')">
                🔔
              </button>

              <button type="button" class="btn-logout" id="btn-topbar-logout" title="Cerrar Sesión">
                <span class="desktop-only">Cerrar Sesión</span>
                <span class="mobile-only">Salir</span>
              </button>
            </div>
          </header>

          <!-- Vista Activa (pos-active elimina paddings y scroll exterior para el POS) -->
          <div class="view-content ${view === 'pos' ? 'pos-active' : ''}" id="active-view-mount"></div>
        </main>
      </div>

      <!-- Barra de Navegación Inferior Móvil (filtrada por RBAC) -->
      <nav class="mobile-bottom-nav" id="mobile-bottom-nav">
        ${this.buildMobileBottomNav(view)}
      </nav>
    `;

    this.bindShellEvents();
    this.mountActiveView(view);
  }

  static getViewTitle(view) {
    switch (view) {
      case 'dashboard':
        return 'Dashboard';
      case 'facturacion':
        return 'Facturación DIAN';
      case 'pos':
        return 'Punto de Venta POS';
      case 'rbac':
        return 'Roles & Permisos';
      case 'ajustes':
        return 'Ajustes';
      case 'contabilidad':
        return 'Contabilidad';
      case 'clientes':
        return 'Clientes CRM';
      case 'inventario':
        return 'Inventario';
      case 'reportes':
        return 'Reportes';
      case 'acceso_denegado':
        return 'Control de Acceso';
      default:
        return 'NÚCLEO Financiero';
    }
  }

  static mountActiveView(view) {
    const mountPoint = document.getElementById('active-view-mount');
    if (!mountPoint) return;

    // Route Guard en tiempo de montaje
    if (view !== 'login' && view !== 'acceso_denegado' && !state.canAccessView(view)) {
      RestrictedView.mount(mountPoint, view);
      return;
    }

    switch (view) {
      case 'dashboard':
        DashboardView.mount(mountPoint);
        break;
      case 'facturacion':
        FacturacionView.mount(mountPoint);
        break;
      case 'pos':
        PosView.mount(mountPoint);
        break;
      case 'rbac':
        RbacView.mount(mountPoint);
        break;
      case 'ajustes':
        AjustesView.mount(mountPoint);
        break;
      case 'contabilidad':
        ContabilidadView.mount(mountPoint);
        break;
      case 'clientes':
      case 'inventario':
      case 'reportes':
        PlaceholderView.mount(mountPoint, view);
        break;
      case 'acceso_denegado':
        RestrictedView.mount(mountPoint, state.attemptedView || 'este módulo');
        break;
      default:
        DashboardView.mount(mountPoint);
    }
  }

  static getShortNavTitle(id, fullTitle) {
    switch (id) {
      case 'pos': return 'POS';
      case 'dashboard': return 'Dashboard';
      case 'facturacion': return 'Facturas';
      case 'contabilidad': return 'Contabilidad';
      case 'rbac': return 'Roles';
      case 'ajustes': return 'Ajustes';
      case 'inventario': return 'Inventario';
      case 'clientes': return 'Clientes';
      case 'reportes': return 'Reportes';
      default: return fullTitle.split(' ')[0];
    }
  }

  static buildMobileBottomNav(currentView) {
    // Tomar los primeros 4 módulos permitidos para la barra inferior
    const mobileItems = MASTER_NAV_ITEMS.filter((item) => state.canAccessView(item.id)).slice(0, 4);
    return mobileItems.map((item) => `
      <button class="mobile-nav-btn ${currentView === item.id ? 'active' : ''}" data-mobile-nav="${item.id}" data-mobile-mod="${item.module}">
        <span class="icon">${item.icon}</span>
        <span>${this.getShortNavTitle(item.id, item.title)}</span>
      </button>
    `).join('');
  }

  static toggleSidebar(open) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;
    if (open) {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    }
  }

  static bindShellEvents() {
    // Hamburger y Sidebar Drawer
    const btnHamburger = document.getElementById('btn-hamburger');
    if (btnHamburger) {
      btnHamburger.addEventListener('click', () => this.toggleSidebar(true));
    }

    const btnSidebarClose = document.getElementById('btn-sidebar-close');
    if (btnSidebarClose) {
      btnSidebarClose.addEventListener('click', () => this.toggleSidebar(false));
    }

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.toggleSidebar(false));
    }

    // Navegación Sidebar (solo los elementos permitidos)
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-nav');
        const targetMod = item.getAttribute('data-mod');

        if (targetMod === 'pos' || targetView === 'pos') {
          state.setModule('pos');
        } else {
          state.setModule('gestion');
        }

        state.setView(targetView);
        // Cerrar sidebar en móvil al navegar
        this.toggleSidebar(false);
      });
    });

    // Navegación inferior móvil
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-mobile-nav');
        const targetMod = btn.getAttribute('data-mobile-mod');
        if (targetMod === 'pos' || targetView === 'pos') {
          state.setModule('pos');
        } else {
          state.setModule('gestion');
        }
        state.setView(targetView);
      });
    });

    // Píldora de Módulo en Topbar (solo activa si el perfil tiene permisos para alternar)
    const modulePill = document.getElementById('topbar-module-pill');
    if (modulePill && state.canSwitchModule()) {
      modulePill.addEventListener('click', () => {
        if (state.currentModule === 'gestion') {
          state.setModule('pos');
          state.setView('pos');
        } else {
          state.setModule('gestion');
          state.setView('dashboard');
        }
      });
    }

    // Selector rápido de Tema en Topbar
    const btnThemeToggle = document.getElementById('btn-theme-quick-toggle');
    const themeDropdown = document.getElementById('theme-dropdown-menu');

    if (btnThemeToggle && themeDropdown) {
      btnThemeToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = themeDropdown.style.display === 'flex';
        themeDropdown.style.display = isOpen ? 'none' : 'flex';
      });

      // Opciones del dropdown de temas
      themeDropdown.querySelectorAll('.theme-dropdown-item').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const themeVal = opt.getAttribute('data-theme-val');
          state.setTheme(themeVal);
          themeDropdown.style.display = 'none';
        });
      });

      // Cerrar dropdown al hacer clic afuera
      document.addEventListener('click', () => {
        if (themeDropdown.style.display === 'flex') {
          themeDropdown.style.display = 'none';
        }
      });
    }

    // Botón de Cerrar Sesión
    const btnLogout = document.getElementById('btn-topbar-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        state.logout();
      });
    }

    // Perfil en Sidebar abre la vista RBAC si tiene permiso, sino abre Ajustes
    const profileTrigger = document.getElementById('user-profile-trigger');
    if (profileTrigger) {
      profileTrigger.addEventListener('click', () => {
        if (state.canAccessView('rbac')) {
          state.setView('rbac');
        } else {
          state.setView('ajustes');
        }
      });
    }

    // Botón para cambiar de empresa rápidamente
    const btnSwitchTenant = document.getElementById('btn-quick-switch-tenant');
    if (btnSwitchTenant) {
      btnSwitchTenant.addEventListener('click', () => {
        state.logout();
      });
    }
  }
}

// Inicializar la aplicación cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
