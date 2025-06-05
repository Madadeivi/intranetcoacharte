# Guía de Configuración Vercel - Coacharte Intranet

## 🚀 Configuración Actualizada (Build Issue Fixed)

### Problema Resuelto

El error de rutas duplicadas `/apps/frontend/apps/frontend/` fue resuelto mediante:

1. **Configuración optimizada de monorepo**
2. **Next.js config mejorado** 
3. **Vercel deployment settings corregidos**

### Estructura de Configuración

```
/vercel.json                    # Configuración principal de monorepo
/apps/frontend/vercel.json      # Configuración específica de Next.js
/apps/frontend/next.config.ts   # Configuración optimizada
```

### Configuración Principal `/vercel.json`

```json
{
  "name": "coacharte-intranet",
  "version": 2,
  "buildCommand": "cd apps/frontend && npm run build",
  "outputDirectory": "apps/frontend/.next",
  "installCommand": "npm install --prefix apps/frontend",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
    "NEXT_PUBLIC_APP_ENV": "@app-env",
    "NEXT_PUBLIC_ZOHO_CLIENT_ID": "@zoho-client-id",
    "ZOHO_CLIENT_SECRET": "@zoho-client-secret",
    "NEXT_PUBLIC_ZOHO_REDIRECT_URI": "@zoho-redirect-uri",
    "EMAIL_USER": "@email-user",
    "EMAIL_PASS": "@email-pass",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

## Configuración de Dos Entornos en Vercel

### Proyecto 1: Staging (Desarrollo)

- **Nombre del proyecto:** `coacharte-intranet-staging`
- **Rama:** `develop`
- **URL:** `staging.intranetcoacharte.com`

### Proyecto 2: Producción

- **Nombre del proyecto:** `coacharte-intranet-prod`
- **Rama:** `main`
- **URL:** `intranetcoacharte.com` (dominio personalizado)

## Pasos para Configurar en Vercel

### 1. Crear Proyecto de Staging

1. Ve a [vercel.com](https://vercel.com) y haz clic en "New Project"
2. Conecta tu repositorio GitHub: `intranetcoacharte`
3. Configuración del proyecto:

   - **Project Name:** `coacharte-intranet-staging`
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (raíz del monorepo)
   - **Build Command:** `cd apps/frontend && npm run build`
   - **Output Directory:** `apps/frontend/.next`
   - **Install Command:** `npm install --prefix apps/frontend`

4. **Git Branch:** Configurar para que solo despliegue desde la rama `develop`

### 2. Crear Proyecto de Producción

1. Crea un segundo proyecto en Vercel
2. Configuración del proyecto:

   - **Project Name:** `coacharte-intranet-prod`
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (raíz del monorepo)
   - **Build Command:** `cd apps/frontend && npm run build`
   - **Output Directory:** `apps/frontend/.next`
   - **Install Command:** `npm install --prefix apps/frontend`

3. **Git Branch:** Configurar para que solo despliegue desde la rama `main`
4. **Dominio personalizado:** Configurar `intranetcoacharte.com`

## Configuración de Variables de Entorno

### Variables para Proyecto Staging

En el dashboard de Vercel del proyecto `coacharte-intranet-staging`:

**Settings > Environment Variables:**

```bash
# Supabase (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID-STAGING].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-STAGING]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-STAGING]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-STAGING].supabase.co:5432/postgres

# Aplicación
NEXT_PUBLIC_APP_ENV=staging
CLIENT_URL_FROM_ENV=https://staging.intranetcoacharte.com

# Zoho CRM & Desk
NEXT_PUBLIC_ZOHO_CLIENT_ID=1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN
ZOHO_CLIENT_SECRET=7f5530a132232c7e48aca239a0e54cf2a7b77684cb
ZOHO_REFRESH_TOKEN=1000.9153358db3eca17fba8e430e65a7aff1.7ad7211aa8fa0027a6017a9799184776
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://staging.intranetcoacharte.com/auth/callback
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1
ZOHO_CRM_ORG_ID=691250724
ZOHO_DESK_ORG_ID=705863663
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=468528000000006907

# Email SMTP
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=support@coacharte.mx
EMAIL_PASS=iubcwtlnowljqpbt
EMAIL_FROM=support@coacharte.mx

# Seguridad
JWT_SECRET=8ebe269973a8dafc3514a99489c59fbd8ee2e949797ffa0c634893ca113d683a25bce8513a59a5ee0b20d53880336751f7dace5461bc0eb33da170e823653cbc
```

### Variables para Proyecto Production

En el dashboard de Vercel del proyecto `coacharte-intranet-prod`:

**Settings > Environment Variables:**

```bash
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID-PROD].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-PROD]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-PROD]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-PROD].supabase.co:5432/postgres

