# Variables de Entorno - Coacharte Intranet

Este documento describe todas las variables de entorno utilizadas en el proyecto de migración de la Intranet de Coacharte.

## 📋 Configuración por Entorno

### Variables Base (Supabase)
```bash
# URLs y claves de Supabase (diferentes por entorno)
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### Variables de Aplicación
```bash
# Identificador del entorno
NEXT_PUBLIC_APP_ENV=staging|production

# URLs de la aplicación
CLIENT_URL_FROM_ENV=https://[pre-]intranetcoacharte.com
```

## 🔐 Integración Zoho CRM & Desk

### Configuración OAuth
```bash
# Cliente OAuth de Zoho (mismo para ambos entornos)
NEXT_PUBLIC_ZOHO_CLIENT_ID=::youwouldnoguess::
ZOHO_CLIENT_SECRET=::youwouldnoguess:
ZOHO_REFRESH_TOKEN=::youwouldnoguess:
```

### URLs de Redirección
```bash
# Staging
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://pre-intranetcoacharte.com/auth/callback

# Production
NEXT_PUBLIC_ZOHO_REDIRECT_URI=https://intranetcoacharte.com/auth/callback
```

### APIs de Zoho
```bash
# URLs de las APIs (mismas para ambos entornos)
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1

# IDs de Organización
ZOHO_CRM_ORG_ID=::youwouldnoguess:
ZOHO_DESK_ORG_ID=::youwouldnoguess:
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=::youwouldnoguess:
```

## 📧 Configuración de Email (SMTP)

```bash
# Configuración del servidor SMTP
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=david.dorantes@coacharte.mx
EMAIL_PASS=::youwouldnoguess:
EMAIL_FROM=soporte@coacharte.mx
```

## 🔒 Seguridad

```bash
# Token JWT para autenticación
JWT_SECRET=::youwouldnoguess:
```

## 🌍 URLs por Entorno

| Entorno | URL Principal | Dominio Anterior |
|---------|---------------|------------------|
| **Staging** | `https://pre-intranetcoacharte.com` | N/A |
| **Production** | `https://intranetcoacharte.com` | `http://nomina.coacharte.mx` |

## ⚙️ Variables Específicas de Next.js

### Variables Públicas (NEXT_PUBLIC_)
Estas variables están disponibles en el cliente (browser):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
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
3. **Desarrollo Local**: Copiar desde `.env.staging` a `.env.local`

### Seguridad

- ⚠️ **Nunca** commits archivos `.env` reales
- ✅ Solo usa archivos `.env.*`
- 🔐 Todas las variables sensibles están excluidas en `.gitignore`
- 🌐 Variables `NEXT_PUBLIC_*` son visibles en el cliente

## 🚀 Configuración Rápida

### Para Desarrollo Local
```bash
# 1. Copiar template
cp .env.staging .env.local
npm run dev
```

### Para Staging/Production
```bash
# 1. Usar scripts de gestión
./scripts/switch-to-staging.sh
./scripts/switch-to-production.sh
```
