"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { AttachmentBlock } from "./editor/extensions/AttachmentBlock";
import { CustomBulletList, CustomListItem } from "./editor/extensions/CustomBulletList";
import { Button } from "@/components/ui/button";
import EmbedModal from "../components/EmbedModal";
import { Plus } from "lucide-react";
import { Toolbar } from "./editor/Toolbar";
import { BubbleMenuComponent } from "./editor/BubbleMenu";
import { SlashCommand } from "./editor/SlashCommand";

type BlockLike = {
  id: string;
  type: "WEBSITE" | "FILE" | "CHATGPT";
  title?: string | null;
  url?: string | null;
  providerTag?: string | null;
  thumbnailUrl?: string | null;
  isRemix?: boolean | null;
  // Attribution data
  createdBy?: { name?: string | null; email?: string | null } | null;
  createdAt?: string | null;
  // ChatGPT-specific data
  flowCategories?: string[] | null;
  flowCount?: number | null;
  turnCount?: number | null;
};

export default function Editor({
  minuteId,
  user,
  initialHTML = "",
}: {
  minuteId: string;
  user?: { name?: string | null };
  initialHTML?: string;
}) {
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving">("idle");
  const [openEmbed, setOpenEmbed] = useState(false);
  const latestHTML = useRef<string>(initialHTML);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default list extensions to use our custom ones
        bulletList: false,
        listItem: false,
      }),
      // Add our custom list extensions
      CustomBulletList,
      CustomListItem,
      Placeholder.configure({
        placeholder: "Start typing… (# for headings, / for commands, * for bullets)",
      }),
      // Table extensions
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Image extension
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      // Link extension
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      // Text styling extensions
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      // Text alignment
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      // Typography improvements
      Typography,
      // Our custom attachment block
      AttachmentBlock,
    ],
    autofocus: true,
    content: initialHTML || "<p></p>",
    onUpdate: ({ editor }) => {
      latestHTML.current = editor.getHTML();
      setSaving((s) => (s === "saving" ? "saving" : "dirty"));
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none outline-none focus:outline-none",
      },
    },
  });

  // If minute changes (should remount via keys), still ensure content matches
  useEffect(() => {
    latestHTML.current = initialHTML;
    if (editor) editor.commands.setContent(initialHTML || "<p></p>", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteId]);

  // Debounced-ish autosave using interval check
  useEffect(() => {
    if (!editor) return;
    const id = setInterval(async () => {
      if (saving !== "dirty") return;
      setSaving("saving");
      try {
        await fetch(`/api/minutes/${minuteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: latestHTML.current }),
        });
      } finally {
        setSaving("idle");
      }
    }, 1200);
    return () => clearInterval(id);
  }, [editor, minuteId, saving]);

  // Insert a newly created block inline at the current selection
  const insertBlockIntoEditor = (block: BlockLike) => {
    if (!editor) return;
    // Make sure there is a paragraph to insert into if doc is empty
    if (editor.isEmpty) {
      editor.commands.setContent("<p></p>");
    }
    editor
      .chain()
      .focus()
      .insertAttachment({
        blockId: block.id,
        type: block.type,
        title: block.title || undefined,
        url: block.url || undefined,
        providerTag: block.providerTag || undefined,
        thumbnailUrl: block.thumbnailUrl || undefined,
        isRemix: !!block.isRemix,
        // Attribution data
        createdBy: block.createdBy || undefined,
        createdAt: block.createdAt || undefined,
        // ChatGPT-specific data
        flowCategories: block.flowCategories || undefined,
        flowCount: block.flowCount || undefined,
        turnCount: block.turnCount || undefined,
      })
      .run();
  };

  // Listen for insert block events from FloatingAddButton
  useEffect(() => {
    function handleInsertBlock(event: CustomEvent) {
      const block = event.detail.block as BlockLike;
      insertBlockIntoEditor(block);
    }

    window.addEventListener("insertBlock", handleInsertBlock as EventListener);
    return () => {
      window.removeEventListener("insertBlock", handleInsertBlock as EventListener);
    };
  }, [editor, insertBlockIntoEditor]);

  return (
    <div className="relative mx-auto w-full max-w-[873px]">
      <div className="bg-white shadow-sm rounded-lg border relative">
        {/* Toolbar */}
        {editor && <Toolbar editor={editor} />}
        
        {/* Editor Content */}
        <div className="relative">
          <EditorContent editor={editor} className="min-h-[50vh] p-6 md:p-8" />
          
          {/* Bubble Menu for selected text */}
          {editor && <BubbleMenuComponent editor={editor} />}
          
          {/* Slash Command */}
          {editor && <SlashCommand editor={editor} />}
        </div>
        
        {/* Status */}
        <div className="px-6 pb-2 text-[11px] text-muted-foreground">
          {saving === "saving" ? "Saving…" : "Saved"}
        </div>
      </div>

      {/* Embed Modal will be managed by parent */}
    </div>
  );
}
