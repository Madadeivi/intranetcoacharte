drop policy "Admin access only" on "public"."security_logs";
revoke delete on table "public"."security_logs" from "anon";
revoke insert on table "public"."security_logs" from "anon";
revoke references on table "public"."security_logs" from "anon";
revoke select on table "public"."security_logs" from "anon";
revoke trigger on table "public"."security_logs" from "anon";
revoke truncate on table "public"."security_logs" from "anon";
revoke update on table "public"."security_logs" from "anon";
revoke delete on table "public"."security_logs" from "authenticated";
revoke insert on table "public"."security_logs" from "authenticated";
revoke references on table "public"."security_logs" from "authenticated";
revoke select on table "public"."security_logs" from "authenticated";
revoke trigger on table "public"."security_logs" from "authenticated";
revoke truncate on table "public"."security_logs" from "authenticated";
revoke update on table "public"."security_logs" from "authenticated";
revoke delete on table "public"."security_logs" from "service_role";
revoke insert on table "public"."security_logs" from "service_role";
revoke references on table "public"."security_logs" from "service_role";
revoke select on table "public"."security_logs" from "service_role";
revoke trigger on table "public"."security_logs" from "service_role";
revoke truncate on table "public"."security_logs" from "service_role";
revoke update on table "public"."security_logs" from "service_role";
drop function if exists "public"."cleanup_old_security_logs"(days_to_keep integer);
alter table "public"."security_logs" drop constraint "security_logs_pkey";
drop index if exists "public"."idx_security_logs_created_at";
drop index if exists "public"."idx_security_logs_event_type";
drop index if exists "public"."idx_security_logs_ip_address";
drop index if exists "public"."idx_security_logs_user_email";
drop index if exists "public"."security_logs_pkey";
drop table "public"."security_logs";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.change_collaborator_password(user_email text, current_password text, new_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    collaborator_record RECORD;
    current_password_valid BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Buscar colaborador activo
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password IS NOT NULL
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado o inactivo',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña actual
    current_password_valid := verify_password_hybrid(current_password, collaborator_record.intranet_password);
    
    IF NOT current_password_valid THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña actual incorrecta',
            'error_code', 'INVALID_CURRENT_PASSWORD'
        );
    END IF;
    
    -- Actualizar con nueva contraseña (usando bcrypt)
    UPDATE public.collaborators 
    SET 
        intranet_password = hash_password_bcrypt(new_password),
        custom_password_set = true,
        updated_at = NOW()
    WHERE id = collaborator_record.id;
    
    -- Actualizar tracking si existe
    UPDATE public.user_login_tracking 
    SET 
        password_last_changed = NOW(),
        password_change_required = false,
        updated_at = NOW()
    WHERE collaborator_id = collaborator_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contraseña actualizada exitosamente'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'error_code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.change_collaborator_password_unlimited(user_email text, current_password text, new_password text, force_change boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    collaborator_record RECORD;
    password_valid BOOLEAN;
    new_hash TEXT;
    result JSON;
BEGIN
    -- Validar parámetros de entrada
    IF user_email IS NULL OR user_email = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Email es requerido',
            'error_code', 'MISSING_EMAIL'
        );
    END IF;

    IF current_password IS NULL OR current_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Contraseña actual es requerida',
            'error_code', 'MISSING_CURRENT_PASSWORD'
        );
    END IF;

    IF new_password IS NULL OR new_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Nueva contraseña es requerida',
            'error_code', 'MISSING_NEW_PASSWORD'
        );
    END IF;

    -- Validar longitud mínima de nueva contraseña
    IF LENGTH(new_password) < 8 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'La nueva contraseña debe tener al menos 8 caracteres',
            'error_code', 'PASSWORD_TOO_SHORT'
        );
    END IF;

    -- Buscar colaborador por email
    SELECT * INTO collaborator_record
    FROM collaborators
    WHERE email = LOWER(TRIM(user_email))
    AND status = 'Active'
    LIMIT 1;

    -- Verificar que el colaborador existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Colaborador no encontrado o inactivo',
            'error_code', 'COLLABORATOR_NOT_FOUND'
        );
    END IF;

    -- Verificar que el colaborador tiene una contraseña configurada
    IF collaborator_record.intranet_password IS NULL OR collaborator_record.intranet_password = '' THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'No hay contraseña configurada para este colaborador',
            'error_code', 'NO_PASSWORD_SET'
        );
    END IF;

    -- Validar contraseña actual solo si no es un cambio forzado
    IF NOT force_change THEN
        -- Verificar contraseña actual usando crypt
        SELECT crypt(current_password, collaborator_record.intranet_password) = collaborator_record.intranet_password
        INTO password_valid;

        IF NOT password_valid THEN
            RETURN json_build_object(
                'success', FALSE,
                'error', 'Contraseña actual incorrecta',
                'error_code', 'INVALID_CURRENT_PASSWORD'
            );
        END IF;
    END IF;

    -- Verificar que la nueva contraseña no sea igual a la actual
    SELECT crypt(new_password, collaborator_record.intranet_password) = collaborator_record.intranet_password
    INTO password_valid;

    IF password_valid THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'La nueva contraseña debe ser diferente a la actual',
            'error_code', 'SAME_PASSWORD'
        );
    END IF;

    -- Generar hash para nueva contraseña
    SELECT crypt(new_password, gen_salt('bf', 10)) INTO new_hash;

    -- Actualizar contraseña en la base de datos
    UPDATE collaborators
    SET 
        intranet_password = new_hash,
        custom_password_set = TRUE,
        password_changed_at = NOW(),
        updated_at = NOW()
    WHERE email = LOWER(TRIM(user_email))
    AND status = 'Active';

    -- Verificar que la actualización fue exitosa
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Error actualizando la contraseña',
            'error_code', 'UPDATE_FAILED'
        );
    END IF;

    -- Retornar éxito
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Contraseña actualizada exitosamente',
        'password_changed', TRUE,
        'custom_password_set', TRUE,
        'timestamp', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Error interno del servidor',
            'error_code', 'INTERNAL_ERROR',
            'details', SQLERRM
        );
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_login_statistics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    migration_stats JSON;
BEGIN
    -- Obtener estadísticas de migración
    SELECT get_password_migration_stats() INTO migration_stats;
    
    SELECT json_build_object(
        'total_collaborators', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE email IS NOT NULL AND email != '' AND status != 'Inactive'
        ),
        'enabled_for_login', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL AND locked = FALSE
        ),
        'pending_password_change', (
            SELECT COUNT(*) FROM public.user_login_tracking 
            WHERE password_change_required = TRUE
        ),
        'completed_first_login', (
            SELECT COUNT(*) FROM public.user_login_tracking 
            WHERE first_login_completed = TRUE
        ),
        'using_default_password', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE custom_password_set = FALSE AND intranet_password IS NOT NULL
        ),
        'password_migration', migration_stats
    ) INTO result;
    
    RETURN result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_password_migration_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL
        ),
        'bcrypt_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND is_bcrypt_hash(intranet_password)
        ),
        'sha256_passwords', (
            SELECT COUNT(*) FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND NOT is_bcrypt_hash(intranet_password)
        ),
        'migration_needed', (
            SELECT COUNT(*) > 0 FROM public.collaborators 
            WHERE intranet_password IS NOT NULL 
            AND NOT is_bcrypt_hash(intranet_password)
        )
    ) INTO result;
    
    RETURN result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.hash_password_bcrypt(plain_password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 12));
