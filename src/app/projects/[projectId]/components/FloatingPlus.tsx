"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmbedModal from "./EmbedModal";
import { usePanelStore } from "./panelStore";

export default function FloatingPlus({ minuteId, onAdded }: { minuteId: string; onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const panelSelected = usePanelStore((s) => s.selected);

  const rightOffsetClass = panelSelected ? "right-6 xl:right-[calc(1.5rem+360px)]" : "right-6";

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        aria-label="Add attachment"
        className={`fixed bottom-6 ${rightOffsetClass} z-50 rounded-full h-12 w-12 p-0 shadow-lg`}
      >
        <Plus />
      </Button>

      <EmbedModal open={open} onOpenChange={setOpen} minuteId={minuteId} onAdded={onAdded} />
    </>
  );
}
