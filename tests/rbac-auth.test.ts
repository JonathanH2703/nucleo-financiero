import { describe, it, expect } from 'vitest';
import { Rol, Permiso, Usuario } from '../src/domain/entities/auth.entity.js';
import { Sucursal } from '../src/domain/entities/sucursal.entity.js';
import { Tenant } from '../src/domain/entities/tenant.entity.js';

describe('Customizable RBAC Domain Tests (Roles, Permisos y Seguridad)', () => {
  const permCrearComanda = new Permiso({
    id: 'p-1',
    modulo: 'POS',
    codigo: 'pos.comanda.crear',
    nombre: 'Crear Comanda',
  });

  const permCobrarComanda = new Permiso({
    id: 'p-2',
    modulo: 'POS',
    codigo: 'pos.comanda.cobrar',
    nombre: 'Cobrar Comanda',
  });

  const permAsientosContables = new Permiso({
    id: 'p-3',
    modulo: 'CONTABILIDAD',
    codigo: 'contabilidad.asientos.crear',
    nombre: 'Crear Asientos Contables',
  });

  describe('Super Admin Bypass Universal', () => {
    it('debe otorgar autorización universal irrestricta a Super Admin sin importar el permiso', () => {
      const superAdminRol = new Rol({
        id: 'r-super',
        nombre: 'Super Administrador',
        slug: 'super_admin',
        esSistema: true,
        permisos: [], // No requiere permisos explícitos
      });

      expect(superAdminRol.tienePermiso('cualquier.permiso.existente')).toBe(true);
      expect(superAdminRol.tienePermiso('pos.comanda.cobrar')).toBe(true);

      const superUser = new Usuario({
        id: 'u-1',
        nombre: 'Carlos Mendoza',
        email: 'carlos@empresa.co',
        rolId: 'r-super',
        rolSlug: 'super_admin',
      });

      expect(superUser.puede('pos.comanda.cobrar')).toBe(true);
      expect(superUser.puede('configuracion.avanzada')).toBe(true);
    });
  });

  describe('Roles Predefinidos y Restricciones de Permisos', () => {
    it('debe permitir cobrar comanda a un Cajero pero restringirle contabilidad', () => {
      const cajeroRol = new Rol({
        id: 'r-cajero',
        nombre: 'Cajero / Mostrador',
        slug: 'cajero',
        permisos: [permCrearComanda, permCobrarComanda],
      });

      expect(cajeroRol.tienePermiso('pos.comanda.crear')).toBe(true);
      expect(cajeroRol.tienePermiso('pos.comanda.cobrar')).toBe(true);
      expect(cajeroRol.tienePermiso('contabilidad.asientos.crear')).toBe(false);

      const cajeroUser = new Usuario({
        id: 'u-2',
        nombre: 'Laura Gómez',
        email: 'laura@empresa.co',
        pinSeguridad: '112233',
        rolId: 'r-cajero',
        rolSlug: 'cajero',
        permisos: ['pos.comanda.crear', 'pos.comanda.cobrar'],
      });

      expect(cajeroUser.puede('pos.comanda.cobrar')).toBe(true);
      expect(cajeroUser.puede('contabilidad.asientos.crear')).toBe(false);
    });
  });

  describe('Personalización Total de Roles por la Empresa (Escalabilidad)', () => {
    it('debe permitir crear roles personalizados (ej. Capitán de Salón) con combinación libre de permisos', () => {
      const capitanRol = new Rol({
        id: 'r-custom-1',
        nombre: 'Capitán de Salón y Barra',
        slug: 'capitan_salon',
        esSistema: false, // Rol personalizado por la empresa
        permisos: [permCrearComanda],
      });

      expect(capitanRol.tienePermiso('pos.comanda.crear')).toBe(true);
      expect(capitanRol.tienePermiso('pos.comanda.cobrar')).toBe(false);

      // La empresa decide otorgarle permiso de cobro adicional
      capitanRol.asignarPermisos([permCrearComanda, permCobrarComanda]);
      expect(capitanRol.tienePermiso('pos.comanda.cobrar')).toBe(true);
    });
  });

  describe('Autenticación Limpia Multi-Sucursal (NIT + PIN)', () => {
    it('debe permitir modelar sucursales con PINs independientes para acceso táctil al POS', () => {
      const tenant = new Tenant({
        id: 't-1',
        name: 'Restaurante & Bar Origen S.A.S.',
        slug: 'restaurante_origen',
        taxId: '901.445.772-0',
        schemaName: 'tenant_restaurante_origen',
        status: 'ACTIVE',
        adminPin: '123456',
        storageQuotaBytes: 1000,
        storageUsedBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sucursalPrincipal = new Sucursal({
        id: 'suc-1',
        nombre: 'Sede Principal Zona G',
        codigo: 'SUC-01',
        pinAcceso: '1001',
      });

      const sucursalNorte = new Sucursal({
        id: 'suc-2',
        nombre: 'Sede Parque 93',
        codigo: 'SUC-02',
        pinAcceso: '1002',
      });

      expect(tenant.adminPin).toBe('123456');
      expect(sucursalPrincipal.pinAcceso).toBe('1001');
      expect(sucursalNorte.pinAcceso).toBe('1002');
      expect(sucursalPrincipal.pinAcceso).not.toBe(sucursalNorte.pinAcceso);

      const usuarioSucursal = new Usuario({
        id: 'u-suc-1',
        nombre: 'Caja Zona G',
        email: 'caja.zonag@origen.co',
        rolId: 'r-cajero',
        rolSlug: 'cajero',
        sucursalId: sucursalPrincipal.id,
        sucursalNombre: sucursalPrincipal.nombre,
      });

      expect(usuarioSucursal.sucursalId).toBe('suc-1');
      expect(usuarioSucursal.sucursalNombre).toBe('Sede Principal Zona G');
    });
  });
});
