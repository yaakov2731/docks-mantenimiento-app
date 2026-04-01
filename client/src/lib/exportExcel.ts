import * as XLSX from 'xlsx'

export function exportarExcel(reportes: any[]) {
  const wb = XLSX.utils.book_new()

  const fmt = (r: any) => ({
    ID: r.id,
    Fecha: r.createdAt ? new Date(r.createdAt * 1000).toLocaleDateString('es-AR') : '',
    Locatario: r.locatario,
    Local: r.local,
    Planta: r.planta,
    Categoria: r.categoria,
    Prioridad: r.prioridad,
    Titulo: r.titulo,
    Descripcion: r.descripcion,
    Estado: r.estado,
    Asignado: r.asignadoA ?? '',
    Completado: r.completadoAt ? new Date(r.completadoAt * 1000).toLocaleDateString('es-AR') : '',
    Duracion: r.completadoAt && r.createdAt
      ? `${Math.round((r.completadoAt - r.createdAt) / 3600)}h`
      : '',
  })

  // Hoja 1: Todos
  const todos = reportes.map(fmt)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todos), 'Todos los Reclamos')

  // Hoja 2: Activos
  const activos = reportes.filter(r => !['completado','cancelado'].includes(r.estado)).map(fmt)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activos), 'Activos')

  // Hoja 3: Completados
  const completados = reportes.filter(r => r.estado === 'completado').map(fmt)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(completados), 'Completados')

  // Hoja 4: Por Prioridad
  const priorOrd = ['urgente','alta','media','baja']
  const porPrio = [...reportes].sort((a,b) => priorOrd.indexOf(a.prioridad) - priorOrd.indexOf(b.prioridad)).map(fmt)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porPrio), 'Por Prioridad')

  // Hoja 5: Estadísticas
  const stats = [
    { Metrica: 'Total reclamos', Valor: reportes.length },
    { Metrica: 'Pendientes', Valor: reportes.filter(r => r.estado === 'pendiente').length },
    { Metrica: 'En Progreso', Valor: reportes.filter(r => r.estado === 'en_progreso').length },
    { Metrica: 'Completados', Valor: reportes.filter(r => r.estado === 'completado').length },
    { Metrica: 'Urgentes activos', Valor: reportes.filter(r => r.prioridad === 'urgente' && r.estado !== 'completado').length },
    { Metrica: '', Valor: '' },
    ...['electrico','plomeria','estructura','limpieza','seguridad','climatizacion','otro'].map(c => ({
      Metrica: `Categoría: ${c}`, Valor: reportes.filter(r => r.categoria === c).length
    })),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats), 'Estadísticas')

  const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g,'-')
  XLSX.writeFile(wb, `Docks-Mantenimiento-${fecha}.xlsx`)
}
