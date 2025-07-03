export interface Notice {
    id: number;
    title: string;
    detail: string;
    imageUrl: string;
    date: string;
    summary: string;
  }
  
  export const notices: Notice[] = [
    {
      id: 1,
      title: "Modelo de Cultura Integral",
      detail: "Coacharte presenta su nuevo **Modelo de Cultura Integral** que fortalecerá nuestros valores organizacionales.\n\nEste modelo integra prácticas de bienestar, desarrollo profesional y compromiso social para crear un ambiente de trabajo más inclusivo y colaborativo.",
      imageUrl: "/assets/banner_modelo.png",
      date: "5 Jun 2025",
      summary: "Conoce nuestro nuevo modelo organizacional."
    },
    {
      id: 2,
      title: "Ajuste Salarial 2024",
      detail: "Se ha implementado el **ajuste salarial anual correspondiente al 2024**.\n\nEl incremento se verá reflejado en la nómina de este mes. Consulta tu nuevo salario en el portal de recursos humanos.",
      imageUrl: "/assets/banner_ajuste.png",
      date: "10 Jun 2025",
      summary: "Revisa tu nuevo salario actualizado."
    },
    {
      id: 3,
      title: "Bono 2024",
      detail: "¡Excelentes noticias! Se ha aprobado el **bono de productividad 2024** para todos los colaboradores.\n\nEl bono se pagará junto con la nómina del próximo mes. ¡Gracias por su excelente desempeño durante este año!",
      imageUrl: "/assets/banner_bono.png",
      date: "8 Jun 2025",
      summary: "Recibe tu bono de productividad anual."
    },
    {
      id: 4,
      title: "Día del Padre",
      detail: "Este **15 de Junio** celebramos el Día del Padre en Coacharte.\n\n¡Todos los papás de nuestra empresa tendrán un día especial con actividades, sorpresas y un reconocimiento especial por ser padres ejemplares!",
      imageUrl: "/assets/banner_padre.png",
      date: "3 Jun 2025",
      summary: "Celebración especial para todos los papás."
    }
  ];

/**
 * Constantes de la aplicación
 */

// Tarjetas deshabilitadas por defecto
export const DISABLED_CARDS: string[] = [
  'Recursos Humanos', 
  'Procesos y Documentación', 
  'Soporte y Comunicación', 
  'Calendario y Eventos', 
  'Conoce Coacharte'
]; 

// Eventos del calendario
export const CURRENT_YEAR = new Date().getFullYear();
export const CALENDAR_EVENTS: { date: Date; title: string }[] = [
    { date: new Date(2025, 5, 2), title: 'Lanzamiento Intranet' }, // Meses son 0-indexados, Junio es 5
    { date: new Date(2025, 5, 13), title: 'Pago de Nómina' },
    { date: new Date(2025, 5, 15), title: 'Día del Padre' },
    { date: new Date(2025, 5, 30), title: 'Pago de Nómina' },
    { date: new Date(2025, 6, 1), title: 'Evento de Integración' }, // Julio es 6
  ];

// Configuración del carrusel
export const CAROUSEL_SCROLL_OFFSET = 300;
export const CARD_CAROUSEL_SCROLL_OFFSET = 320;

// URLs externas
export const NOMINA_BASE_URL = 'https://nomina.coacharte.mx/user.php';

export const navItems = [
    { label: 'Inicio', href: '/home' },
    { label: 'Mi Cuenta', href: '/profile' },
    { label: 'Recursos Humanos', href: '#' },
    { label: 'Procesos', href: '#' },
  ];