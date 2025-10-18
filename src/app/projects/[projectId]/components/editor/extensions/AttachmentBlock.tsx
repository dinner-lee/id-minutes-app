"use client";

import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { ExternalLink, FileText, Bot, Trash2, Info } from "lucide-react";

export type AttachmentAttrs = {
  blockId: string;
  type: "WEBSITE" | "FILE" | "CHATGPT";
  title?: string;
  url?: string | null;
  providerTag?: string | null;
  thumbnailUrl?: string | null;
  isRemix?: boolean | null;
  // Attribution data
  createdBy?: { name?: string | null; email?: string | null } | null;
  createdAt?: string | null;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachmentBlock: {
      insertAttachment: (attrs: AttachmentAttrs) => ReturnType;
      removeAttachmentAtPos: (pos: number) => ReturnType;
    };
  }
}

export const AttachmentBlock = Node.create({
  name: "attachmentBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: { default: "" },
      type: { default: "WEBSITE" },
      title: { default: "" },
      url: { default: null },
      providerTag: { default: null },
      thumbnailUrl: { default: null },
      isRemix: { default: null },
      // Attribution data
      createdBy: { default: null },
      createdAt: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "attachment-card" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["attachment-card", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentCardView);
  },

  addCommands() {
    return {
      insertAttachment:
        (attrs: AttachmentAttrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run(),

      removeAttachmentAtPos:
        (pos: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.delete(pos, pos + 1);
          }
          return true;
        },
    };
  },
});

/* ------------------------- React Node View ------------------------- */

function AttachmentCardView({ node, editor, getPos }: any) {
  const attrs = node.attrs as AttachmentAttrs;
  const pos = getPos?.();

  const icon =
    attrs.type === "CHATGPT" ? (
      <Bot className="h-4 w-4" />
    ) : attrs.type === "FILE" ? (
      <FileText className="h-4 w-4" />
    ) : (
      <ExternalLink className="h-4 w-4" />
    );

  const tag =
    attrs.type === "CHATGPT" ? "ChatGPT" : attrs.type === "FILE" ? (attrs.providerTag ?? "File") : (attrs.providerTag ?? "Link");

  function remove() {
    if (typeof pos === "number") {
      editor.commands.removeAttachmentAtPos(pos);
    }
  }

  function showDetail() {
    // Emit a custom event the right panel can listen to (optional)
    window.dispatchEvent(
      new CustomEvent("attachment:detail", { detail: { blockId: attrs.blockId } })
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      className="my-3"
      draggable="true"
      data-drag-handle
    >
      <div className="group relative border rounded-lg bg-white hover:bg-white/90 shadow-sm">
        <div className="p-3 flex items-start gap-3">
          {/* Thumb / icon */}
          {attrs.thumbnailUrl ? (
            <img
              src={attrs.thumbnailUrl}
              alt=""
              className="h-10 w-10 rounded object-cover border"
            />
          ) : (
            <div className="h-10 w-10 rounded border grid place-items-center bg-slate-50">
              {icon}
            </div>
          )}

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{attrs.title || "(untitled)"}</span>
              <span className="text-[10px] rounded-full border px-2 py-0.5 bg-white">{tag}</span>
              {attrs.isRemix ? (
                <span className="text-[10px] rounded-full border px-2 py-0.5 bg-violet-50">
                  Remixed
                </span>
              ) : null}
              {/* Attribution tags inline with title and block type */}
              {attrs.createdBy && (
                <span className="text-[9px] rounded-full border px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  by {attrs.createdBy.name || attrs.createdBy.email?.split('@')[0] || 'Unknown'}
                </span>
              )}
              {attrs.createdAt && (
                <span className="text-[9px] rounded-full border px-1.5 py-0.5 bg-gray-50 text-gray-600 border-gray-200">
                  {new Date(attrs.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {attrs.url ? (
              <a
                href={attrs.url}
                target="_blank"
                className="block text-[11px] text-blue-600 truncate"
                rel="noreferrer"
              >
                {attrs.url}
              </a>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={showDetail}
              title="Details"
              className="p-1 rounded hover:bg-slate-100"
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={remove}
              title="Remove"
              className="p-1 rounded hover:bg-slate-100 text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional: inner content area if you want to allow notes inside the card */}
        {/* <NodeViewContent className="hidden" /> */}
      </div>
    </NodeViewWrapper>
  );
}
