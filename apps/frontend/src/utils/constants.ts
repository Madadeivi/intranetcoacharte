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
      detail: '**Nuestro propósito organizacional** es "Transformar cualquier reto en logro"\n**Nuestros valores** son los barandales que guían nuestras acciones y tienen un significado muy preciso:\n**PERSONAS:** lo más importante son las relaciones sanas con nuestros colegas y clientes.\n**INSPIRAMOS CONFIANZA:** actuando con honestidad, comunicándonos asertivamente y cumpliendo los acuerdos establecidos.\n**VOCACIÓN DE SERVICIO:** disponibilidad para escuchar, leer, atender y proponer siempre desde la empatía.\n\n**Los comportamientos** son las acciones precisas que están asociadas a cada valor para asegurar que tod@s los coachartean@s contribuyamos al logro de los objetivos organizacionales en cada momento clave.',
      imageUrl: "/assets/banner_modelo.png",
      date: "5 Jul 2025",
      summary: "La cultura organizacional en Coacharte la hacemos todos y todas."
    },
    {
      id: 2,
      title: "Nuestro lema",
      detail: 'Inspirados en transformar cualquier reto en logro, construimos nuestra Cultura Integral a partir de valores que son la brújula de nuestras decisiones y el motor de nuestras acciones. Reconocemos que las personas y las relaciones sanas son el eje central de nuestro trabajo, que la confianza se inspira con honestidad, comunicación clara y cumplimiento de acuerdos, y que la verdadera vocación de servicio se demuestra al escuchar, atender y proponer con empatía. Así, cada comportamiento se convierte en una acción concreta que nos acerca a nuestros objetivos. ',
      imageUrl: "/assets/lema.png",
      date: "01 Sep 2025",
      summary: "Nuestro lema."
    },
    {
      id: 3,
      title: "Nuestras oficinas",
      detail: 'Con presencia en España, Houston y Ciudad de México, nuestros puntos estratégicos nos permiten conectar realidades diversas y ampliar nuestro impacto. En cada lugar, nuestros valores y comportamientos reflejan la misma esencia: transformar cada reto en logro y convertir cada desafío en una oportunidad de crecimiento.',
      imageUrl: "/assets/oficinas.png",
      date: "01 Sep 2025",
      summary: "Oficinas Coacharte."
    },
    {
      id: 4,
      title: "Tabla de vacaciones",
      detail: 'Las vacaciones inician con 15 días desde el primer año y aumentan según la antigüedad. Deben programarse con anticipación, no son acumulables ni pagadas y requieren aprobación del jefe inmediato, para despúes hacerlas llegar al área de Talento y Transformación.',
      imageUrl: "/assets/tabla_vacaciones.png",
      date: "01 Sep 2025",
      summary: "Tabla de vacaciones colaboradores Coacharte."
    },
    {
      id: 5,
      title: "Dias no laborables",
      detail: 'Los días de asueto en la empresa corresponden a las fechas oficiales establecidas por la ley Federal del Trabajo y a aquellos que la organización determine de manera interna. Durante estos días no se labora y se busca promover el equilibrio entre la vida personal y profesional, fomentando el descanso y la convivencia.',
      imageUrl: "/assets/dias_no_laborables.png",
      date: "01 Sep 2025",
      summary: "Tabla de vacaciones colaboradores Coacharte."
    },
  ];

/**
 * Constantes de la aplicación
 */

// Tarjetas deshabilitadas por defecto
export const DISABLED_CARDS: string[] = [
  'Procesos y Documentación', 
  'Calendario y Eventos'
]; 

// Eventos del calendario
export const CURRENT_YEAR = new Date().getFullYear();

interface CalendarEvent {
  date: Date;
  title: string;
  description?: string;
  time?: string;
  image?: string;
  category?: string;
  urgent?: boolean;
  featured?: boolean;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
    { 
      date: new Date(2025, 10, 14),
      title: 'Pago de Nómina', 
      description: 'Depósito de nómina quincenal para todos los empleados',
      time: '12:00 PM',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop&crop=center&auto=format&q=80',
      category: 'Talento y Transformación'
    },
    { 
      date: new Date(2025, 10, 28),
      title: 'Pago de Nómina', 
      description: 'Depósito de nómina quincenal para todos los empleados',
      time: '12:00 PM',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop&crop=center&auto=format&q=80',
      category: 'Talento y Transformación'
    },
  ];

// Configuración del carrusel
export const CAROUSEL_SCROLL_OFFSET = 300;
export const CARD_CAROUSEL_SCROLL_OFFSET = 320;

// URLs externas
export const NOMINA_BASE_URL = 'https://nomina.coacharte.mx';

export const navItems = [
    { label: 'Inicio', href: '/home' },
    { label: 'Mi Cuenta', href: '/profile' },
    { label: 'Talento y Transformación', href: '/recursos-humanos' },
    { label: 'Procesos', href: '#' },
  ];