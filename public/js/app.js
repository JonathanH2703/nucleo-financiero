/**
 * APLICACIÓN PRINCIPAL (APP ROUTER & SHELL) — NÚCLEO FINANCIERO
 * Arquitectura modular con soporte reactivo para Multi-Tenant, Punto de Venta (POS) y Motor de Temas.
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
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-pill">Entorno de Desarrollo</span>
            <span>Plataforma Núcleo Financiero — Multi-Tenant PostgreSQL (Neon Cloud)</span>
          </div>
          <div class="tenant-indicator">
            <span>Empresa seleccionada:</span>
            <span class="tenant-name-highlight">${state.currentTenant.name}</span>
          </div>
        </div>
        <div id="login-view-mount" style="flex: 1; min-height: 0; overflow-y: auto;"></div>
      `;
      LoginView.mount(document.getElementById('login-view-mount'));
      return;
    }

    // Usuario autenticado: Renderizar Shell con Topbar, Sidebar y Contenido
    const user = state.currentUser;
    const tenant = state.currentTenant;
    const view = state.currentView;
    const isPosModule = state.currentModule === 'pos';

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

    this.root.innerHTML = `
      <!-- Banner de Entorno de Desarrollo -->
      <div class="dev-env-banner">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge-pill">Modo Demostración</span>
          <span><b>Aislamiento Activo:</b> Schema PostgreSQL <code>"${tenant.slug}"</code></span>
        </div>
        <div class="tenant-indicator">
          <span>Conectado como: <b>${user.nombre}</b> (<span style="color: var(--primary-600); font-weight: 700;">${user.rol.nombre}</span>)</span>
          <button type="button" class="btn-switch-tenant" id="btn-quick-switch-tenant">
            🔄 Cambiar Empresa
          </button>
        </div>
      </div>

      <div class="app-container">
        <!-- Sidebar Izquierda -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="brand-icon-box">🏛️</div>
              <div>
                <div class="brand-title">NÚCLEO</div>
                <div class="brand-subtitle">Claridad empresarial</div>
              </div>
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

          <!-- Navegación -->
          <nav class="sidebar-nav">
            <div class="nav-section-title">Gestión Administrativa</div>

            <div class="nav-item ${view === 'dashboard' ? 'active' : ''}" data-nav="dashboard">
              <span class="nav-item-icon">📊</span>
              <div>
                <span>Dashboard</span>
                <span class="nav-item-sub">Resumen ejecutivo</span>
              </div>
            </div>

            <div class="nav-item ${view === 'facturacion' ? 'active' : ''}" data-nav="facturacion">
              <span class="nav-item-icon">📑</span>
              <div>
                <span>Facturación</span>
                <span class="nav-item-sub">Facturas electrónicas DIAN</span>
              </div>
            </div>

            <div class="nav-item ${view === 'pos' ? 'active' : ''}" data-nav="pos">
              <span class="nav-item-icon">☕</span>
              <div>
                <span>Punto de Venta</span>
                <span class="nav-item-sub">POS, Mesas & Comandas</span>
              </div>
            </div>

            <div class="nav-item ${view === 'contabilidad' ? 'active' : ''}" data-nav="contabilidad">
              <span class="nav-item-icon">🏛️</span>
              <div>
                <span>Contabilidad</span>
                <span class="nav-item-sub">Módulo DIAN F-350</span>
              </div>
              <span class="nav-badge-wip">Demo</span>
            </div>

            <div class="nav-item ${view === 'clientes' ? 'active' : ''}" data-nav="clientes">
              <span class="nav-item-icon">👥</span>
              <div>
                <span>Clientes CRM</span>
                <span class="nav-item-sub">Directorio de terceros</span>
              </div>
              <span class="nav-badge-wip">WIP</span>
            </div>

            <div class="nav-item ${view === 'inventario' ? 'active' : ''}" data-nav="inventario">
              <span class="nav-item-icon">📦</span>
              <div>
                <span>Inventario</span>
                <span class="nav-item-sub">Existencias y kardex</span>
              </div>
              <span class="nav-badge-wip">WIP</span>
            </div>

            <div class="nav-item ${view === 'reportes' ? 'active' : ''}" data-nav="reportes">
              <span class="nav-item-icon">📈</span>
              <div>
                <span>Reportes</span>
                <span class="nav-item-sub">Inteligencia de negocio</span>
              </div>
              <span class="nav-badge-wip">WIP</span>
            </div>

            <div class="nav-section-title">Seguridad y Preferencias</div>

            <div class="nav-item ${view === 'rbac' ? 'active' : ''}" data-nav="rbac">
              <span class="nav-item-icon">🛡️</span>
              <div>
                <span>Roles & Permisos</span>
                <span class="nav-item-sub">Matriz RBAC y usuarios</span>
              </div>
            </div>

            <div class="nav-item ${view === 'ajustes' ? 'active' : ''}" data-nav="ajustes">
              <span class="nav-item-icon">⚙️</span>
              <div>
                <span>Ajustes & Tema</span>
                <span class="nav-item-sub">Personalizar apariencia</span>
              </div>
            </div>
          </nav>

          <!-- Pie del Sidebar con el Usuario en Sesión -->
          <div class="sidebar-footer">
            <div class="user-profile-widget" id="user-profile-trigger" title="Ver perfil y permisos">
              <div class="user-avatar-circle">${userInitials}</div>
              <div class="user-info-text">
                <span class="user-name">${user.nombre}</span>
                <span class="user-role-badge">${user.rol.nombre}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Área de Contenido Principal -->
        <main class="main-viewport">
          <!-- Barra Superior (Topbar de Figma) -->
          <header class="topbar">
            <div class="topbar-left">
              <div>
                <div class="topbar-view-title">${this.getViewTitle(view)}</div>
                <div class="topbar-view-subtitle">${tenant.name} · ${tenant.nit}</div>
              </div>

              <!-- Píldora Selectora de Módulo (Núcleo Gestión vs Núcleo POS) -->
              <button type="button" class="module-switcher-pill ${isPosModule ? 'pos-mode' : ''}" id="topbar-module-pill">
                <span>${isPosModule ? '☕ Núcleo Punto de Venta' : '🌐 Núcleo Gestión'}</span>
                <span style="font-size: 10px;">▼</span>
              </button>
            </div>

            <div class="topbar-right">
              <div class="topbar-location">
                <span>📍</span>
                <span>${tenant.sucursales[0] || 'Sede Principal — Bogotá'}</span>
              </div>

              <div class="topbar-timer">
                <span>⏱</span>
                <span>7h 57m</span>
              </div>

              <!-- Selector Rápido de Tema (Claro / Oscuro / Sistema) -->
              <div class="theme-switcher-wrapper">
                <button type="button" class="btn-theme-toggle" id="btn-theme-quick-toggle" title="Cambiar tema visual (Claro / Oscuro / Sistema)">
                  <span id="theme-btn-icon">${themeIcon}</span>
                  <span id="theme-btn-label">${themeLabel}</span>
                  <span style="font-size: 9px; opacity: 0.7;">▼</span>
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

              <button type="button" class="btn-icon" title="Notificaciones DIAN" onclick="alert('Sistema de notificaciones DIAN: Todos los servicios operativos.')">
                🔔
              </button>

              <button type="button" class="btn-logout" id="btn-topbar-logout">
                Cerrar Sesión
              </button>
            </div>
          </header>

          <!-- Vista Activa (pos-active elimina paddings y scroll exterior para el POS) -->
          <div class="view-content ${view === 'pos' ? 'pos-active' : ''}" id="active-view-mount"></div>
        </main>
      </div>
    `;

    this.bindShellEvents();
    this.mountActiveView(view);
  }

  static getViewTitle(view) {
    switch (view) {
      case 'dashboard':
        return 'NÚCLEO Dashboard Ejecutivo';
      case 'facturacion':
        return 'NÚCLEO Facturación Electrónica DIAN';
      case 'pos':
        return 'NÚCLEO Comanda y Punto de Venta POS';
      case 'rbac':
        return 'NÚCLEO Roles y Permisos (RBAC)';
      case 'ajustes':
        return 'NÚCLEO Ajustes y Preferencias';
      case 'contabilidad':
        return 'NÚCLEO Contabilidad y Declaraciones DIAN';
      case 'clientes':
        return 'NÚCLEO Directorio de Clientes CRM';
      case 'inventario':
        return 'NÚCLEO Control de Inventario y Kardex';
      case 'reportes':
        return 'NÚCLEO Inteligencia de Negocio y Reportes';
      default:
        return 'NÚCLEO Financiero';
    }
  }

  static mountActiveView(view) {
    const mountPoint = document.getElementById('active-view-mount');
    if (!mountPoint) return;

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
      default:
        DashboardView.mount(mountPoint);
    }
  }

  static bindShellEvents() {
    // Navegación Sidebar
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-nav');
        if (targetView === 'pos') {
          state.setModule('pos');
        } else {
          state.setModule('gestion');
        }
        state.setView(targetView);
      });
    });

    // Píldora de Módulo en Topbar (alterna entre Gestión y POS)
    const modulePill = document.getElementById('topbar-module-pill');
    if (modulePill) {
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

    // Perfil en Sidebar abre la vista RBAC
    const profileTrigger = document.getElementById('user-profile-trigger');
    if (profileTrigger) {
      profileTrigger.addEventListener('click', () => {
        state.setView('rbac');
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
