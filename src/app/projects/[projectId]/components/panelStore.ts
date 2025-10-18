"use client";

import { create } from "zustand";

export type BlockType = "CHATGPT" | "WEBSITE" | "FILE";

export type BlockRec = {
  id: string;
  type: BlockType;
  title?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  providerTag?: string | null;
  purpose?: "INFO_SEEKING" | "IDEATION" | "DATA_ANALYSIS" | "ELABORATION" | "CODE_HELP" | "OTHER" | null;
  isRemix?: boolean | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: { id: string; name?: string | null; email?: string | null } | null;
  chat?: { notes?: string | null; flows?: any } | null;
  file?: { filename?: string; mimeType?: string; size?: number; key?: string } | null;
};

type PanelState = {
  selected: BlockRec | null;
  openWith: (b: BlockRec) => void;
  clear: () => void;
};

export const usePanelStore = create<PanelState>((set) => ({
  selected: null,
  openWith: (b) => set({ selected: b }),
  clear: () => set({ selected: null }),
}));
