import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { profileService, ProfileData } from '@/services/profileService';

export interface EnrichedUser {
  email: string;
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department?: string;
  position?: string;
  title?: string;
  internal_registry?: string;
}

export function useEnrichedUser() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const profileResult = await profileService.getProfile();

        if (profileResult.success && profileResult.data?.profile) {
          setProfile(profileResult.data.profile);
          setError(null);
        } else {
          setProfile(null);
          setError(profileResult.message || 'No se pudo cargar el perfil del usuario');
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
        setProfile(null);
        setError('No se pudo cargar el perfil del usuario');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const enrichedUser = useMemo<EnrichedUser | null>(() => {
    if (!user) return null;

    const firstName = profile?.full_name?.trim() || user.firstName || user.name || '';
    const lastName = profile?.last_name?.trim() || user.lastName || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.name;

    return {
      email: user.email,
      id: user.id,
      firstName,
      lastName,
      displayName,
      department: profile?.assigned_client || profile?.department_id || user.department,
      position: profile?.title || user.role,
      title: profile?.title || user.role,
      internal_registry: profile?.internal_registry,
    };
  }, [user, profile]);

  return { 
    enrichedUser, 
    isLoading, 
    error,
    profile 
  };
}

