# Guía de Configuración Supabase - Coacharte Intranet
====================================================

## Configuración de Dos Proyectos en Supabase

### Proyecto 1: Staging (Desarrollo)
**Nombre del proyecto:** `coacharte-intranet-staging`
**URL:** `https://[project-id-staging].supabase.co`
**Región:** Closest to your users (US East recommended)

### Proyecto 2: Producción
**Nombre del proyecto:** `coacharte-intranet-prod`
**URL:** `https://[project-id-prod].supabase.co`
**Región:** Same as staging for consistency

## Pasos para Configurar en Supabase

### 1. Crear Proyecto de Staging

1. Ve a [supabase.com](https://supabase.com) y haz clic en "New Project"
2. Configuración del proyecto:
   - **Organization:** Tu organización o personal
   - **Project Name:** `Coacharte Intranet Staging`
   - **Database Password:** Genera una contraseña segura y guárdala
   - **Region:** US East (Ohio) o la más cercana a tus usuarios
   - **Pricing Plan:** Free tier para staging (puede upgradearse después)

3. Una vez creado, anota las credenciales:
```bash
# Staging Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID-STAGING].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-STAGING]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-STAGING]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-STAGING].supabase.co:5432/postgres
```

### 2. Crear Proyecto de Producción

1. Crear segundo proyecto en Supabase
2. Configuración del proyecto:
   - **Organization:** Misma organización
   - **Project Name:** `Coacharte Intranet Production`
   - **Database Password:** Contraseña diferente y más segura
   - **Region:** Misma región que staging
   - **Pricing Plan:** Pro tier recomendado para producción

3. Anotar las credenciales de producción:
```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID-PROD].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY-PROD]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-PROD]
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-PROD].supabase.co:5432/postgres
```

## Configuración de Base de Datos

### Schema y Migraciones

Ambos proyectos necesitan la misma estructura de base de datos. Ya tienes la migración inicial:

1. **Para Staging:**
```bash
# Configurar Supabase CLI para staging
cd /Users/madadeivi/Developer/Coacharte/intranetcoacharte
supabase login
supabase init
supabase link --project-ref [PROJECT-ID-STAGING]

# Aplicar migraciones existentes
supabase db push

# O aplicar la migración específica
supabase migration up
```

2. **Para Producción:**
```bash
# Cambiar al proyecto de producción
supabase unlink
supabase link --project-ref [PROJECT-ID-PROD]

# Aplicar las mismas migraciones
supabase db push
```

### Aplicar el Fix del Trigger

En ambos proyectos, aplicar el fix del trigger que ya tienes:

```bash
# Para cada proyecto (staging y prod)
supabase db reset --linked
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres" -f fix_trigger.sql
```

## Configuración de Edge Functions

### Deploy a Staging
```bash
# Configurado para staging
supabase functions deploy --project-ref [PROJECT-ID-STAGING]

# Deploy funciones específicas
supabase functions deploy hello-world --project-ref [PROJECT-ID-STAGING]
supabase functions deploy auth-handler --project-ref [PROJECT-ID-STAGING]
supabase functions deploy notification-manager --project-ref [PROJECT-ID-STAGING]
supabase functions deploy document-manager --project-ref [PROJECT-ID-STAGING]
supabase functions deploy attendance-manager --project-ref [PROJECT-ID-STAGING]
```

### Deploy a Producción
```bash
# Configurado para producción
supabase functions deploy --project-ref [PROJECT-ID-PROD]

# Deploy todas las funciones
supabase functions deploy hello-world --project-ref [PROJECT-ID-PROD]
supabase functions deploy auth-handler --project-ref [PROJECT-ID-PROD]
supabase functions deploy notification-manager --project-ref [PROJECT-ID-PROD]
supabase functions deploy document-manager --project-ref [PROJECT-ID-PROD]
supabase functions deploy attendance-manager --project-ref [PROJECT-ID-PROD]
```

## Configuración de Variables de Entorno

### Variables para Proyecto Staging

En el dashboard de Supabase del proyecto staging:

**Settings > API > Environment Variables:**

```bash
# Variables específicas de Zoho (para Edge Functions)
ZOHO_CLIENT_ID=::youwouldnoguess::
ZOHO_CLIENT_SECRET=::youwouldnoguess::
ZOHO_REFRESH_TOKEN=::youwouldnoguess::
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1
ZOHO_CRM_ORG_ID=::youwouldnoguess::
ZOHO_DESK_ORG_ID=::youwouldnoguess::
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=::youwouldnoguess::

# Variables de Email (para notification-manager)
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=david.dorantes@coacharte.mx
EMAIL_PASS=::youwouldnoguess::
EMAIL_FROM=soporte@coacharte.mx

# Variables de aplicación
APP_ENV=staging
CLIENT_URL=https://pre-intranetcoacharte.com

# JWT para validación en Edge Functions
JWT_SECRET=::youwouldnoguess::
```

### Variables para Proyecto Production

En el dashboard de Supabase del proyecto production:

**Settings > API > Environment Variables:**

```bash
# Variables específicas de Zoho (mismas credenciales)
ZOHO_CLIENT_ID=::youwouldnoguess::
ZOHO_CLIENT_SECRET=::youwouldnoguess::
ZOHO_REFRESH_TOKEN=::youwouldnoguess::
ZOHO_API_URL=https://www.zohoapis.com/crm/v2
ZOHO_DESK_API_URL=https://desk.zoho.com/api/v1
ZOHO_CRM_ORG_ID=::youwouldnoguess::
ZOHO_DESK_ORG_ID=::youwouldnoguess::
ZOHO_DESK_COACHARTE_DEPARTMENT_ID=::youwouldnoguess::

# Variables de Email (misma configuración)
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=david.dorantes@coacharte.mx
EMAIL_PASS=::youwouldnoguess::
EMAIL_FROM=soporte@coacharte.mx

# Variables de aplicación
APP_ENV=production
CLIENT_URL=https://intranetcoacharte.com

# JWT para validación en Edge Functions
JWT_SECRET=::youwouldnoguess::
```

### Configuración en CLI Local

Para desarrollo local, configura las variables en `supabase/.env`:

```bash
# Crear archivo de variables locales
cd supabase
echo "ZOHO_CLIENT_ID=::youwouldnoguess::" > .env
echo "ZOHO_CLIENT_SECRET=::youwouldnoguess::" >> .env
echo "ZOHO_REFRESH_TOKEN=::youwouldnoguess::" >> .env
echo "EMAIL_USER=david.dorantes@coacharte.mx" >> .env
echo "EMAIL_PASS=::youwouldnoguess::" >> .env
echo "JWT_SECRET=::youwouldnoguess::" >> .env
```

## Configuración de Storage

### Buckets necesarios para ambos proyectos:

1. **intranet-documents** (para document-manager)
```sql
-- Ejecutar en ambos proyectos
INSERT INTO storage.buckets (id, name, public)
VALUES ('intranet-documents', 'intranet-documents', false);
```

2. **Políticas de Storage:**
```sql
-- Política para documentos - solo usuarios autenticados
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view documents" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Variables de Entorno por Proyecto

### Staging (.env.staging)
```bash
# Supabase Staging
SUPABASE_URL=https://[PROJECT-ID-STAGING].supabase.co
SUPABASE_ANON_KEY=[ANON-KEY-STAGING]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-STAGING]

