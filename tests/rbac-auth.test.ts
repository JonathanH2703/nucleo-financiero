import { describe, it, expect } from 'vitest';
import { Rol, Permiso, Usuario } from '../src/domain/entities/auth.entity.js';

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
});
