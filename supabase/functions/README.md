# Supabase Edge Functions

Este directorio contiene las Edge Functions de Supabase para la intranet de
Coacharte.

## 🚀 Funciones Disponibles

### email-service

Función para envío de correos electrónicos usando SMTP (Gmail).

**Endpoint:** `POST /functions/v1/email-service`

**Body:**

```json
{
  "to": "usuario@ejemplo.com",
  "subject": "Asunto del email",
  "html": "<h1>Contenido HTML</h1>",
  "text": "Contenido de texto opcional"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Email sent successfully",
  "timestamp": "2025-06-22T..."
}
```

### support-ticket

Función para crear tickets de soporte en Zoho Desk y enviar confirmaciones por
email.

**Endpoint:** `POST /functions/v1/support-ticket`

**Body:**

```json
{
  "userEmail": "usuario@ejemplo.com",
  "userName": "Juan Pérez",
  "subject": "Problema con el sistema",
  "message": "Descripción del problema...",
  "priority": "Medium",
  "category": "technical"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket de soporte creado exitosamente en Zoho Desk",
  "ticketId": "123456",
  "ticketNumber": "12345",
  "webUrl": "https://...",
  "categoryReceived": "technical"
}
```

### user-auth

Función para manejo de autenticación de usuarios con Supabase Auth.

**Endpoints:**

- `POST /functions/v1/user-auth/login` - Iniciar sesión
- `POST /functions/v1/user-auth/logout` - Cerrar sesión
- `POST /functions/v1/user-auth/validate` - Validar token
- `POST /functions/v1/user-auth/reset-password` - Solicitar reset de contraseña
- `POST /functions/v1/user-auth/update-password` - Actualizar contraseña

### zoho-crm

Función para integración con Zoho CRM (contactos y leads).

**Endpoints:**

- `GET /functions/v1/zoho-crm/contacts` - Obtener contactos
- `POST /functions/v1/zoho-crm/contacts` - Crear contacto
- `GET /functions/v1/zoho-crm/leads` - Obtener leads
- `POST /functions/v1/zoho-crm/leads` - Crear lead

### hello-world

Función de prueba para verificar que el entorno funciona correctamente.

**Endpoint:** `POST /functions/v1/hello-world`

**Body:**

```json
{
  "name": "David"
}
```

**Response:**

```json
{
  "message": "Hello David!",
  "timestamp": "2025-06-04T...",
  "project": "Intranet Coacharte",
  "environment": "development"
}
```

## 🛠️ Desarrollo Local

### Iniciar Supabase local

```bash
npm run supabase:start
```

### Probar función localmente

```bash
curl -X POST http://localhost:54321/functions/v1/hello-world \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

### Desplegar funciones

```bash
npm run supabase:deploy
```

## 📋 Próximas Funciones

- **zoho-crm**: Integración con Zoho CRM para sincronizar datos
- **zoho-desk**: Integración con Zoho Desk para tickets
- **send-email**: Envío de emails con plantillas
- **auth-middleware**: Middleware de autenticación
- **data-sync**: Sincronización de datos entre servicios

## ⚙️ Configuración

Las funciones requieren las siguientes variables de entorno en Supabase:

- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `GMAIL_USER`
- `GMAIL_PASS`
- `FRONTEND_URL`
