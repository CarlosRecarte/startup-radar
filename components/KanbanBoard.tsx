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
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Startup, PipelineStage } from '@/types';
import { PIPELINE_STAGES } from '@/data/startups';
import StartupCard from './StartupCard';

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

function SortableCard({ startup }: { startup: Startup }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: startup.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <StartupCard startup={startup} compact />
    </div>
  );
}

interface KanbanColumnProps {
  stage: PipelineStage;
  startups: Startup[];
}

function KanbanColumn({ stage, startups }: KanbanColumnProps) {
  const headerClass = columnHeaderColors[stage];
  const borderClass = columnColors[stage];

  return (
    <div className={`flex flex-col min-w-[220px] w-[220px] bg-zinc-900/50 rounded-xl border ${borderClass}`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${headerClass}`}>
        <span className="text-xs font-semibold truncate">{stage}</span>
        <span className="text-xs font-bold ml-2 opacity-80">{startups.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext items={startups.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {startups.map((startup) => (
            <SortableCard key={startup.id} startup={startup} />
          ))}
        </SortableContext>
        {startups.length === 0 && (
          <div className="h-20 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center">
            <span className="text-xs text-zinc-600">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  initialStartups: Startup[];
}

export default function KanbanBoard({ initialStartups }: KanbanBoardProps) {
  const [items, setItems] = useState<Startup[]>(initialStartups);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const getStartupsByStage = (stage: PipelineStage) =>
    items.filter((s) => s.pipelineStage === stage);

  const activeStartup = activeId ? items.find((s) => s.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeStartup = items.find((s) => s.id === active.id);
    if (!activeStartup) return;

    // If dragged over a stage label (column id)
    if (PIPELINE_STAGES.includes(over.id as PipelineStage)) {
      const newStage = over.id as PipelineStage;
      if (activeStartup.pipelineStage !== newStage) {
        setItems((prev) =>
          prev.map((s) => (s.id === active.id ? { ...s, pipelineStage: newStage } : s))
        );
      }
      return;
    }

    // If dragged over another card
    const overStartup = items.find((s) => s.id === over.id);
    if (overStartup && overStartup.pipelineStage !== activeStartup.pipelineStage) {
      setItems((prev) =>
        prev.map((s) =>
          s.id === active.id ? { ...s, pipelineStage: overStartup.pipelineStage } : s
        )
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Handle drop on column header
    if (PIPELINE_STAGES.includes(over.id as PipelineStage)) {
      const newStage = over.id as PipelineStage;
      setItems((prev) =>
        prev.map((s) => (s.id === active.id ? { ...s, pipelineStage: newStage } : s))
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            startups={getStartupsByStage(stage)}
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
  );
}
