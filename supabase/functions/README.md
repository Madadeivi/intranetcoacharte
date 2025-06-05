# Supabase Edge Functions

Este directorio contiene las Edge Functions de Supabase para la intranet de Coacharte.

## 🚀 Funciones Disponibles

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
