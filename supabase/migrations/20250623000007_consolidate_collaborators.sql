-- Migración de consolidación: Crear tabla collaborators definitiva
-- Fecha: 2025-06-23
-- Descripción: Tabla consolidada para colaboradores con todos los campos necesarios

-- Eliminar tabla existente si hay conflictos
DROP TABLE IF EXISTS public.collaborators CASCADE;

-- Crear tabla colaboradores con estructura final para CSV import
CREATE TABLE public.collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id VARCHAR(255) UNIQUE,
    status VARCHAR(100),
    internal_registry VARCHAR(100),
    owner_id VARCHAR(255),
    owner_name VARCHAR(255),
    email VARCHAR(255),
    created_time VARCHAR(100),
    modified_time VARCHAR(100),
    last_activity_time VARCHAR(100),
    currency VARCHAR(10),
    exchange_rate DECIMAL(10,6),
    tags TEXT,
    unsubscribed_mode VARCHAR(50),
    unsubscribed_time VARCHAR(100),
    full_name VARCHAR(255),
    title VARCHAR(255),
    curp VARCHAR(50),
    rfc VARCHAR(50),
    nss VARCHAR(50),
    bank VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(20),
    emergency_contact_secondary_phone VARCHAR(50),
    emergency_contact_primary_phone VARCHAR(50),
    comments TEXT,
    blood_type VARCHAR(10),
    emergency_contact_primary_name VARCHAR(255),
    emergency_contact_secondary_name VARCHAR(255),
    card_number VARCHAR(50),
    identifier_number VARCHAR(50),
    bank_card_number VARCHAR(50),
    clabe VARCHAR(50),
    allergies TEXT,
    emergency_contact_secondary_relationship VARCHAR(100),
    emergency_contact_primary_relationship VARCHAR(100),
    work_area VARCHAR(255),
    work_area_specify VARCHAR(255),
    mobile_phone VARCHAR(50),
    hire_date DATE,
    civil_status VARCHAR(50),
    personal_email VARCHAR(255),
    edenred_email VARCHAR(255),
    nationality VARCHAR(100),
    address TEXT,
    last_name VARCHAR(255),
    locked BOOLEAN DEFAULT FALSE,
    additional_comments TEXT,
    available_vacation_days INTEGER,
    taken_vacation_days INTEGER,
    available_vacation_days_alt INTEGER,
    clients VARCHAR(255),
    intranet_password VARCHAR(255),
    custom_password_set BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_collaborators_email ON public.collaborators(email);
CREATE INDEX idx_collaborators_record_id ON public.collaborators(record_id);
CREATE INDEX idx_collaborators_internal_registry ON public.collaborators(internal_registry);
CREATE INDEX idx_collaborators_full_name ON public.collaborators(full_name);
CREATE INDEX idx_collaborators_work_area ON public.collaborators(work_area);
CREATE INDEX idx_collaborators_status ON public.collaborators(status);

-- RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "collaborators_read_policy" ON public.collaborators
    FOR SELECT USING (true);

CREATE POLICY "collaborators_write_policy" ON public.collaborators
    FOR ALL USING (true);
