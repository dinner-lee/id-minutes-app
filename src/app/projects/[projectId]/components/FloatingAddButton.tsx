"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EmbedModal from "./EmbedModal";

type BlockLike = {
  id: string;
  type: "WEBSITE" | "FILE" | "CHATGPT";
  title?: string | null;
  url?: string | null;
  providerTag?: string | null;
  thumbnailUrl?: string | null;
  isRemix?: boolean | null;
  createdBy?: { name?: string | null; email?: string | null } | null;
  createdAt?: string | null;
  flowCategories?: string[] | null;
  flowCount?: number | null;
  turnCount?: number | null;
};

export function FloatingAddButton({ minuteId }: { minuteId: string }) {
  const [openEmbed, setOpenEmbed] = useState(false);

  function insertBlockIntoEditor(block: BlockLike) {
    // Dispatch a custom event that the editor can listen to
    window.dispatchEvent(
      new CustomEvent("insertBlock", { 
        detail: { block } 
      })
    );
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpenEmbed(true)}
        className="fixed bottom-6 right-[488px] rounded-full h-11 w-11 p-0 shadow-lg z-50"
        aria-label="Insert attachment"
      >
        <Plus />
      </Button>

      <EmbedModal
        open={openEmbed}
        onOpenChange={setOpenEmbed}
        minuteId={minuteId}
        onCreated={(block: BlockLike) => {
          insertBlockIntoEditor(block);
        }}
      />
    </>
  );
}
