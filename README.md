# 🏛️ Núcleo Financiero — Core de Almacenamiento & Arquitectura Multi-Tenant

Sistema escalable y empresarial de **almacenamiento en bucket (MinIO local / AWS S3 producción)** con arquitectura **Multi-Tenant estricta (Schema-per-Tenant)**, diseñado para plataformas financieras y contables tipo **Siigo** o **Siesa**.

---

## 🌟 Principios de Arquitectura

Para garantizar que los datos de las diferentes empresas estén estrictamente aislados y cumplan con normativas de seguridad contable y auditoría:

```
                                  [ CLIENTES HTTP / FRONTEND ]
                                                │
                                    (X-Tenant-ID / Subdominio)
                                                ▼
                               [ Tenant Resolver Middleware ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
        [ PostgreSQL Multi-Tenant ]                           [ Object Storage Bucket ]
    ┌───────────────────────────────┐                     ┌───────────────────────────────┐
    │ public.tenants (Catálogo)     │                     │ s3://nucleo-financiero-dev/   │
    ├───────────────────────────────┤                     ├───────────────────────────────┤
    │ Schema: tenant_empresa_a      │                     │ tenants/empresa_a/            │
    │  ├─ archivos                  │                     │   ├─ facturacion/2026/10/...  │
    │  └─ documentos_contables      │                     │   └─ reportes/...             │
    ├───────────────────────────────┤                     ├───────────────────────────────┤
    │ Schema: tenant_empresa_b      │                     │ tenants/empresa_b/            │
    │  ├─ archivos                  │                     │   ├─ facturacion/2026/10/...  │
    │  └─ documentos_contables      │                     │   └─ certificados/...         │
    └───────────────────────────────┘                     └───────────────────────────────┘
```

1. **Aislamiento a nivel de Base de Datos (Schema-per-Tenant)**:
   - Comparten la misma base de datos física, pero cada empresa tiene su propio esquema de PostgreSQL (`tenant_<slug>`).
   - Ninguna empresa puede ver ni consultar tablas de otra empresa. Las consultas aplican `SET search_path TO "tenant_<slug>", public`.
   - El esquema `public` solo mantiene el catálogo de empresas, planes y cuotas.

2. **Aislamiento en Bucket (Bucket Prefix Isolation)**:
   - Los archivos de cada cliente se almacenan bajo prefijos únicos:
     `tenants/{tenant_id}/{categoria}/{año}/{mes}/{uuid}_{nombre_archivo}`
   - Categorías contables soportadas: `facturacion` (XML/PDF DIAN), `comprobantes`, `reportes`, `nomina`, `certificados`, `medios_magneticos`.

3. **Subidas Seguras vía Presigned URLs**:
   - Para archivos pesados (medios magnéticos, libros contables, nómina masiva), el cliente solicita una URL pre-firmada (`PUT`) con TTL de 15 minutos.
   - El cliente sube directo a MinIO / AWS S3 sin saturar la CPU ni la memoria del servidor de aplicaciones.
   - Validación estricta de cuotas en MB/GB por empresa antes de emitir la URL.

4. **Desacoplamiento (Clean Architecture)**:
   - El código utiliza la interfaz abstracta `IStorageService`.
   - Se puede alternar entre **MinIO (local)**, **AWS S3 (producción)** o **Cloudflare R2** simplemente cambiando variables de entorno.

---

## 🚀 Inicio Rápido (Entorno Local)

### Requisitos Previos
- **Node.js**: v20+
- **Docker & Docker Compose** (o PostgreSQL y MinIO standalone locales)

### 1. Variables de Entorno
El archivo `.env` ya viene configurado para desarrollo local:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=nucleo_admin
DB_PASSWORD=nucleo_secure_pass_2026
DB_NAME=nucleo_financiero_db

