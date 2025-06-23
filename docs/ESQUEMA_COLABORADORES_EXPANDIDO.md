# Esquema Expandido de Colaboradores

## Descripción

Esta migración expande el esquema de la tabla `collaborators` para incluir todos los campos presentes en el CSV de datos reales de Coacharte. El esquema anterior era básico y solo incluía campos esenciales, pero ahora tenemos un modelo completo que refleja toda la información de colaboradores del mundo real.

## Cambios Realizados

### Nueva Migración: `20250623000002_expand_collaborators_schema.sql`

Esta migración añade **50+ nuevas columnas** a la tabla `collaborators`, organizadas en las siguientes categorías:

#### 1. Metadatos de Zoho
- `record_id` - ID único del registro en Zoho CRM
- `status` - Estado del colaborador (Asignado, etc.)
- `internal_registry` - Código interno (COA-XX)
- `owner_id` y `owner_name` - Propietario del registro en Zoho
- Timestamps de creación, modificación y última actividad
- Configuración de moneda y tipo de cambio

#### 2. Datos Personales
- `curp` - Clave Única de Registro de Población (18 caracteres)
- `rfc` - Registro Federal de Contribuyentes (12-13 caracteres)
- `nss` - Número de Seguridad Social
- `birth_date` - Fecha de nacimiento
- `gender` - Sexo (Masculino/Femenino/Otro)
- `nationality` - Nacionalidad
- `civil_status` - Estado civil
- `address` - Dirección completa

#### 3. Contactos de Emergencia
- Contacto primario: nombre, teléfono, parentesco
- Contacto secundario: nombre, teléfono, parentesco

#### 4. Información Médica
- `blood_type` - Tipo de sangre (A+, A-, B+, B-, AB+, AB-, O+, O-)
- `allergies` - Alergias conocidas

#### 5. Información Bancaria
- `bank` - Banco
- `card_number` - Número de tarjeta
- `bank_card_number` - Número de tarjeta bancaria
- `clabe` - Clave Bancaria Estandarizada (18 dígitos)

#### 6. Información Laboral
- `work_area` - Área de trabajo
- `work_area_specify` - Especificaciones adicionales del área
- `clients` - Clientes asignados
- `hire_date` - Fecha de ingreso

#### 7. Gestión de Vacaciones
- `available_vacation_days` - Días disponibles
- `taken_vacation_days` - Días tomados
- `vacation_balance` - Balance (calculado automáticamente)

#### 8. Comunicación
- `personal_email` - Email personal
- `edenred_email` - Email de Edenred
- `mobile_phone` - Teléfono celular

## Características Técnicas

### Índices Añadidos
- Índices en campos únicos: `curp`, `rfc`, `nss`, `internal_registry`
- Índices de búsqueda: `status`, `work_area`, `hire_date`
- Índices de rendimiento para consultas frecuentes

### Constraints de Validación
- **CURP**: Exactamente 18 caracteres
- **RFC**: Entre 12 y 13 caracteres
- **CLABE**: Exactamente 18 dígitos
- **Género**: Solo valores permitidos (Masculino, Femenino, Otro)
- **Vacaciones**: Días no negativos

### Triggers Automáticos
- **Balance de vacaciones**: Se calcula automáticamente al insertar/actualizar
- **Timestamps**: `updated_at` se actualiza automáticamente

### Funciones de Validación
- `validate_curp()` - Valida formato de CURP
- `validate_rfc()` - Valida formato de RFC

## Vistas Creadas

### `collaborators_basic`
Vista pública con información básica (sin datos sensibles):
```sql
SELECT id, zoho_id, email, full_name, title, department, 
       work_area, phone, mobile_phone, hire_date, active, 
       status, vacation_balance
FROM collaborators;
```

### `collaborators_emergency_contacts`
Vista para acceso rápido a contactos de emergencia:
```sql
SELECT id, full_name, 
       emergency_contact_primary_name, emergency_contact_primary_phone,
       emergency_contact_secondary_name, emergency_contact_secondary_phone
FROM collaborators WHERE active = true;
```

## Funciones Utilitarias

### `get_collaborator_by_email(email)`
Obtiene información básica de un colaborador por email:
```sql
SELECT * FROM get_collaborator_by_email('usuario@coacharte.mx');
```

### `get_vacation_stats_by_department()`
Estadísticas de vacaciones por departamento:
```sql
SELECT * FROM get_vacation_stats_by_department();
```

## Scripts de Importación

### Script TypeScript: `scripts/import-collaborators.ts`
Script completo para importar datos desde CSV:
- Mapeo automático de campos CSV a esquema DB
- Validación y limpieza de datos
- Inserción en lotes para mejor rendimiento
- Manejo robusto de errores

### Script SQL: `scripts/import-collaborators-csv.sql`
Script SQL para importación manual desde tabla temporal

### Script Bash: `scripts/apply-collaborators-migration.sh`
Script automatizado que:
1. Aplica la migración
2. Verifica la estructura
3. Instala dependencias
4. Ejecuta importación de CSV
5. Muestra estadísticas finales

## Cómo Usar

### 1. Aplicar la Migración
```bash
# Método automático (recomendado)
./scripts/apply-collaborators-migration.sh

# Método manual
supabase db push
```

### 2. Importar Datos CSV
```bash
# Si tienes el CSV en Downloads
node scripts/import-collaborators.ts /Users/madadeivi/Downloads/Colaboradores_2025_06_11.csv

# Con cualquier archivo CSV
node scripts/import-collaborators.ts /ruta/al/archivo.csv
```

