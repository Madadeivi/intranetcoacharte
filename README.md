# 🏢 Intranet Coacharte - Monorepo

> Plataforma interna modernizada para empleados de Coacharte

## ✅ Estado del Proyecto

**PROYECTO COMPLETADO** - Migración exitosa de Express a arquitectura serverless moderna

- ✅ Frontend migrado a Next.js 15 con React 18 y TypeScript
- ✅ Backend en Supabase Edge Functions (Deno)
- ✅ Base de datos PostgreSQL con esquema completo
- ✅ 70 colaboradores importados y sincronizados
- ✅ Deploy automatizado en Vercel y Supabase
- ✅ Integración con Zoho CRM completada

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Base de Datos**: Supabase PostgreSQL
- **Monorepo**: Turborepo para gestión de workspaces
- **Deploy**: Vercel (Frontend) + Supabase (Backend)
- **Integraciones**: Zoho CRM/Desk + Gmail

## 📁 Estructura del Proyecto

```
├── apps/frontend/         # Aplicación Next.js
├── supabase/
│   ├── functions/         # Edge Functions (Deno)
│   ├── migrations/        # Migraciones de BD
│   └── config.toml       # Configuración Supabase
├── scripts/              # Scripts de migración e importación
├── docs/                 # Documentación técnica
├── package.json          # Configuración Turborepo
├── turbo.json           # Pipelines de build
└── tsconfig.json        # Configuración TypeScript
```

## 🛠️ Desarrollo

### Requisitos
- Node.js >= 18
- npm >= 8
- Supabase CLI

### Instalación
```bash
# Instalar dependencias
npm install

# Iniciar Supabase local
npm run supabase:start

# Desarrollo del frontend
npm run dev
```

### Scripts Disponibles
```bash
npm run build        # Construir todas las apps
npm run dev          # Desarrollo en todas las apps
npm run lint         # Linting en todas las apps
npm run test         # Testing en todas las apps
npm run type-check   # Verificar tipos TypeScript
npm run clean        # Limpiar builds
npm run format       # Formatear código
```

## 🌐 Despliegue

### Entornos
- **Desarrollo**: `develop` branch → Supabase staging
- **Producción**: `main` branch → Supabase production

### Variables de Entorno
Ver `.env.example` para las variables requeridas.

## 🔄 Flujo de Trabajo

1. Desarrollo en rama `develop`
2. Pull Request hacia `main`
3. Review y merge
4. Deploy automático a producción

## 📚 Documentación

- [Edge Functions](./supabase/functions/README.md)
- [Frontend Setup](./apps/frontend/README.md)

## ✅ Estado del Proyecto

### Completado
- [x] Configuración Turborepo + Workspaces
- [x] Frontend Next.js con TypeScript
- [x] Configuración Supabase + Edge Functions
- [x] Setup de desarrollo local
- [x] Configuración Git flow (develop/main)
- [x] Primera Edge Function (hello-world)

### En Progreso
- [ ] Protección de rama main
- [ ] Migración componentes React
- [ ] Integración Zoho APIs
- [ ] Sistema de autenticación
- [ ] Deploy Vercel

## 🔐 Configuración y Seguridad

**🚨 IMPORTANTE**: Antes de empezar, configura correctamente las variables de entorno.

### Setup Rápido (5 minutos)
```bash
# 1. Copiar configuración de ejemplo
cp .env.example .env.local

# 2. Verificar seguridad
./scripts/check-security.sh

# 3. Iniciar desarrollo
npm run dev
```

### Documentación de Seguridad
- **[🚀 Configuración Rápida](./CONFIGURACION_RAPIDA.md)** - Setup en 5 minutos
- **[🛡️ Guía de Seguridad](./docs/SEGURIDAD.md)** - Mejores prácticas
- **[📋 Variables de Entorno](./docs/VARIABLES_ENTORNO.md)** - Referencia completa

### ⚠️ Nunca hagas esto:
- ❌ Commitear archivos `.env` con credenciales reales
- ❌ Usar claves hardcodeadas en el código
- ❌ Compartir claves SERVICE_ROLE_KEY

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch desde `develop`
3. Commit cambios
4. Push a tu fork
5. Crear Pull Request
