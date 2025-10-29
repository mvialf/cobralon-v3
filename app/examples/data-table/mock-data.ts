/**
 * MOCK DATA para DataTable Examples
 *
 * Este archivo contiene datos de ejemplo realistas para demostrar
 * todas las capacidades del DataTable component.
 *
 * Incluye edge cases:
 * - Proyectos pagados 100% (balance = 0)
 * - Proyectos sin pagos (percentPaid = 0)
 * - Nombres largos (testear truncate)
 * - Valores null (projectName)
 * - Fechas antiguas y recientes
 * - Diferentes estados y prioridades
 */

export type MockProject = {
  id: string
  projectNumber: string
  projectName: string | null
  customerName: string
  customerPhone: string
  status: 'En Proceso' | 'Completado' | 'Pendiente' | 'Cancelado' | 'En Revisión'
  priority: 'high' | 'medium' | 'low'
  total: number
  totalPaid: number
  percentPaid: number
  balance: number
  date: Date
  assignedTo: string
  tags: string[]
}

export const MOCK_STATUSES = [
  { id: 'en-proceso', label: 'En Proceso', value: 'En Proceso' },
  { id: 'completado', label: 'Completado', value: 'Completado' },
  { id: 'pendiente', label: 'Pendiente', value: 'Pendiente' },
  { id: 'cancelado', label: 'Cancelado', value: 'Cancelado' },
  { id: 'en-revision', label: 'En Revisión', value: 'En Revisión' },
]

export const MOCK_PRIORITIES = [
  { id: 'high', label: 'Alta', value: 'high' },
  { id: 'medium', label: 'Media', value: 'medium' },
  { id: 'low', label: 'Baja', value: 'low' },
]