### 3. Consultar Datos
```sql
-- Todos los colaboradores activos
SELECT * FROM collaborators_basic WHERE active = true;

-- Información de emergencia
SELECT * FROM collaborators_emergency_contacts;

-- Estadísticas de vacaciones
SELECT * FROM get_vacation_stats_by_department();

-- Buscar por email
SELECT * FROM get_collaborator_by_email('luis.pascual@coacharte.mx');
```

## Seguridad y Privacidad

### Datos Sensibles
Los siguientes campos contienen información sensible y requieren permisos especiales:
- `curp`, `rfc`, `nss` (identificadores oficiales)
- `allergies` (información médica)
- `address` (dirección personal)
- `personal_email` (email personal)
- Información bancaria (`clabe`, `bank_card_number`)

### Permisos
- Las vistas públicas (`collaborators_basic`, `collaborators_emergency_contacts`) excluyen datos sensibles
- El acceso directo a la tabla `collaborators` requiere autenticación
- Los campos de información bancaria y médica requieren permisos adicionales

## Mapeo de Campos CSV

| Campo CSV | Campo DB | Tipo | Validación |
|-----------|----------|------|------------|
| Record Id | record_id, zoho_id | VARCHAR(255) | Required |
| Email | email | VARCHAR(255) | Email format |
| Nombre completo | full_name | VARCHAR(255) | - |
| CURP | curp | VARCHAR(18) | 18 chars, unique |
| RFC | rfc | VARCHAR(13) | 12-13 chars, unique |
| NSS | nss | VARCHAR(20) | Unique |
| Fecha de nacimiento | birth_date | DATE | Valid date |
| Sexo | gender | VARCHAR(20) | Enum values |
| Vacaciones disponibles | available_vacation_days | INTEGER | ≥ 0 |
| ... | ... | ... | ... |

## Próximos Pasos

1. ✅ **Fase 5 COMPLETADA**: Esquema expandido implementado y probado localmente
2. **Despliegue a Entornos**:
   - [ ] Aplicar migraciones en staging
   - [ ] Aplicar migraciones en producción
   - [ ] Importar datos reales de colaboradores
3. **APIs**: Crear endpoints REST para consultar datos de colaboradores
4. **Frontend**: Actualizar interfaz para mostrar nuevos campos
5. **Reportes**: Implementar dashboard con estadísticas de colaboradores
6. **Sincronización**: Automatizar sync con Zoho CRM
7. **Backup**: Implementar respaldo automático de datos sensibles

## Despliegue a Múltiples Entornos

### Scripts de Despliegue

El proyecto incluye scripts automatizados para desplegar las migraciones a diferentes entornos:

#### `scripts/deploy-migrations.sh`
Script principal para gestionar migraciones:

```bash
# Verificar estado de todos los entornos
./scripts/deploy-migrations.sh status

# Aplicar migraciones localmente
./scripts/deploy-migrations.sh local

# Desplegar a staging
./scripts/deploy-migrations.sh staging

# Desplegar a producción
./scripts/deploy-migrations.sh production
```

#### Entornos Configurados

- **🏠 LOCAL**: Desarrollo con Supabase local (`http://127.0.0.1:54321`)
- **🧪 STAGING**: Entorno de pruebas (`https://ktjjiprulmqbvycbxxao.supabase.co`)
- **🚀 PRODUCTION**: Entorno de producción (`https://zljualvricugqvcvaeht.supabase.co`)

### Proceso de Despliegue Recomendado

1. **Desarrollo Local**: Probar migraciones en entorno local
2. **Staging**: Aplicar y validar en staging
3. **Producción**: Desplegar a producción tras validación exitosa

### Verificación Post-Despliegue

Después de cada despliegue, verificar:
- ✅ Todas las columnas nuevas están presentes
- ✅ Vistas `collaborators_basic` y `collaborators_emergency_contacts` funcionan
- ✅ Funciones `get_collaborator_by_email()` y `get_vacation_stats_by_department()` están disponibles
- ✅ Triggers y constraints funcionan correctamente

### Comandos de Verificación

```sql
-- Verificar columnas críticas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'collaborators' 
AND column_name IN ('curp', 'rfc', 'nss', 'blood_type', 'emergency_contact_primary_name');

-- Verificar vistas
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'collaborators_%';

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%collaborator%';

-- Estadísticas de datos
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE active = true) as active,
       COUNT(DISTINCT department) as departments
FROM collaborators;
```

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
Esto indica datos duplicados en el CSV. El script maneja automáticamente duplicados usando `ON CONFLICT`.

### Error: "invalid input syntax for type date"
Formato de fecha incorrecto en CSV. El script incluye parsing robusto de fechas.

### Error: "function does not exist"
La migración no se aplicó completamente. Ejecuta `supabase db push` nuevamente.

## Verificación de Migración

Para verificar que todo se aplicó correctamente:

```bash
# Verificar columnas nuevas
supabase db exec "SELECT column_name FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name IN ('curp', 'rfc', 'nss');"

# Verificar vistas
supabase db exec "SELECT table_name FROM information_schema.views WHERE table_schema = 'public';"

# Verificar funciones
supabase db exec "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';"

# Estadísticas de datos
supabase db exec "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE active = true) as active FROM collaborators;"
```
