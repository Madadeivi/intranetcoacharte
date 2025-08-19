-- Tabla para almacenar metadatos de documentos del perfil sincronizados desde Zoho CRM
CREATE TABLE IF NOT EXISTS profile_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relación con el perfil
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Información del documento desde Zoho CRM
    zoho_attachment_id text NOT NULL, -- ID del attachment en Zoho CRM
    zoho_record_id text NOT NULL,     -- ID del record padre en Zoho CRM
    
    -- Metadatos del archivo
    file_name text NOT NULL,
    file_size bigint,
    file_type text, -- MIME type o extensión
    
    -- Información adicional
    description text,
    category text,    -- Tipo de documento (CV, Contrato, Certificación, etc.)
    tags text[],      -- Tags para categorización
    
    -- URLs y acceso
    download_url text,     -- URL firmada temporal (se regenera)
    preview_url text,      -- URL de preview si está disponible
    
    -- Fechas de control
    uploaded_at timestamptz,          -- Fecha de subida original en Zoho
    last_synced_at timestamptz DEFAULT now(), -- Última sincronización
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Metadatos de sincronización
    sync_status text DEFAULT 'synced', -- synced, error, pending
    sync_error text,                    -- Mensaje de error si hay problemas
    
    -- Índices únicos
    UNIQUE(zoho_attachment_id, zoho_record_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_profile_documents_profile_id ON profile_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_documents_zoho_record_id ON profile_documents(zoho_record_id);
CREATE INDEX IF NOT EXISTS idx_profile_documents_category ON profile_documents(category);
CREATE INDEX IF NOT EXISTS idx_profile_documents_sync_status ON profile_documents(sync_status);
CREATE INDEX IF NOT EXISTS idx_profile_documents_last_synced ON profile_documents(last_synced_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_profile_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profile_documents_updated_at ON profile_documents;
CREATE TRIGGER update_profile_documents_updated_at
    BEFORE UPDATE ON profile_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_documents_updated_at();

-- Política de seguridad RLS (Row Level Security)
ALTER TABLE profile_documents ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propios documentos
CREATE POLICY "Users can view own profile documents" ON profile_documents
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM profiles WHERE id = auth.uid()
        )
    );

-- Solo admins pueden insertar/actualizar documentos (sincronización)
CREATE POLICY "Admins can manage profile documents" ON profile_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE profile_documents IS 'Metadatos de documentos del expediente digital sincronizados desde Zoho CRM';
COMMENT ON COLUMN profile_documents.zoho_attachment_id IS 'ID único del attachment en Zoho CRM';
COMMENT ON COLUMN profile_documents.zoho_record_id IS 'ID del record padre (colaborador) en Zoho CRM';
COMMENT ON COLUMN profile_documents.download_url IS 'URL firmada temporal para descarga, se regenera periódicamente';
COMMENT ON COLUMN profile_documents.sync_status IS 'Estado de sincronización: synced, error, pending';
