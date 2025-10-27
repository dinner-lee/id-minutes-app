"use client";

import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { postJSON } from "@/lib/api";
import { useRouter } from "next/navigation";

type StageItem = { name: string; order: number; plannedDate?: string | null };

export default function Step3Client({
  projectId,
  initial,
}: {
  projectId: string;
  initial: StageItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(
    initial.map((s, i) => ({ id: `${i}-${s.name}`, ...s }))
  );
  const sensors = useSensors(useSensor(PointerSensor));
  const [saving, setSaving] = useState(false);

  function onDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex).map((s, i) => ({ ...s, order: i })));
  }

  function setDate(id: string, date: string) {
    setItems((arr) => arr.map((s) => (s.id === id ? { ...s, plannedDate: date } : s)));
  }

  function addStage() {
    const name = prompt("Stage name?");
    if (!name) return;
    setItems((arr) => [...arr, { id: `new-${Date.now()}`, name, order: arr.length, plannedDate: null }]);
  }

  async function onSave() {
    try {
      setSaving(true);
      await postJSON(`/api/projects/${projectId}/stages`, {
        stages: items.map(({ name, order, plannedDate }) => ({
          name, 
          order, 
          plannedDate: plannedDate ? new Date(plannedDate).toISOString() : null,
        })),
      });
      router.replace(`/projects/${projectId}`);
    } catch (err: any) {
      alert(err.message || "Failed to save stages");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Step 3 — Timeline</h1>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={addStage} className="rounded border px-3 py-1 text-sm">Add stage</button>
        <button onClick={onSave} disabled={saving}
                className="rounded bg-black text-white px-3 py-1 text-sm">
          {saving ? "Saving…" : "Save & go to workspace"}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="border rounded p-3 flex items-center gap-4">
                <div className="cursor-grab select-none text-sm w-6 text-center">≡</div>
                <div className="flex-1">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Order: {s.order + 1}</div>
                </div>
                <input
                  type="date"
                  className="border rounded p-1 text-sm"
                  value={s.plannedDate || ""}
                  onChange={(e) => setDate(s.id, e.target.value)}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