export const mockTableData: MockProject[] = [
  // EDGE CASE: Proyecto completado 100% pagado
  {
    id: '1',
    projectNumber: 'P 0001-2025',
    projectName: 'Remodelación Cocina',
    customerName: 'Juan Pérez',
    customerPhone: '+56912345678',
    status: 'Completado',
    priority: 'high',
    total: 2500000,
    totalPaid: 2500000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2025-01-05'),
    assignedTo: 'María López',
    tags: ['Cliente VIP', 'Urgente'],
  },

  // EDGE CASE: Proyecto sin pagos
  {
    id: '2',
    projectNumber: 'P 0002-2025',
    projectName: null, // Edge case: sin nombre
    customerName: 'Ana Gómez',
    customerPhone: '+56923456789',
    status: 'Pendiente',
    priority: 'medium',
    total: 1800000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 1800000,
    date: new Date('2025-01-10'),
    assignedTo: 'Carlos Ruiz',
    tags: [],
  },

  // EDGE CASE: Nombre muy largo
  {
    id: '3',
    projectNumber: 'P 0003-2025',
    projectName:
      'Instalación Completa de Ventanas Termopanel con Doble Vidrio Hermético y Marcos de Aluminio',
    customerName: 'Pedro González de la Torre y Martínez',
    customerPhone: '+56934567890',
    status: 'En Proceso',
    priority: 'high',
    total: 5200000,
    totalPaid: 2600000,
    percentPaid: 50,
    balance: 2600000,
    date: new Date('2024-12-15'),
    assignedTo: 'María López',
    tags: ['Grande', 'Cliente VIP'],
  },

  // Caso normal 1
  {
    id: '4',
    projectNumber: 'P 0004-2025',
    projectName: 'Ventanas Dormitorios',
    customerName: 'Laura Martínez',
    customerPhone: '+56945678901',
    status: 'En Proceso',
    priority: 'medium',
    total: 3100000,
    totalPaid: 1550000,
    percentPaid: 50,
    balance: 1550000,
    date: new Date('2025-01-12'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Residencial'],
  },

  // Proyecto cancelado
  {
    id: '5',
    projectNumber: 'P 0005-2025',
    projectName: 'Cerramiento Terraza',
    customerName: 'Roberto Silva',
    customerPhone: '+56956789012',
    status: 'Cancelado',
    priority: 'low',
    total: 1200000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 1200000,
    date: new Date('2024-11-20'),
    assignedTo: 'Ana Torres',
    tags: ['Cancelado por cliente'],
  },

  // Proyecto en revisión
  {
    id: '6',
    projectNumber: 'P 0006-2025',
    projectName: 'Puertas Principales',
    customerName: 'Carmen Díaz',
    customerPhone: '+56967890123',
    status: 'En Revisión',
    priority: 'high',
    total: 2800000,
    totalPaid: 1400000,
    percentPaid: 50,
    balance: 1400000,
    date: new Date('2025-01-08'),
    assignedTo: 'María López',
    tags: ['Urgente', 'Requiere aprobación'],
  },

  // Proyecto casi pagado
  {
    id: '7',
    projectNumber: 'P 0007-2025',
    projectName: 'Ventanas Baños',
    customerName: 'Diego Morales',
    customerPhone: '+56978901234',
    status: 'En Proceso',
    priority: 'medium',
    total: 1500000,
    totalPaid: 1485000,
    percentPaid: 99,
    balance: 15000,
    date: new Date('2025-01-03'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Por finalizar'],
  },

  // Proyecto recién iniciado
  {
    id: '8',
    projectNumber: 'P 0008-2025',
    projectName: 'Cerramiento Balcón',
    customerName: 'Patricia Rojas',
    customerPhone: '+56989012345',
    status: 'En Proceso',
    priority: 'low',
    total: 2200000,
    totalPaid: 440000,
    percentPaid: 20,
    balance: 1760000,
    date: new Date('2025-01-15'),
    assignedTo: 'Ana Torres',
    tags: ['Nuevo'],
  },

  // Proyecto mediano avance
  {
    id: '9',
    projectNumber: 'P 0009-2025',
    projectName: 'Ventanas Living',
    customerName: 'Fernanda Castro',
    customerPhone: '+56990123456',
    status: 'En Proceso',
    priority: 'medium',
    total: 3500000,
    totalPaid: 2450000,
    percentPaid: 70,
    balance: 1050000,
    date: new Date('2024-12-28'),
    assignedTo: 'María López',
    tags: ['Residencial', 'Avanzado'],
  },

  // Proyecto grande
  {
    id: '10',
    projectNumber: 'P 0010-2025',
    projectName: 'Edificio Completo',
    customerName: 'Inversiones Los Andes SpA',
    customerPhone: '+56901234567',
    status: 'En Proceso',
    priority: 'high',
    total: 15000000,
    totalPaid: 4500000,
    percentPaid: 30,
    balance: 10500000,
    date: new Date('2024-11-01'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Comercial', 'Grande', 'Cliente VIP'],
  },

  // Más proyectos para completar la tabla...
  {
    id: '11',
    projectNumber: 'P 0011-2025',
    projectName: 'Mampara Baño',
    customerName: 'Luis Herrera',
    customerPhone: '+56912345679',
    status: 'Completado',
    priority: 'low',
    total: 850000,
    totalPaid: 850000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-12-10'),
    assignedTo: 'Ana Torres',
    tags: ['Pequeño'],
  },

  {
    id: '12',
    projectNumber: 'P 0012-2025',
    projectName: 'Ventanas Oficina',
    customerName: 'Mónica Vargas',
    customerPhone: '+56923456780',
    status: 'En Proceso',
    priority: 'medium',
    total: 2900000,
    totalPaid: 1450000,
    percentPaid: 50,
    balance: 1450000,
    date: new Date('2025-01-06'),
    assignedTo: 'María López',
    tags: ['Comercial'],
  },

  {
    id: '13',
    projectNumber: 'P 0013-2025',
    projectName: 'Puertas Garaje',
    customerName: 'Raúl Soto',
    customerPhone: '+56934567891',
    status: 'Pendiente',
    priority: 'low',
    total: 1100000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 1100000,
    date: new Date('2025-01-14'),
    assignedTo: 'Carlos Ruiz',
    tags: [],
  },

  {
    id: '14',
    projectNumber: 'P 0014-2025',
    projectName: 'Ventanas Comedor',
    customerName: 'Valeria Núñez',
    customerPhone: '+56945678902',
    status: 'En Revisión',
    priority: 'medium',
    total: 1950000,
    totalPaid: 975000,
    percentPaid: 50,
    balance: 975000,
    date: new Date('2025-01-04'),
    assignedTo: 'Ana Torres',
    tags: ['Requiere medición'],
  },

  {
    id: '15',
    projectNumber: 'P 0015-2025',
    projectName: null,
    customerName: 'Sebastián Flores',
    customerPhone: '+56956789013',
    status: 'Completado',
    priority: 'high',
    total: 3200000,
    totalPaid: 3200000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-12-05'),
    assignedTo: 'María López',
    tags: ['Urgente', 'Cliente VIP'],
  },

  {
    id: '16',
    projectNumber: 'P 0016-2025',
    projectName: 'Cerramiento Patio',
    customerName: 'Gabriela Mendoza',
    customerPhone: '+56967890124',
    status: 'En Proceso',
    priority: 'low',
    total: 2400000,
    totalPaid: 800000,
    percentPaid: 33,
    balance: 1600000,
    date: new Date('2025-01-09'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Residencial'],
  },

  {
    id: '17',
    projectNumber: 'P 0017-2025',
    projectName: 'Ventanas Escalera',
    customerName: 'Andrés Bravo',
    customerPhone: '+56978901235',
    status: 'En Proceso',
    priority: 'medium',
    total: 1750000,
    totalPaid: 1225000,
    percentPaid: 70,
    balance: 525000,
    date: new Date('2024-12-20'),
    assignedTo: 'Ana Torres',
    tags: ['Avanzado'],
  },

  {
    id: '18',
    projectNumber: 'P 0018-2025',
    projectName: 'Puertas Interiores',
    customerName: 'Natalia Pinto',
    customerPhone: '+56989012346',
    status: 'Cancelado',
    priority: 'low',
    total: 980000,
    totalPaid: 196000,
    percentPaid: 20,
    balance: 784000,
    date: new Date('2024-11-15'),
    assignedTo: 'María López',
    tags: ['Cancelado'],
  },

  {
    id: '19',
    projectNumber: 'P 0019-2025',
    projectName: 'Ventanas Segundo Piso',
    customerName: 'Rodrigo Vega',
    customerPhone: '+56990123457',
    status: 'En Proceso',
    priority: 'high',
    total: 4100000,
    totalPaid: 2050000,
    percentPaid: 50,
    balance: 2050000,
    date: new Date('2025-01-02'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Grande', 'Cliente VIP'],
  },

  {
    id: '20',
    projectNumber: 'P 0020-2025',
    projectName: 'Cerramiento Azotea',
    customerName: 'Daniela Campos',
    customerPhone: '+56901234568',
    status: 'Pendiente',
    priority: 'medium',
    total: 3300000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 3300000,
    date: new Date('2025-01-13'),
    assignedTo: 'Ana Torres',
    tags: [],
  },

  // Proyectos adicionales para demostrar paginación
  {
    id: '21',
    projectNumber: 'P 0021-2025',
    projectName: 'Ventanas Habitación Principal',
    customerName: 'Francisco Reyes',
    customerPhone: '+56912345680',
    status: 'En Proceso',
    priority: 'medium',
    total: 2100000,
    totalPaid: 1050000,
    percentPaid: 50,
    balance: 1050000,
    date: new Date('2025-01-07'),
    assignedTo: 'María López',
    tags: ['Residencial'],
  },

  {
    id: '22',
    projectNumber: 'P 0022-2025',
    projectName: 'Puertas Acceso Principal',
    customerName: 'Isabel Fuentes',
    customerPhone: '+56923456781',
    status: 'Completado',
    priority: 'high',
    total: 2750000,
    totalPaid: 2750000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-12-18'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Cliente VIP'],
  },

  {
    id: '23',
    projectNumber: 'P 0023-2025',
    projectName: 'Ventanas Sala Reuniones',
    customerName: 'Comercial Las Condes Ltda',
    customerPhone: '+56934567892',
    status: 'En Proceso',
    priority: 'high',
    total: 4500000,
    totalPaid: 1350000,
    percentPaid: 30,
    balance: 3150000,
    date: new Date('2024-12-22'),
    assignedTo: 'Ana Torres',
    tags: ['Comercial', 'Grande'],
  },

  {
    id: '24',
    projectNumber: 'P 0024-2025',
    projectName: null,
    customerName: 'Javier Muñoz',
    customerPhone: '+56945678903',
    status: 'En Revisión',
    priority: 'low',
    total: 1350000,
    totalPaid: 675000,
    percentPaid: 50,
    balance: 675000,
    date: new Date('2025-01-11'),
    assignedTo: 'María López',
    tags: [],
  },

  {
    id: '25',
    projectNumber: 'P 0025-2025',
    projectName: 'Cerramiento Quincho',
    customerName: 'Carolina Bustos',
    customerPhone: '+56956789014',
    status: 'En Proceso',
    priority: 'medium',
    total: 2850000,
    totalPaid: 1995000,
    percentPaid: 70,
    balance: 855000,
    date: new Date('2024-12-12'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Residencial', 'Avanzado'],
  },

  {
    id: '26',
    projectNumber: 'P 0026-2025',
    projectName: 'Ventanas Bodega',
    customerName: 'Marcelo Espinoza',
    customerPhone: '+56967890125',
    status: 'Pendiente',
    priority: 'low',
    total: 950000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 950000,
    date: new Date('2025-01-16'),
    assignedTo: 'Ana Torres',
    tags: [],
  },

  {
    id: '27',
    projectNumber: 'P 0027-2025',
    projectName: 'Puertas Edificio Corporativo',
    customerName: 'Inversiones San Isidro SA',
    customerPhone: '+56978901236',
    status: 'En Proceso',
    priority: 'high',
    total: 8500000,
    totalPaid: 2550000,
    percentPaid: 30,
    balance: 5950000,
    date: new Date('2024-11-25'),
    assignedTo: 'María López',
    tags: ['Comercial', 'Grande', 'Cliente VIP'],
  },

  {
    id: '28',
    projectNumber: 'P 0028-2025',
    projectName: 'Ventanas Biblioteca',
    customerName: 'Olivia Ramírez',
    customerPhone: '+56989012347',
    status: 'Completado',
    priority: 'medium',
    total: 1650000,
    totalPaid: 1650000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-12-08'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Residencial'],
  },

  {
    id: '29',
    projectNumber: 'P 0029-2025',
    projectName: 'Cerramiento Entrada',
    customerName: 'Tomás Gutiérrez',
    customerPhone: '+56990123458',
    status: 'En Proceso',
    priority: 'low',
    total: 1450000,
    totalPaid: 483000,
    percentPaid: 33,
    balance: 967000,
    date: new Date('2025-01-05'),
    assignedTo: 'Ana Torres',
    tags: [],
  },

  {
    id: '30',
    projectNumber: 'P 0030-2025',
    projectName: 'Ventanas Oficina Home Office',
    customerName: 'Sofía Contreras',
    customerPhone: '+56901234569',
    status: 'En Revisión',
    priority: 'medium',
    total: 1900000,
    totalPaid: 950000,
    percentPaid: 50,
    balance: 950000,
    date: new Date('2025-01-01'),
    assignedTo: 'María López',
    tags: ['Residencial', 'Requiere revisión técnica'],
  },

  // Últimos 10 para completar 40 registros
  {
    id: '31',
    projectNumber: 'P 0031-2024',
    projectName: 'Ventanas Departamento',
    customerName: 'Cristóbal Lagos',
    customerPhone: '+56912345681',
    status: 'Completado',
    priority: 'low',
    total: 1250000,
    totalPaid: 1250000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-10-15'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Pequeño'],
  },

  {
    id: '32',
    projectNumber: 'P 0032-2024',
    projectName: 'Puertas Clínica',
    customerName: 'Centro Médico Los Olivos',
    customerPhone: '+56923456782',
    status: 'En Proceso',
    priority: 'high',
    total: 6200000,
    totalPaid: 3100000,
    percentPaid: 50,
    balance: 3100000,
    date: new Date('2024-11-10'),
    assignedTo: 'Ana Torres',
    tags: ['Comercial', 'Grande', 'Cliente VIP'],
  },

  {
    id: '33',
    projectNumber: 'P 0033-2024',
    projectName: 'Ventanas Restaurante',
    customerName: 'Gastronomía Moderna Ltda',
    customerPhone: '+56934567893',
    status: 'Cancelado',
    priority: 'medium',
    total: 3400000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 3400000,
    date: new Date('2024-09-20'),
    assignedTo: 'María López',
    tags: ['Comercial', 'Cancelado'],
  },

  {
    id: '34',
    projectNumber: 'P 0034-2024',
    projectName: null,
    customerName: 'Martín Salazar',
    customerPhone: '+56945678904',
    status: 'En Proceso',
    priority: 'low',
    total: 1580000,
    totalPaid: 1106000,
    percentPaid: 70,
    balance: 474000,
    date: new Date('2024-12-01'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Avanzado'],
  },

  {
    id: '35',
    projectNumber: 'P 0035-2024',
    projectName: 'Cerramiento Jardín',
    customerName: 'Beatriz Ortiz',
    customerPhone: '+56956789015',
    status: 'Completado',
    priority: 'medium',
    total: 2200000,
    totalPaid: 2200000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-11-05'),
    assignedTo: 'Ana Torres',
    tags: ['Residencial'],
  },

  {
    id: '36',
    projectNumber: 'P 0036-2024',
    projectName: 'Ventanas Gimnasio',
    customerName: 'FitLife Centro Deportivo',
    customerPhone: '+56967890126',
    status: 'En Proceso',
    priority: 'high',
    total: 5800000,
    totalPaid: 1740000,
    percentPaid: 30,
    balance: 4060000,
    date: new Date('2024-12-03'),
    assignedTo: 'María López',
    tags: ['Comercial', 'Grande'],
  },

  {
    id: '37',
    projectNumber: 'P 0037-2024',
    projectName: 'Puertas Colegio',
    customerName: 'Colegio San Agustín',
    customerPhone: '+56978901237',
    status: 'Pendiente',
    priority: 'medium',
    total: 4300000,
    totalPaid: 0,
    percentPaid: 0,
    balance: 4300000,
    date: new Date('2024-12-28'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Educacional', 'Grande'],
  },

  {
    id: '38',
    projectNumber: 'P 0038-2024',
    projectName: 'Ventanas Consultorio',
    customerName: 'Dra. Elena Moreno',
    customerPhone: '+56989012348',
    status: 'En Revisión',
    priority: 'low',
    total: 1420000,
    totalPaid: 710000,
    percentPaid: 50,
    balance: 710000,
    date: new Date('2024-12-15'),
    assignedTo: 'Ana Torres',
    tags: [],
  },

  {
    id: '39',
    projectNumber: 'P 0039-2024',
    projectName: 'Cerramiento Local Comercial',
    customerName: 'Retail Express SA',
    customerPhone: '+56990123459',
    status: 'En Proceso',
    priority: 'high',
    total: 7100000,
    totalPaid: 4970000,
    percentPaid: 70,
    balance: 2130000,
    date: new Date('2024-11-18'),
    assignedTo: 'María López',
    tags: ['Comercial', 'Grande', 'Avanzado'],
  },

  {
    id: '40',
    projectNumber: 'P 0040-2024',
    projectName: 'Ventanas y Puertas Casa de Campo',
    customerName: 'Familia Guzmán',
    customerPhone: '+56901234570',
    status: 'Completado',
    priority: 'medium',
    total: 9200000,
    totalPaid: 9200000,
    percentPaid: 100,
    balance: 0,
    date: new Date('2024-10-22'),
    assignedTo: 'Carlos Ruiz',
    tags: ['Residencial', 'Grande', 'Cliente VIP'],
  },
]

/**
 * Helper para filtrar por estado
 */
export function filterByStatus(data: MockProject[], status: string[]): MockProject[] {
  if (status.length === 0) return data
  return data.filter((item) => status.includes(item.status))
}

/**
 * Helper para filtrar por prioridad
 */
export function filterByPriority(data: MockProject[], priority: string[]): MockProject[] {
  if (priority.length === 0) return data
  return data.filter((item) => priority.includes(item.priority))
}

/**
 * Calcular estadísticas de la tabla
 */
export function getTableStats(data: MockProject[]) {
  return {
    totalProjects: data.length,
    totalAmount: data.reduce((sum, p) => sum + p.total, 0),
    totalPaid: data.reduce((sum, p) => sum + p.totalPaid, 0),
    totalBalance: data.reduce((sum, p) => sum + p.balance, 0),
    completedProjects: data.filter((p) => p.percentPaid === 100).length,
    inProgressProjects: data.filter((p) => p.status === 'En Proceso').length,
    pendingProjects: data.filter((p) => p.status === 'Pendiente').length,
  }
}
