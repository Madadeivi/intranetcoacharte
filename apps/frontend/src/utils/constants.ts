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
      date: "5 Jun 2025",
      summary: "La cultura organizacional en Coacharte la hacemos todos y todas."
    },
    {
      id: 2,
      title: "Ajuste Salarial",
      detail: 'En reconocimiento a su compromiso y esfuerzo, les informamos que, **a partir de la segunda quincena del mes de MAYO 2025**, se realizará un ajuste salarial del **3.5%** derivado de la inflación correspondiente al año **2024** y al incremento recibido por nuestros clientes en el mismo mes.\n\nEste ajuste aplicará a todos los colaboradores que se han mantenido activos en nuestra nómina desde el **2024**.',
      imageUrl: "/assets/banner_ajuste.png",
      date: "10 Jun 2025",
      summary: "Ajuste salarial derivado de la inflación 2024."
    },
    {
      id: 3,
      title: "Bono 2024",
      detail: 'A partir de junio de 2025, todos los colaboradores **evaluados durante el período 2024** que hayan obtenido una calificación satisfactoria, según las insignias establecidas, recibirán el depósito por concepto de BONO correspondiente al ejercicio fiscal 2024.',
      imageUrl: "/assets/banner_bono.png",
      date: "30 Jun 2025",
      summary: "Bono 2024 derivado de los resultados de la evaluación."
    },
    {
      id: 4,
      title: "Día del Padre",
      detail: 'Hoy celebramos a los papás que forman parte de nuestra organización.\nA ustedes, que equilibran reuniones, proyectos y responsabilidades con su papel más importante: ser guías, protectores y ejemplo de dedicación para sus familias.\n\n**¡Feliz Día del Padre!** De todos los que hacemos Coacharte.',
      imageUrl: "/assets/banner_padre.png",
      date: "3 Jun 2025",
      summary: "Féliz día a los papás Coacharteanos!!!."
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