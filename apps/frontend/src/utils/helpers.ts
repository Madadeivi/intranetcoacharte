export const generateInitials = (email: string): string => {
  const names = email.split('@')[0].split('.');
  const initials = names.map(name => name.charAt(0).toUpperCase()).join('');
  return initials;
};

export const formatJoinDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};