STORAGE_PROVIDER=minio
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET_NAME=nucleo-financiero-dev
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin123
STORAGE_FORCE_PATH_STYLE=true
```

### 2. Levantar Servicios con Docker Compose
Ejecuta en la raíz del proyecto:
```bash
docker compose up -d
```
Esto iniciará:
- **PostgreSQL 16**: `localhost:5432`
- **MinIO S3 API**: `http://localhost:9000`
- **MinIO Consola Web**: [http://localhost:9001](http://localhost:9001) *(Usuario: `minioadmin` / Clave: `minioadmin123`)*
- **Init Bucket**: Crea automáticamente el bucket `nucleo-financiero-dev` y habilita versionamiento.

> 💡 **¿Sin Docker?**: Puedes instalar MinIO con `winget install MinIO.Server` y ejecutarlo como binario standalone en Windows, o usar el script `.\scripts\setup-local-env.ps1`.

### 3. Instalar Dependencias y Arrancar
```bash
npm install
npm run dev
```

El servidor estará escuchando en: `http://localhost:3000/api/v1`

---

## 📡 Referencia de la API

### 1. Salud del Sistema
`GET /api/v1/health`
Retorna el estado de conexión a PostgreSQL y al bucket de almacenamiento.

---

### 2. Gestión de Empresas (Tenants)

#### Registrar y Aprovisionar Nueva Empresa
`POST /api/v1/tenants`
Crea el registro global y **crea automáticamente el esquema PostgreSQL aislado** para la empresa.

```json
{
  "name": "Comercializadora Andina S.A.S.",
  "slug": "comercializadora_andina",
  "taxId": "900987654-1",
  "storageQuotaBytes": 10737418240 // 10 GB
}
```

#### Listar Empresas
`GET /api/v1/tenants`

---

### 3. Almacenamiento en Bucket (Requiere `x-tenant-id` o `x-tenant-slug`)

#### Opción A: Subida Eficiente con Presigned URL (Recomendada)

1. **Solicitar URL de Subida:**
   `POST /api/v1/storage/upload-url`
   *Cabeceras:* `x-tenant-slug: comercializadora_andina`
   ```json
   {
     "originalName": "factura_electronica_SETP990001.pdf",
     "mimeType": "application/pdf",
     "estimatedSizeBytes": 154200,
     "category": "facturacion",
     "metadata": {
       "consecutivo": "SETP-990001",
       "cliente": "Empresa Destino S.A."
     }
   }
   ```
   *Respuesta:*
   ```json
   {
     "success": true,
     "data": {
       "fileId": "6f2e8c56-6bd2-49da-857e-3ec12b32520a",
       "uploadUrl": "http://localhost:9000/nucleo-financiero-dev/tenants/...",
       "storedKey": "tenants/t-123/facturacion/2026/10/...",
       "expiresInSeconds": 900
     }
   }
   ```

2. **Subir el archivo directo a MinIO / S3:**
   Petición HTTP `PUT` a la `uploadUrl` con el archivo binario en el cuerpo.

3. **Confirmar la Subida:**
   `POST /api/v1/storage/confirm-upload/6f2e8c56-6bd2-49da-857e-3ec12b32520a`
   *Cabeceras:* `x-tenant-slug: comercializadora_andina`

---

#### Opción B: Subida Directa (Multipart)
`POST /api/v1/storage/upload`
*Cabeceras:* `x-tenant-slug: comercializadora_andina`, `Content-Type: multipart/form-data`
*Form Data:* `file` (archivo binario), `category: facturacion`

---

#### Listar Archivos de la Empresa
`GET /api/v1/storage/files?category=facturacion&limit=20`
*Cabeceras:* `x-tenant-slug: comercializadora_andina`

---

#### Obtener Enlace de Descarga Seguro Temporal
`GET /api/v1/storage/download/:fileId?expiresIn=3600`
*Cabeceras:* `x-tenant-slug: comercializadora_andina`
Genera una URL firmada con tiempo de caducidad para visualizar o descargar el archivo.

---

#### Eliminar Archivo
`DELETE /api/v1/storage/files/:fileId`
*Cabeceras:* `x-tenant-slug: comercializadora_andina`
Elimina el archivo del bucket y reajusta la cuota de almacenamiento de la empresa.

---

### 4. Catálogo Universal & Operación POS (Requiere `x-tenant-id` o `x-tenant-slug`)

#### Consultar Catálogo y Productos (con escáner de código de barras o búsqueda)
`GET /api/v1/pos/catalogo?search=lomo`
`GET /api/v1/pos/catalogo?barcode=770123456789`
`GET /api/v1/pos/catalogo?categoriaId=cat_fuertes`

#### Consultar Áreas y Puntos de Atención (Mesas / Cajas / Vitrinas)
`GET /api/v1/pos/operacion`
Retorna las áreas operativas (`Salón Principal`, `Barra`, `Mostrador y Cajas`, `Vitrina Take-Away`) y los puntos de atención con sus estados en tiempo real (`LIBRE`, `OCUPADO`, `ESPERANDO_CUENTA`).

---

### 5. Comandas, Monitor KDS y Facturación POS

#### Registrar Nueva Comanda / Venta
`POST /api/v1/pos/comandas`
```json
{
  "modoAtencion": "MESA_SERVICIO", // "MOSTRADOR_ESCANER" | "MESA_SERVICIO" | "VITRINA_RAPIDO"
  "puntoAtencionId": "pto_m1",
  "clienteNombre": "Juan Carlos Pérez",
  "clienteNit": "1018456789",
  "incluyePropina": true,
  "items": [
    {
      "productoId": "p1", // Ceviche de Camarón (Impoconsumo 8%, Requiere KDS)
      "cantidad": 1,
      "notasCocina": "Sin cebolla"
    },
    {
      "productoId": "p9", // Croissant de Almendras (IVA 19%, No requiere KDS)
      "cantidad": 2
    }
  ]
}
```

#### Listar Comandas Activas
`GET /api/v1/pos/comandas`

#### Monitor de Cocina (KDS)
* `GET /api/v1/pos/kds`: Lista en tiempo real los ítems que requieren preparación en cocina/barra.
* `PATCH /api/v1/pos/kds/items/:itemId`: Actualiza el estado (`EN_COCINA` o `LISTO`).

#### Cobrar Comanda y Emitir Factura DIAN / Documento POS
`POST /api/v1/pos/comandas/:comandaId/cobrar`
```json
{
  "tipoDocumento": "FACTURA_ELECTRONICA_DIAN", // o "DOCUMENTO_EQUIVALENTE_POS"
  "metodoPago": "TARJETA",
  "incluyePropina": true
}
```
*Genera automáticamente el consecutivo fiscal, calcula impuestos (IVA / Impoconsumo), genera CUFE y código QR oficial DIAN, y libera el punto de atención a `LIBRE`.*

#### Consultar Facturas Emitidas (Módulo Facturación ERP)
`GET /api/v1/facturacion/documentos?limit=50`
`GET /api/v1/facturacion/documentos/:id`

---

### 6. Roles, Permisos Granulares y Autenticación (RBAC)

El sistema implementa un modelo **RBAC completamente personalizable y escalable**:
* Cada empresa dispone de un catálogo de permisos granulares agrupados por módulo (`POS`, `KDS`, `FACTURACION`, `CONTABILIDAD`, `INVENTARIO`, `USUARIOS_ROLES`).
* Los roles del sistema (`super_admin`, `admin_negocio`, `gerente_operativo`, `cajero`, `mesero`, `cocinero`, `contador`) vienen listos para operar.
* La empresa puede **crear nuevos roles a medida** o modificar los permisos asignados a cualquier rol existente.
* Los usuarios pueden autenticarse con correo corporativo o mediante **PIN rápido de 4 a 6 dígitos** (optimizado para puntos de venta táctiles).

#### Catálogo de Permisos del Sistema
`GET /api/v1/auth/permisos`
*Cabeceras:* `x-tenant-slug: restaurante_origen`

#### Listar Roles y sus Permisos
`GET /api/v1/auth/roles`

#### Crear Rol Personalizado
`POST /api/v1/auth/roles`
```json
{
  "nombre": "Capitán de Salón y Barra",
  "slug": "capitan_salon",
  "descripcion": "Supervisión de sala, anulación y cobro de comandas",
  "permisoIds": [
    "perm_pos_comanda_crear",
    "perm_pos_comanda_cobrar",
    "perm_pos_descuento_aplicar",
    "perm_pos_mesas_gestionar"
  ]
}
```

#### Modificar Permisos de un Rol
`PUT /api/v1/auth/roles/:rolId`
```json
{
  "nombre": "Capitán de Salón Senior",
  "permisoIds": ["perm_pos_comanda_crear", "perm_pos_comanda_cobrar", "perm_fact_emitir_dian"]
}
```

#### Autenticación Rápida por PIN (Pantallas POS)
`POST /api/v1/auth/login-pin`
```json
{
  "pin": "123456" // Carlos Mendoza - Super Admin (Figma Demo)
}
```

#### Listar Colaboradores y Roles
`GET /api/v1/auth/usuarios`

---

### 7. 🌱 Precarga Masiva de Datos Realistas (Seed Database)

Para ejecutar pruebas completas y disponer inmediatamente de empresas, catálogos, mesas, comandas y facturas idénticas a los mockups de Figma:
```bash
npm run db:seed
```
Este comando inicializa y puebla 4 empresas representativas con datos colombianos reales:
1. **Restaurante & Bar Origen** (`slug: restaurante_origen`, NIT 901.445.772-0)
2. **Panadería & Pastelería El Nogal** (`slug: panaderia_el_nogal`, NIT 901.332.558-9)
3. **Supermercado & Droguería La 18** (`slug: mercados_la_18`, NIT 900.741.225-1)
4. **Distribuidora Andina Ltda.** (`slug: comercializadora_andina`, NIT 800.987.654-3)

**Credenciales precargadas:**
* **Super Administrador:** `carlos.mendoza@nucleo.co` | PIN: `123456`
* **Cajero:** `laura.caja@nucleo.co` | PIN: `112233`
* **Mesero:** `david.salon@nucleo.co` | PIN: `445566`
* **Jefe de Cocina KDS:** `chef.roberto@nucleo.co` | PIN: `778899`
* **Contadora:** `maria.contable@nucleo.co` | PIN: `998877`

---

## 🐳 Despliegue con Docker y AWS

### Entorno de Pruebas Completo (Docker Compose)
Para levantar todo el stack localmente en contenedores:
```bash
docker compose up -d --build
```
Servicios levantados:
1. **nucleo_postgres**: PostgreSQL 16 (`localhost:5432`) con persistencia en volumen.
2. **nucleo_minio**: Object storage S3 local (`localhost:9000`) y consola gráfica (`localhost:9001`).
3. **nucleo_minio_init**: Configura el bucket y habilita versionamiento.
4. **nucleo_api**: API Backend Node.js / Express compilada con healthcheck activo (`localhost:3000/api/v1/health`).

### Despliegue en AWS (Producción)
* **Almacenamiento**: Asigna variables de entorno `STORAGE_PROVIDER=s3`, `STORAGE_BUCKET_NAME=mi-bucket-prod`, y credenciales IAM (roles o claves). El código usa AWS SDK v3 sin cambios.
* **Base de datos**: Conecta a **AWS RDS PostgreSQL** cambiando `DB_HOST`, `DB_USER` y `DB_PASSWORD`.
* **Backend**: El `Dockerfile` multi-stage genera una imagen ligera Alpine lista para **AWS ECS (Fargate)**, **AWS App Runner** o **Amazon EC2**.

---

## 🧪 Pruebas Unitarias

```bash
npm run test
```

## 📂 Estructura del Proyecto

```
nucleo-financiero/
├── Dockerfile                 # Multi-stage build optimizado para test y producción
├── .dockerignore              # Exclusión de archivos y dependencias locales
├── docker-compose.yml         # Postgres 16 + MinIO + MinIO Init + Backend API
├── .env.example               # Configuración documentada
├── scripts/
│   ├── init-storage.ts        # Script de inicialización S3/MinIO
│   ├── migrate-public.ts      # Migración de catálogo global
│   └── setup-local-env.ps1    # Setup automatizado en Windows
├── src/
│   ├── config/env.ts          # Zod schema typing
│   ├── core/
│   │   ├── context/           # AsyncLocalStorage para TenantContext
│   │   ├── errors/            # AppError, TenantErrors, StorageErrors
│   │   └── logger/            # Pino logger estructurado
│   ├── domain/
│   │   ├── entities/          # Catalogo, Operacion, POS, Facturacion, Tenant, StorageFile
│   │   ├── repositories/      # IPosRepository, ITenantRepository, IFileRepository
│   │   └── services/          # IStorageService
│   ├── infrastructure/
│   │   ├── database/          # Postgres Connection Pool y TenantSchemaManager con seeders
│   │   ├── repositories/      # PostgresPosRepository, PostgresTenantRepository, PostgresFileRepository
│   │   └── storage/           # S3StorageService (AWS SDK v3 MinIO/S3)
│   ├── application/use-cases/ # Casos de uso (Catalogo, Operacion, Comandas, KDS, Facturación, Storage)
│   ├── interfaces/http/       # Controllers, Middlewares y Routes (Pos, Facturacion, Tenants, Storage)
│   └── server.ts              # Servidor Express y Bootstrap
└── tests/                     # Vitest suites (pos-universal.test.ts, tenant-storage.test.ts)
```