# Zoho Integration
ZOHO_CLIENT_ID=[STAGING-CLIENT-ID]
ZOHO_CLIENT_SECRET=[STAGING-CLIENT-SECRET]
ZOHO_REDIRECT_URI=https://pre-intranetcoacharte.com/auth/callback
```

### Producción (.env.production)
```bash
# Supabase Production
SUPABASE_URL=https://[PROJECT-ID-PROD].supabase.co
SUPABASE_ANON_KEY=[ANON-KEY-PROD]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE-ROLE-KEY-PROD]

# Zoho Integration
ZOHO_CLIENT_ID=[PROD-CLIENT-ID]
ZOHO_CLIENT_SECRET=[PROD-CLIENT-SECRET]
ZOHO_REDIRECT_URI=https://intranetcoacharte.com/auth/callback
```

## Configuración de Políticas RLS (Row Level Security)

### Activar RLS en todas las tablas:
```sql
-- Ejecutar en ambos proyectos
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de seguridad
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view own attendance" ON attendance
FOR SELECT USING (auth.uid() = user_id);
```

## Configuración de Realtime

Para las notificaciones en tiempo real:

```sql
-- Habilitar Realtime en la tabla notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Monitoreo y Logs

### Staging
- **Dashboard:** https://app.supabase.com/project/[PROJECT-ID-STAGING]
- **Logs:** Functions → Logs para ver errores de Edge Functions
- **Database:** Database → Table Editor para ver datos

### Producción
- **Dashboard:** https://app.supabase.com/project/[PROJECT-ID-PROD]
- **Alertas:** Configurar alertas por email para errores críticos
- **Backups:** Activar backups automáticos diarios

## Workflow de Desarrollo

### Para cambios en staging:
```bash
# 1. Desarrollar localmente
supabase start
supabase functions serve

# 2. Probar cambios

# 3. Deploy a staging
supabase functions deploy --project-ref [PROJECT-ID-STAGING]

# 4. Probar en staging environment
```

### Para deploy a producción:
```bash
# 1. Merge a main branch

# 2. Deploy a producción
supabase functions deploy --project-ref [PROJECT-ID-PROD]

# 3. Verificar en producción
```

## Comandos de Gestión

### Backup de base de datos:
```bash
# Staging backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-STAGING].supabase.co:5432/postgres" > staging_backup.sql

# Producción backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID-PROD].supabase.co:5432/postgres" > prod_backup.sql
```

### Reset de base de datos (solo staging):
```bash
supabase db reset --linked
```

## Próximos Pasos

1. ✅ Crear proyectos en Supabase
2. ⏳ Aplicar migraciones y fix del trigger
3. ⏳ Configurar Storage buckets
4. ⏳ Deploy Edge Functions
5. ⏳ Configurar variables de entorno en Vercel
6. ⏳ Probar integración completa

## Troubleshooting

### Errores comunes:
- **Migration failed:** Verificar que la migración SQL sea válida
- **Function deploy failed:** Revisar logs de Supabase CLI
- **RLS blocking queries:** Verificar políticas de seguridad
- **CORS errors:** Configurar headers correctos en Edge Functions
