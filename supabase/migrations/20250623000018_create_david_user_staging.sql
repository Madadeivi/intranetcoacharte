-- Migración para crear usuario David en staging
-- Fecha: 2025-06-23
-- Descripción: Insertar usuario David Dorantes con contraseña Coacharte2025

-- Eliminar usuario existente si existe
DELETE FROM public.collaborators WHERE email = 'david.dorantes@coacharte.mx';

-- Insertar el usuario David Dorantes en staging
INSERT INTO public.collaborators (
    id,
    email,
    full_name,
    work_area,
    title,
    status,
    locked,
    intranet_password,
    custom_password_set,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'david.dorantes@coacharte.mx',
    'David Dorantes',
    'Dirección',
    'Director',
    'Active',
    false,
    '$2a$12$i8QBCy43DE3S8k2xxJ1bVOMKZ1dqs.cThiQMkH.KP/OiTNgteZaYi', -- Hash de 'Coacharte2025'
    true,
    NOW(),
    NOW()
);
