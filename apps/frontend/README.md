# 🏢 Frontend - Intranet Coacharte

> Aplicación Next.js para la intranet interna de empleados de Coacharte

## 🚀 Stack Tecnológico

- **Framework**: Next.js 14 con App Router
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Estado**: Zustand para gestión de estado global
- **Autenticación**: Supabase Auth + OAuth Zoho
- **Backend**: Supabase Edge Functions
- **Deploy**: Vercel

## 🛠️ Desarrollo

### Iniciar servidor de desarrollo
```bash
# Desde la raíz del monorepo
npm run dev

# O desde este directorio
cd apps/frontend && npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### Scripts Disponibles
```bash
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Verificar código con ESLint
npm run type-check   # Verificar tipos TypeScript
npm run clean        # Limpiar archivos de build
```

## 📁 Estructura

```
src/
├── app/              # App Router (Next.js 14)
│   ├── globals.css   # Estilos globales + Tailwind
│   ├── layout.tsx    # Layout principal
│   └── page.tsx      # Página de inicio
├── components/       # Componentes reutilizables
├── lib/             # Utilidades y configuraciones
├── stores/          # Estados globales (Zustand)
└── types/           # Definiciones de tipos TypeScript
```

## 🔧 Configuración

### Variables de Entorno
Crear `.env.local` con:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
```

### Integraciones
- **Supabase**: Base de datos y autenticación
- **Zoho CRM**: Sincronización de datos de clientes
- **Zoho Desk**: Sistema de tickets
- **Gmail**: Envío de notificaciones

## 🎨 UI/UX

- **Design System**: Componentes reutilizables con Tailwind
- **Tipografía**: Geist Font Family
- **Tema**: Soporte para modo claro/oscuro
- **Responsive**: Mobile-first design

## 📦 Deploy

### Staging (develop branch)
```bash
# Automático con push a develop
git push origin develop
```

### Producción (main branch)
```bash
# Automático con merge a main
# Requiere Pull Request aprobado
```

## 🔗 Enlaces Útiles

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Monorepo Root](../../README.md)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
