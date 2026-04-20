import { useState } from 'react'
import { trpc } from '../lib/trpc'
import DashboardLayout from '../components/DashboardLayout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Building2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type BathroomRound = {
  id: number
  titulo: string
  descripcion: string
  ubicacion: string
  prioridad: string
  estado: string
  empleadoId: number | null
  empleadoNombre: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export default function RondasBanos() {
  const [selectedRound, setSelectedRound] = useState<BathroomRound | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  // Form states
  const [newRound, setNewRound] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: '',
    prioridad: 'media' as const
  })

  const [selectedEmployee, setSelectedEmployee] = useState('')

  // Queries
  const { data: rounds, refetch: refetchRounds } = trpc.bathroomRounds.getAll.useQuery()
  const { data: employees } = trpc.employees.getAll.useQuery()

  // Mutations
  const createRound = trpc.bathroomRounds.create.useMutation({
    onSuccess: () => {
      refetchRounds()
      setShowCreateDialog(false)
      setNewRound({ titulo: '', descripcion: '', ubicacion: '', prioridad: 'media' })
    }
  })

  const assignRound = trpc.bathroomRounds.assign.useMutation({
    onSuccess: () => {
      refetchRounds()
      setShowAssignDialog(false)
      setSelectedEmployee('')
    }
  })

  const startRound = trpc.bathroomRounds.start.useMutation({
    onSuccess: () => refetchRounds()
  })

  const completeRound = trpc.bathroomRounds.complete.useMutation({
    onSuccess: () => refetchRounds()
  })

  const pauseRound = trpc.bathroomRounds.pause.useMutation({
    onSuccess: () => refetchRounds()
  })

  const resumeRound = trpc.bathroomRounds.resume.useMutation({
    onSuccess: () => refetchRounds()
  })

  const handleCreateRound = () => {
    if (!newRound.titulo || !newRound.ubicacion) return

    createRound.mutate({
      titulo: newRound.titulo,
      descripcion: newRound.descripcion,
      ubicacion: newRound.ubicacion,
      prioridad: newRound.prioridad
    })
  }

  const handleAssignRound = () => {
    if (!selectedRound || !selectedEmployee) return

    const employee = employees?.find(e => e.id.toString() === selectedEmployee)
    if (!employee) return

    assignRound.mutate({
      roundId: selectedRound.id,
      employeeId: employee.id,
      employeeName: employee.nombre
    })
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente_asignacion': return 'bg-gray-100 text-gray-800'
      case 'pendiente_confirmacion': return 'bg-yellow-100 text-yellow-800'
      case 'aceptada': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pausada': return 'bg-orange-100 text-orange-800'
      case 'terminada': return 'bg-purple-100 text-purple-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      case 'rechazada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente_asignacion': return 'Sin asignar'
      case 'pendiente_confirmacion': return 'Pendiente confirmación'
      case 'aceptada': return 'Aceptada'
      case 'en_progreso': return 'En progreso'
      case 'pausada': return 'Pausada'
      case 'terminada': return 'Completada'
      case 'cancelada': return 'Cancelada'
      case 'rechazada': return 'Rechazada'
      default: return estado
    }
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'bg-green-100 text-green-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'alta': return 'bg-red-100 text-red-800'
      case 'urgente': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canStart = (round: BathroomRound) => round.estado === 'aceptada'
  const canPause = (round: BathroomRound) => round.estado === 'en_progreso'
  const canResume = (round: BathroomRound) => round.estado === 'pausada'
  const canComplete = (round: BathroomRound) => round.estado === 'en_progreso'

  return (
    <DashboardLayout title="Rondas de Baños">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rondas de Baños</h1>
            <p className="text-gray-600">Gestión de rondas de limpieza y mantenimiento</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                Crear Ronda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Ronda</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={newRound.titulo}
                    onChange={(e) => setNewRound(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ej: Ronda Baños Planta Baja"
                  />
                </div>
                <div>
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input
                    id="ubicacion"
                    value={newRound.ubicacion}
                    onChange={(e) => setNewRound(prev => ({ ...prev, ubicacion: e.target.value }))}
                    placeholder="Ej: Baños Planta Baja"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={newRound.descripcion}
                    onChange={(e) => setNewRound(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción de la ronda..."
                  />
                </div>
                <div>
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select value={newRound.prioridad} onValueChange={(value: any) => setNewRound(prev => ({ ...prev, prioridad: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRound} disabled={createRound.isLoading}>
                    {createRound.isLoading ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-yellow-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Sin asignar</p>
                  <p className="text-2xl font-bold">{rounds?.filter(r => r.estado === 'pendiente_asignacion').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">En progreso</p>
                  <p className="text-2xl font-bold">{rounds?.filter(r => r.estado === 'en_progreso').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Completadas hoy</p>
                  <p className="text-2xl font-bold">
                    {rounds?.filter(r =>
                      r.estado === 'terminada' &&
                      new Date(r.completedAt || '').toDateString() === new Date().toDateString()
                    ).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-purple-500" size={20} />
                <div>
                  <p className="text-sm text-gray-600">Total rondas</p>
                  <p className="text-2xl font-bold">{rounds?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rounds List */}
        <div className="space-y-4">
          {rounds?.map((round) => (
            <Card key={round.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{round.titulo}</h3>
                      <Badge className={getStatusColor(round.estado)}>
                        {getStatusLabel(round.estado)}
                      </Badge>
                      <Badge className={getPriorityColor(round.prioridad)}>
                        {round.prioridad}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{round.descripcion}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {round.ubicacion}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {format(new Date(round.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                      {round.empleadoNombre && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          {round.empleadoNombre}
                        </div>
                      )}
                    </div>
                    {round.startedAt && (
                      <div className="mt-2 text-sm text-blue-600">
                        ⏰ Iniciada: {format(new Date(round.startedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    )}
                    {round.completedAt && (
                      <div className="mt-1 text-sm text-green-600">
                        ✅ Completada: {format(new Date(round.completedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {round.estado === 'pendiente_asignacion' && (
                      <Dialog open={showAssignDialog && selectedRound?.id === round.id} onOpenChange={(open) => {
                        setShowAssignDialog(open)
                        if (open) setSelectedRound(round)
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <User size={14} className="mr-1" />
                            Asignar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Asignar Ronda</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Seleccionar Empleado</Label>
                              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Elegir empleado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees?.filter(e => e.activo).map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                      {employee.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAssignRound} disabled={assignRound.isLoading}>
                                {assignRound.isLoading ? 'Asignando...' : 'Asignar'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {canStart(round) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startRound.mutate({ roundId: round.id })}
                        disabled={startRound.isLoading}
                      >
                        <Play size={14} className="mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {canPause(round) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseRound.mutate({ roundId: round.id })}
                        disabled={pauseRound.isLoading}
                      >
                        <Pause size={14} className="mr-1" />
                        Pausar
                      </Button>
                    )}
                    {canResume(round) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resumeRound.mutate({ roundId: round.id })}
                        disabled={resumeRound.isLoading}
                      >
                        <Play size={14} className="mr-1" />
                        Reanudar
                      </Button>
                    )}
                    {canComplete(round) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeRound.mutate({ roundId: round.id })}
                        disabled={completeRound.isLoading}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {rounds?.length === 0 && (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rondas</h3>
            <p className="text-gray-600">Crea tu primera ronda de baños para comenzar</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}