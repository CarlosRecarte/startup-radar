'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type CollisionDetection,
} from '@dnd-kit/core';

// Detección de colisiones en dos pasos (patrón oficial dnd-kit para
// múltiples contenedores): primero comprueba si el puntero está dentro
// de algún droppable — esto detecta columnas vacías que closestCorners
// ignora porque no tienen ítems sortables como referencia de esquinas.
// Si no hay colisión con el puntero, cae a rectIntersection.
const multiContainerCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Startup, PipelineStage } from '@/types';
import { PIPELINE_STAGES } from '@/data/startups';
import { updateStartupPhase, updateStartupNotes, addStartup } from '@/lib/api/startups';
import StartupCard from './StartupCard';
import StartupDetailModal from './StartupDetailModal';
import AddStartupModal from './AddStartupModal';

// ─── Estilos por columna ──────────────────────────────────────────────────────

const columnColors: Record<PipelineStage, string> = {
  Discovery: 'border-zinc-600',
  Screening: 'border-blue-600/50',
  'Deep Dive': 'border-violet-600/50',
  Outreach: 'border-yellow-600/50',
  'Due Diligence': 'border-orange-600/50',
  'Comité IC': 'border-red-600/50',
  Portfolio: 'border-emerald-600/50',
};

const columnHeaderColors: Record<PipelineStage, string> = {
  Discovery: 'text-zinc-400 bg-zinc-800',
  Screening: 'text-blue-300 bg-blue-900/30',
  'Deep Dive': 'text-violet-300 bg-violet-900/30',
  Outreach: 'text-yellow-300 bg-yellow-900/30',
  'Due Diligence': 'text-orange-300 bg-orange-900/30',
  'Comité IC': 'text-red-300 bg-red-900/30',
  Portfolio: 'text-emerald-300 bg-emerald-900/30',
};

// ─── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({
  startup,
  onClick,
}: {
  startup: Startup;
  onClick: (startup: Startup) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: startup.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(startup)}
    >
      <StartupCard startup={startup} compact />
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  startups,
  onCardClick,
}: {
  stage: PipelineStage;
  startups: Startup[];
  onCardClick: (startup: Startup) => void;
}) {
  // Registra la columna como droppable con el nombre de la fase como ID.
  // Esto permite soltar sobre columnas vacías (sin tarjetas sortables).
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={`flex flex-col min-w-[220px] w-[220px] bg-zinc-900/50 rounded-xl border ${columnColors[stage]}`}
    >
      {/* Cabecera */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${columnHeaderColors[stage]}`}
      >
        <span className="text-xs font-semibold truncate">{stage}</span>
        <span className="text-xs font-bold ml-2 opacity-80">{startups.length}</span>
      </div>

      {/* Tarjetas — ref registra el área como droppable */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 min-h-[120px] rounded-b-xl transition-colors ${
          isOver ? 'bg-violet-950/30' : ''
        }`}
      >
        <SortableContext
          items={startups.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {startups.map((startup) => (
            <SortableCard key={startup.id} startup={startup} onClick={onCardClick} />
          ))}
        </SortableContext>
        {startups.length === 0 && (
          <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
            isOver ? 'border-violet-600/60 bg-violet-900/20' : 'border-zinc-800'
          }`}>
            <span className={`text-xs transition-colors ${isOver ? 'text-violet-400' : 'text-zinc-600'}`}>
              Suelta aquí
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialStartups: Startup[];
}

export default function KanbanBoard({ initialStartups }: KanbanBoardProps) {
  const [items, setItems] = useState<Startup[]>(initialStartups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<PipelineStage | null>(null);

  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getByStage = (stage: PipelineStage) => items.filter((s) => s.pipelineStage === stage);
  const activeStartup = activeId ? items.find((s) => s.id === activeId) : null;

  // ── Error toast ────────────────────────────────────────────────────────────

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const startup = items.find((s) => s.id === event.active.id);
    setActiveId(event.active.id as string);
    setOriginalStage(startup?.pipelineStage ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const dragged = items.find((s) => s.id === active.id);
    if (!dragged) return;

    // Drop sobre una columna
    if (PIPELINE_STAGES.includes(over.id as PipelineStage)) {
      const newStage = over.id as PipelineStage;
      if (dragged.pipelineStage !== newStage) {
        setItems((prev) =>
          prev.map((s) => (s.id === active.id ? { ...s, pipelineStage: newStage } : s))
        );
      }
      return;
    }

    // Drop sobre otra tarjeta
    const overStartup = items.find((s) => s.id === over.id);
    if (overStartup && overStartup.pipelineStage !== dragged.pipelineStage) {
      setItems((prev) =>
        prev.map((s) =>
          s.id === active.id ? { ...s, pipelineStage: overStartup.pipelineStage } : s
        )
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const draggedId = active.id as string;
    const savedOriginal = originalStage;

    setActiveId(null);
    setOriginalStage(null);

    if (!over || !savedOriginal) return;

    // Fase actual tras el optimistic update
    const current = items.find((s) => s.id === draggedId);
    const newStage = current?.pipelineStage;

    if (!newStage || newStage === savedOriginal) return;

    // Llamada a Supabase — revertir si falla
    updateStartupPhase(draggedId, newStage).catch(() => {
      setItems((prev) =>
        prev.map((s) => (s.id === draggedId ? { ...s, pipelineStage: savedOriginal } : s))
      );
      showError('No se pudo guardar el cambio de fase. Inténtalo de nuevo.');
    });

    // Actualiza el modal si está abierto para la misma startup
    if (selectedStartup?.id === draggedId) {
      setSelectedStartup((prev) => (prev ? { ...prev, pipelineStage: newStage } : null));
    }
  }

  // ── Notes handler ──────────────────────────────────────────────────────────

  async function handleSaveNotes(startupId: string, notes: string) {
    const update = (s: Startup) => (s.id === startupId ? { ...s, notes } : s);
    setItems((prev) => prev.map(update));
    setSelectedStartup((prev) => (prev?.id === startupId ? { ...prev, notes } : prev));

    try {
      await updateStartupNotes(startupId, notes);
    } catch {
      showError('No se pudieron guardar las notas. Inténtalo de nuevo.');
    }
  }

  // ── Add startup handler ────────────────────────────────────────────────────

  async function handleAddStartup(
    data: Parameters<typeof addStartup>[0]
  ) {
    const newStartup = await addStartup(data);
    setItems((prev) => [newStartup, ...prev]);
    setShowAddModal(false);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Barra superior con botón de añadir */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Startup
        </button>
      </div>

      {/* Tablero */}
      <DndContext
        id="kanban-dnd"
        sensors={sensors}
        collisionDetection={multiContainerCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              startups={getByStage(stage)}
              onCardClick={setSelectedStartup}
            />
          ))}
        </div>

        <DragOverlay>
          {activeStartup ? (
            <div className="rotate-2 opacity-90">
              <StartupCard startup={activeStartup} compact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de detalle / notas */}
      {selectedStartup && (
        <StartupDetailModal
          startup={selectedStartup}
          onClose={() => setSelectedStartup(null)}
          onSaveNotes={handleSaveNotes}
        />
      )}

      {/* Modal de nueva startup */}
      {showAddModal && (
        <AddStartupModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStartup}
        />
      )}

      {/* Toast de error */}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl shadow-xl">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {errorMsg}
        </div>
      )}
    </>
  );
}
