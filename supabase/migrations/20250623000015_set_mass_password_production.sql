-- Migración para establecer contraseña masiva: Coacharte2025
-- Para todos los colaboradores activos en staging y producción
-- Fecha: 2025-06-23

-- Actualizar todos los colaboradores activos con la nueva contraseña
UPDATE collaborators 
SET 
    intranet_password = '$2a$12$i8QBCy43DE3S8k2xxJ1bVOMKZ1dqs.cThiQMkH.KP/OiTNgteZaYi',  -- Hash de 'Coacharte2025'
    custom_password_set = true,
    updated_at = NOW()
WHERE status = 'Active' 
AND locked = false;

-- Limpiar registros de tracking para forzar nueva configuración si es necesario
-- UPDATE user_login_tracking 
-- SET first_login_completed = false, password_change_required = false
-- WHERE collaborator_id IN (
--     SELECT id FROM collaborators WHERE status = 'Active' AND locked = false
-- );
