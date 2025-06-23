-- 🔐 HABILITAR TODOS LOS COLABORADORES PARA LOGIN
-- Este script configura la contraseña inicial para todos los colaboradores

-- 1. Generar hash para la contraseña inicial "Coacharte2025"
-- Usar este comando en PostgreSQL para generar el hash:
-- SELECT crypt('Coacharte2025', gen_salt('bf', 10));

-- 2. Actualizar todos los colaboradores con la contraseña inicial
UPDATE collaborators 
SET 
    intranet_password = '$2a$10$F/QXKDXHVrfyTIxkB.fbheHkjbErcYStMB71o5LUise32BnV7WK16', -- Hash de "Coacharte2025"
    custom_password_set = false, -- Marcar que necesitan cambiar contraseña
    status = 'Active',
    locked = false,
    updated_at = NOW()
WHERE 
    status != 'Inactive' 
    AND email IS NOT NULL 
    AND email != '';

-- 3. Verificar cuántos colaboradores se actualizaron
SELECT 
    COUNT(*) as total_habilitados,
    COUNT(CASE WHEN custom_password_set = false THEN 1 END) as necesitan_cambio_password
FROM collaborators 
WHERE 
    status = 'Active' 
    AND intranet_password IS NOT NULL;

-- 4. Mostrar algunos ejemplos de colaboradores habilitados
SELECT 
    id,
    email,
    full_name,
    work_area,
    title,
    custom_password_set,
    status,
    updated_at
FROM collaborators 
WHERE 
    status = 'Active' 
    AND intranet_password IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 5. Mostrar estadísticas por área de trabajo
SELECT 
    work_area,
    COUNT(*) as colaboradores_habilitados
FROM collaborators 
WHERE 
    status = 'Active' 
    AND intranet_password IS NOT NULL
GROUP BY work_area
ORDER BY colaboradores_habilitados DESC;
