# Variables de Entorno - Coacharte Intranet

Este documento describe todas las variables de entorno utilizadas en el proyecto de migración de la Intranet de Coacharte.

## 📋 Configuración por Entorno

### Variables Base (Supabase)
```bash
# URLs y claves de Supabase (diferentes por entorno)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Variables de Aplicación
```bash
# Identificador del entorno
NEXT_PUBLIC_APP_ENV=staging|production

# URLs de la aplicación
CLIENT_URL_FROM_ENV=https://[staging.]intranetcoacharte.com
```

## 🔐 Integración Zoho CRM & Desk

### Configuración OAuth
```bash
# Cliente OAuth de Zoho (mismo para ambos entornos)
NEXT_PUBLIC_ZOHO_CLIENT_ID=1000.KHU9JZOXYHNG0PHE14KU9RVIKFTRBN
ZOHO_CLIENT_SECRET=7f5530a132232c7e48aca239a0e54cf2a7b77684cb
ZOHO_REFRESH_TOKEN=1000.9153358db3eca17fba8e430e65a7aff1.7ad7211aa8fa0027a6017a9799184776
```

### URLs de Redirección
```bash
# Staging
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://staging.intranetcoacharte.com/auth/callback

# Production
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://intranetcoacharte.com/auth/callback
```

### APIs de Zoho
```bash
# URLs de las APIs (mismas para ambos entornos)
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1

# IDs de Organización
ZOHO_CRM_ORG_ID=691250724
ZOHO_DESK_ORG_ID=705863663
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=468528000000006907
```

## 📧 Configuración de Email (SMTP)

```bash
# Configuración del servidor SMTP
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=support@coacharte.mx
EMAIL_PASS=iubcwtlnowljqpbt
EMAIL_FROM=support@coacharte.mx
```

## 🔒 Seguridad

```bash
# Token JWT para autenticación
JWT_SECRET=8ebe269973a8dafc3514a99489c59fbd8ee2e949797ffa0c634893ca113d683a25bce8513a59a5ee0b20d53880336751f7dace5461bc0eb33da170e823653cbc
```

## 🌍 URLs por Entorno

| Entorno | URL Principal | Dominio Anterior |
|---------|---------------|------------------|
| **Staging** | `https://staging.intranetcoacharte.com` | N/A |
| **Production** | `https://intranetcoacharte.com` | `http://nomincacoacharte.com` |

## ⚙️ Variables Específicas de Next.js

### Variables Públicas (NEXT_PUBLIC_)
Estas variables están disponibles en el cliente (browser):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_ZOHO_CLIENT_ID`
- `NEXT_PUBLIC_ZOHO_REDIRECT_URI`

### Variables Privadas (Solo servidor)
Estas variables solo están disponibles en el servidor:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `EMAIL_PASS`
- `JWT_SECRET`
- `DATABASE_URL`

## 📝 Notas Importantes

### Migración desde Variables Anteriores

| Variable Anterior | Nueva Variable | Cambios |
|-------------------|----------------|---------|
| `GMAIL_USER` | `EMAIL_USER` | ✅ Actualizado |
| `GMAIL_PASS` | `EMAIL_PASS` | ✅ Actualizado |
| `CLIENT_URL_FROM_ENV` | `CLIENT_URL_FROM_ENV` | 🔄 URL actualizada |
| `ZOHO_REDIRECT_URI` | `NEXT_PUBLIC_ZOHO_REDIRECT_URI` | 🔄 Prefijo añadido |

### Configuración en Plataformas

1. **Vercel**: Configurar en dashboard de cada proyecto
2. **Supabase**: Configurar en Settings > API de cada proyecto
3. **Desarrollo Local**: Copiar desde `.env.staging.example` a `.env.local`

### Seguridad

- ⚠️ **Nunca** commits archivos `.env` reales
- ✅ Solo usa archivos `.env.*.example`
- 🔐 Todas las variables sensibles están excluidas en `.gitignore`
- 🌐 Variables `NEXT_PUBLIC_*` son visibles en el cliente

## 🚀 Configuración Rápida

### Para Desarrollo Local
```bash
# 1. Copiar template
cp .env.staging.example .env.local

# 2. Actualizar PROJECT-ID y claves de Supabase
# 3. Iniciar desarrollo
npm run dev
```

### Para Staging/Production
```bash
# 1. Usar scripts de gestión
./scripts/switch-to-staging.sh
./scripts/switch-to-production.sh

# 2. Configurar variables en Vercel
# 3. Configurar variables en Supabase
```