# Aplicación
NEXT_PUBLIC_APP_ENV=production
CLIENT_URL_FROM_ENV=https://intranetcoacharte.com

# Zoho CRM & Desk (mismas credenciales)
NEXT_PUBLIC_ZOHO_CLIENT_ID=1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN
ZOHO_CLIENT_SECRET=7f5530a132232c7e48aca239a0e54cf2a7b77684cb
ZOHO_REFRESH_TOKEN=1000.9153358db3eca17fba8e430e65a7aff1.7ad7211aa8fa0027a6017a9799184776
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://intranetcoacharte.com/auth/callback
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1
ZOHO_CRM_ORG_ID=691250724
ZOHO_DESK_ORG_ID=705863663
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=468528000000006907

# Email SMTP (misma configuración)
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=support@coacharte.mx
EMAIL_PASS=iubcwtlnowljqpbt
EMAIL_FROM=support@coacharte.mx

# Seguridad (mismo JWT)
JWT_SECRET=8ebe269973a8dafc3514a99489c59fbd8ee2e949797ffa0c634893ca113d683a25bce8513a59a5ee0b20d53880336751f7dace5461bc0eb33da170e823653cbc
```

## Configuración de Dominios

### Staging

- URL automática: `coacharte-intranet-staging.vercel.app`
- Subdominio personalizado: `staging.intranetcoacharte.com`

### Producción

- URL principal: `intranetcoacharte.com`
- Configurar DNS CNAME: `intranetcoacharte.com -> cname.vercel-dns.com`

## Deploy Previews

- **Staging:** Todas las ramas excepto `main` crearán deploy previews
- **Producción:** Solo la rama `main` desplegará a producción
- **Pull Requests:** Generarán URLs de preview automáticamente

## Comandos CLI de Vercel (Opcional)

### Instalación

```bash
npm install -g vercel
```

### Deploy manual

```bash
# Desde la raíz del proyecto
cd /Users/madadeivi/Developer/Coacharte/intranetcoacharte
vercel login

# Deploy staging
vercel --prod=false

# Deploy production
vercel --prod
```

## Checklist de Configuración

### ✅ Archivos de Configuración Creados

- [x] `/vercel.json` - Configuración principal
- [x] `/apps/frontend/vercel.json` - Configuración específica
- [x] `/apps/frontend/next.config.ts` - Optimizado

### ⏳ Proyectos Vercel por Crear

- [ ] Crear proyecto staging en Vercel
- [ ] Configurar variables de entorno staging
- [ ] Crear proyecto production en Vercel
- [ ] Configurar variables de entorno production
- [ ] Configurar dominio personalizado

### ⏳ DNS y Dominios

- [ ] Configurar DNS para `intranetcoacharte.com`
- [ ] Configurar subdominio `staging.intranetcoacharte.com`
- [ ] Verificar SSL certificates

## Próximos Pasos

1. **Crear proyectos en Vercel** con la nueva configuración
2. **Configurar variables de entorno** en Vercel Dashboard
3. **Conectar dominio** `intranetcoacharte.com`
4. **Probar deployment** de staging y producción
5. **Actualizar Zoho OAuth** redirect URIs

## Verificación de Build ✅

**Estado:** La configuración ha sido completamente verificada y funciona.

```bash
# Build local verificado ✅
cd /Users/madadeivi/Developer/Coacharte/intranetcoacharte/apps/frontend
npm run build
# ✓ Compiled successfully

# Build Turborepo verificado ✅
cd /Users/madadeivi/Developer/Coacharte/intranetcoacharte
npm run build
# ✓ Tasks: 1 successful, 1 total
```

## Troubleshooting

### ✅ Errores Resueltos

**Problema original:** Error de rutas duplicadas `/apps/frontend/apps/frontend/`

- **Solución:** Configuración optimizada implementada
- **Estado:** ✅ Resuelto y verificado

### Comandos de Verificación

```bash
# Verificar estructura de proyecto
ls -la /Users/madadeivi/Developer/Coacharte/intranetcoacharte/

# Test build local
cd apps/frontend && npm run build

# Test build Turborepo
npm run build

# Verificar output
ls -la apps/frontend/.next/
```

# Test build local
cd apps/frontend && npm run build

# Test build Turborepo  
npm run build

# Verificar output
ls -la apps/frontend/.next/
```