END;
$function$;
CREATE OR REPLACE FUNCTION public.is_bcrypt_hash(password_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN password_hash ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$';
END;
$function$;
CREATE OR REPLACE FUNCTION public.migrate_all_passwords_to_bcrypt()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    migrated_count INTEGER := 0;
    total_count INTEGER := 0;
    collaborator_record RECORD;
BEGIN
    -- Solo para usuarios administrativos - verificar permisos si es necesario
    
    -- Contar total de contraseñas que necesitan migración
    SELECT COUNT(*) INTO total_count
    FROM public.collaborators 
    WHERE intranet_password IS NOT NULL 
    AND NOT (intranet_password ~ '^\$2[abxy]\$[0-9]{2}\$.*');
    
    -- Migrar contraseñas que no sean bcrypt
    -- NOTA: Esto requiere conocer las contraseñas originales o usar un proceso especial
    -- Por seguridad, esta función requiere activación manual
    
    RETURN json_build_object(
        'success', true,
        'message', 'Función de migración preparada',
        'passwords_requiring_migration', total_count,
        'note', 'Las contraseñas se migrarán automáticamente en el próximo login de cada usuario'
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.reset_collaborator_password(user_email text, new_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    collaborator_record RECORD;
    result JSON;
BEGIN
    -- Buscar colaborador activo
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado o inactivo',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Actualizar con nueva contraseña (usando bcrypt)
    UPDATE public.collaborators 
    SET 
        intranet_password = hash_password_bcrypt(new_password),
        custom_password_set = true,
        updated_at = NOW()
    WHERE id = collaborator_record.id;
    
    -- Actualizar tracking si existe
    UPDATE public.user_login_tracking 
    SET 
        password_change_required = false,
        failed_attempts = 0
    WHERE collaborator_id = collaborator_record.id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contraseña actualizada exitosamente'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'error_code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_login_tracking_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.validate_collaborator_login(user_email text, plain_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    collaborator_record RECORD;
    tracking_record RECORD;
    password_valid BOOLEAN := FALSE;
    needs_migration BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Buscar colaborador activo con contraseña configurada
    SELECT * INTO collaborator_record
    FROM public.collaborators 
    WHERE email = user_email 
    AND intranet_password IS NOT NULL
    AND status = 'Active'
    AND locked = FALSE;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado',
            'error_code', 'USER_NOT_FOUND'
        );
    END IF;
    
    -- Verificar contraseña usando sistema híbrido
    password_valid := verify_password_hybrid(plain_password, collaborator_record.intranet_password);
    
    -- Verificar si necesita migración a bcrypt (si no empieza con $2)
    needs_migration := NOT (collaborator_record.intranet_password ~ '^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$');
    
    IF NOT password_valid THEN
        -- Crear o actualizar tracking de intentos fallidos
        INSERT INTO public.user_login_tracking (collaborator_id, failed_attempts, last_login_attempt)
        VALUES (collaborator_record.id, 1, NOW())
        ON CONFLICT (collaborator_id) 
        DO UPDATE SET 
            failed_attempts = user_login_tracking.failed_attempts + 1,
            last_login_attempt = NOW();
        
        RETURN json_build_object(
            'success', false,
            'error', 'Contraseña incorrecta',
            'error_code', 'INVALID_PASSWORD'
        );
    END IF;
    
    -- Si login exitoso y necesita migración, actualizar a bcrypt
    IF needs_migration THEN
        UPDATE public.collaborators 
        SET 
            intranet_password = hash_password_bcrypt(plain_password),
            updated_at = NOW()
        WHERE id = collaborator_record.id;
    END IF;
    
    -- Obtener o crear información de tracking
    SELECT * INTO tracking_record
    FROM public.user_login_tracking 
    WHERE collaborator_id = collaborator_record.id;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_login_tracking (
            collaborator_id, 
            password_change_required, 
            first_login_completed,
            last_login_attempt,
            failed_attempts
        ) VALUES (
            collaborator_record.id, 
            false, 
            true,
            NOW(),
            0
        ) RETURNING * INTO tracking_record;
    ELSE
        -- Actualizar tracking de login exitoso
        UPDATE public.user_login_tracking 
        SET 
            last_login_attempt = NOW(),
            failed_attempts = 0,
            first_login_completed = true
        WHERE collaborator_id = collaborator_record.id
        RETURNING * INTO tracking_record;
    END IF;
    
    -- Actualizar last_login_at en la tabla de colaboradores
    UPDATE public.collaborators 
    SET last_login_at = NOW()
    WHERE id = collaborator_record.id;
    
    -- Preparar respuesta con información completa
    result := json_build_object(
        'success', true,
        'user', json_build_object(
            'id', collaborator_record.id,
            'email', collaborator_record.email,
            'name', COALESCE(collaborator_record.full_name, collaborator_record.first_name || ' ' || collaborator_record.last_name),
            'role', 'employee',
            'department', collaborator_record.work_area
        ),
        'password_change_required', COALESCE(tracking_record.password_change_required, false),
        'first_login', NOT COALESCE(tracking_record.first_login_completed, true),
        'using_default_password', NOT COALESCE(collaborator_record.custom_password_set, true),
        'password_migrated', needs_migration
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- En caso de error, devolver mensaje genérico por seguridad
    RETURN json_build_object(
        'success', false,
        'error', 'Error interno del servidor',
        'error_code', 'INTERNAL_ERROR',
        'details', SQLERRM
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.verify_password_hybrid(plain_password text, stored_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Si el hash almacenado es bcrypt (empieza con $2a$, $2b$, etc.)
    IF stored_password ~ '^\$2[abxy]\$[0-9]{2}\$.*' THEN
        RETURN verify_password_bcrypt(plain_password, stored_password);
    ELSE
        -- Asumir que es SHA-256 con sal (formato legacy)
        RETURN stored_password = encode(digest(plain_password || 'coacharte_salt', 'sha256'), 'hex');
    END IF;
END;
$function$;
