-- Migración inicial: Crear tablas para la Intranet Coacharte
-- Fecha: 2025-06-23
-- Descripción: Esquema básico para almacenar datos de colaboradores, equipos, tickets y notificaciones

-- Tabla base de colaboradores (será expandida en migraciones posteriores)
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de equipos de cómputo (cache de módulo custom Zoho)
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zoho_id VARCHAR(255) UNIQUE NOT NULL, -- ID del equipo en Zoho
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    equipment_type VARCHAR(100) NOT NULL, -- laptop, desktop, monitor, etc.
    brand VARCHAR(100),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    asset_tag VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, maintenance, retired
    purchase_date DATE,
    warranty_expiry DATE,
    specifications JSONB, -- Almacenar specs técnicas en JSON
    notes TEXT,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de tickets (cache de Zoho Desk)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zoho_ticket_id VARCHAR(255) UNIQUE NOT NULL, -- ID del ticket en Zoho Desk
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL, -- open, in_progress, resolved, closed
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
    category VARCHAR(100), -- technical, payroll, general, other
    created_by_email VARCHAR(255),
    assigned_to VARCHAR(255),
    created_date TIMESTAMPTZ NOT NULL,
    modified_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    resolution TEXT,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de notificaciones enviadas (auditoría de emails)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) DEFAULT 'intranet@coacharte.mx',
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    notification_type VARCHAR(100), -- ticket_update, welcome, reminder, etc.
    status VARCHAR(50) DEFAULT 'sent', -- sent, failed, pending
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de usuarios de la intranet (gestión de sesiones)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    zoho_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}', -- Preferencias del usuario en JSON
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_collaborators_email ON public.collaborators(email);
CREATE INDEX IF NOT EXISTS idx_collaborators_full_name ON public.collaborators(full_name);

-- Triggers para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collaborators_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentar las tablas
COMMENT ON TABLE public.collaborators IS 'Tabla base de colaboradores (será expandida en migraciones posteriores)';
