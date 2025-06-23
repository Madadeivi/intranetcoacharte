# 🚀 Configuración Rápida de Variables de Entorno

## ⚡ Setup Inicial (5 minutos)

### 1. **Copiar archivos de ejemplo**

```bash
# En el directorio raíz del proyecto
cp .env.example .env.local

# Para desarrollo con Supabase local
cp supabase/.env.local.example supabase/.env.local

# Para el frontend
cp apps/frontend/.env.example apps/frontend/.env.local
```

### 2. **Configurar Supabase Local**

```bash
# Iniciar Supabase local
npx supabase start

# Copiar las claves mostradas en la terminal
# Editar .env.local con los valores mostrados
```

### 3. **Variables Mínimas Requeridas**

Para desarrollo local, necesitas **como mínimo**:

```env
# .env.local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=tu_clave_anon_local
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_local
```

### 4. **Verificar Configuración**

```bash
# Verificar que no hay credenciales expuestas
./scripts/check-security.sh

# Verificar que las variables están cargadas
npm run dev
```

## 🌍 Configuración por Entornos

### **Desarrollo Local**
- Usa `supabase start` para obtener claves
- Las claves locales son seguras para development

### **Staging**
- Obtener claves del dashboard de Supabase staging
- Usar variables de entorno o Vercel secrets

### **Producción**
- **NUNCA** usar claves de desarrollo en producción
- Configurar secrets en Vercel/plataforma de deploy
- Rotar claves regularmente

## 🔐 Gestión de Secrets en Vercel

```bash
# Configurar secrets para producción
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY  
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Para staging
vercel env add SUPABASE_URL --environment=preview
```

## 🆘 Solución de Problemas

### **Error: "SUPABASE_SERVICE_ROLE_KEY no está configurada"**
```bash
# Verificar que la variable existe
echo $SUPABASE_SERVICE_ROLE_KEY

# Si está vacía, configurarla
export SUPABASE_SERVICE_ROLE_KEY="tu_clave_aqui"
```

### **Error: "Failed to connect to Supabase"**
```bash
# Verificar que Supabase local está ejecutándose
npx supabase status

# Si no está ejecutándose
npx supabase start
```

### **Credenciales Expuestas**
```bash
# Ejecutar verificación de seguridad
./scripts/check-security.sh

# Si hay problemas, revisar docs/SEGURIDAD.md
```

## 📋 Checklist de Configuración

- [ ] ✅ Archivos .env.example copiados
- [ ] ✅ Supabase local ejecutándose
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Script de seguridad pasando
- [ ] ✅ Aplicación iniciando sin errores
- [ ] ✅ Archivos .env en .gitignore
- [ ] ✅ Backup de credenciales guardado de forma segura

## 🔗 Enlaces Útiles

- [Documentación completa de variables](/docs/VARIABLES_ENTORNO.md)
- [Guía de seguridad](/docs/SEGURIDAD.md)
- [Setup de Supabase](/docs/SUPABASE_SETUP.md)
- [Configuración de Vercel](/docs/VERCEL_SETUP.md)

---

**¿Problemas?** Revisa la documentación completa o contacta al equipo de desarrollo.
