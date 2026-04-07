import DashboardLayout from '../components/DashboardLayout'

export default function Operaciones() {
  return (
    <DashboardLayout title="Operaciones">
      <div className="surface-panel rounded-[22px] p-6">
        <h2 className="font-heading text-xl font-semibold text-sidebar-bg">Centro de control diario</h2>
        <p className="mt-2 text-sm text-slate-500">
          La superficie de rondas operativas se implementa en las siguientes tareas.
        </p>
      </div>
    </DashboardLayout>
  )
}
