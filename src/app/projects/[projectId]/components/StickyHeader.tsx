"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  minuteId: string;
  initialTitle: string;
  stageName?: string;
  currentStageId?: string | null;
  stages?: Array<{ id: string; name: string; order: number; plannedDate?: Date | null }>;
  createdAt: Date;
  updatedAt: Date;
};

export function StickyHeader({ 
  minuteId, 
  initialTitle, 
  stageName, 
  currentStageId,
  stages = [],
  createdAt, 
  updatedAt 
}: Props) {
  const [title, setTitle] = useState(initialTitle || "Untitled minute");
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving">("idle");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(currentStageId || null);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.stage-selector-container')) {
        setShowStageDropdown(false);
      }
    }

    if (showStageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStageDropdown]);

  // Debounced autosave for title
  useEffect(() => {
    if (saving === "saving") return;
    const id = setTimeout(async () => {
      if (saving !== "dirty") return;
      setSaving("saving");
      try {
        await fetch(`/api/minutes/${minuteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } finally {
        setSaving("idle");
      }
    }, 600);
    return () => clearTimeout(id);
  }, [title, saving, minuteId]);

  // Handle stage selection
  async function handleStageChange(stageId: string | null) {
    setSelectedStageId(stageId);
    setShowStageDropdown(false);
    
    try {
      await fetch(`/api/minutes/${minuteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      // Reload to refresh the stage display
      window.location.reload();
    } catch (err) {
      console.error("Failed to update stage:", err);
      // Revert on error
      setSelectedStageId(currentStageId || null);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setSaving("dirty");
  }

  const createdText = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt]);
  const updatedText = useMemo(() => new Date(updatedAt).toLocaleString(), [updatedAt]);

  return (
    <div className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto w-full max-w-[794px] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* Editable H1-style title */}
            <input
              value={title}
              onChange={onInput}
              placeholder="Untitled minute"
              className="w-full bg-transparent outline-none text-2xl md:text-3xl font-semibold tracking-tight"
            />

            {/* Dates and Stage selector */}
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>Created {createdText}</span>
              <span>•</span>
              <span>Updated {updatedText}</span>
              {saving === "saving" ? <span>• saving…</span> : null}
              
              {/* Stage selector */}
              <div className="relative stage-selector-container">
                <button
                  type="button"
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs bg-white hover:bg-gray-50"
                >
                  {stageName || "No stage"}
                  {(() => {
                    const currentStage = stages.find(s => s.id === selectedStageId);
                    if (currentStage?.plannedDate) {
                      const plannedDate = new Date(currentStage.plannedDate);
                      const dateStr = plannedDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                      return <span className="text-muted-foreground ml-1">({dateStr})</span>;
                    }
                    return null;
                  })()}
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showStageDropdown && (
                  <div className="absolute left-0 mt-1 bg-white border rounded-lg shadow-lg z-30 min-w-[180px]">
                    <button
                      onClick={() => handleStageChange(null)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg"
                    >
                      No stage
                    </button>
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg"
                      >
                        {stage.name}
                        {stage.plannedDate && (
                          <span className="text-muted-foreground ml-1">
                            ({new Date(stage.plannedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
