# 🏢 Intranet Coacharte - Monorepo

> Plataforma interna modernizada para empleados de Coacharte

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Base de Datos**: Supabase PostgreSQL
- **Monorepo**: Turborepo para gestión de workspaces
- **Deploy**: Vercel (Frontend) + Supabase (Backend)
- **Integraciones**: Zoho CRM/Desk + Gmail

## 📁 Estructura del Proyecto

```
├── apps/
│   └── frontend/          # Aplicación Next.js
├── supabase/
│   ├── functions/         # Edge Functions (Deno)
│   └── config.toml       # Configuración Supabase
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

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch desde `develop`
3. Commit cambios
4. Push a tu fork
5. Crear Pull Request
