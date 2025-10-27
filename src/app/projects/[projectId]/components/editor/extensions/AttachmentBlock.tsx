"use client";

import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { ExternalLink, FileText, Bot, Trash2, Search } from "lucide-react";

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
  // ChatGPT-specific data
  flowCategories?: string[] | null; // e.g., ["Information Seeking & Summarization", "Idea Generation / Brainstorming"]
  flowCount?: number | null; // Number of flows in this conversation
  turnCount?: number | null; // Total number of conversation turns
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
      // ChatGPT-specific data  
      flowCategories: { 
        default: null,
        parseHTML: (element) => {
          const attr = element.getAttribute("flowcategories");
          if (!attr) return null;
          
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(attr);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // If not valid JSON, treat as single string and return as array
            return [attr];
          }
        },
      },
      flowCount: { default: null },
      turnCount: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "attachment-card" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, any> = {};
    
    // Copy all attributes
    Object.keys(HTMLAttributes).forEach(key => {
      attrs[key] = HTMLAttributes[key];
    });
    
    // Ensure flowCategories is stored as JSON string
    if (HTMLAttributes.flowCategories && Array.isArray(HTMLAttributes.flowCategories)) {
      attrs.flowCategories = JSON.stringify(HTMLAttributes.flowCategories);
    }
    
    return ["attachment-card", mergeAttributes(attrs)];
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


  // Helper functions
  const getAbbreviatedUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      // If URL parsing fails, try to extract domain manually
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
      return match ? match[1] : url;
    }
  };

  const getFileExtension = (url: string | null | undefined): string => {
    if (!url) return "";
    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toUpperCase() : "";
  };

  const getUserInitials = (name?: string | null, email?: string | null): string => {
    if (name) {
      const parts = name.split(/\s+/);
      return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const getColorForInitials = (initials: string): string => {
    const colors = [
      "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-teal-500"
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index] || "bg-gray-500";
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
  };

  function remove() {
    if (typeof pos === "number") {
      editor.commands.removeAttachmentAtPos(pos);
    }
  }

  function showDetail() {
    window.dispatchEvent(
      new CustomEvent("attachment:detail", { detail: { blockId: attrs.blockId } })
    );
  }

  // Determine what to display based on block type
  const getSecondaryBadges = () => {
    if (attrs.type === "CHATGPT") {
      return (
        <>
          {/* Turn count badge */}
          {attrs.turnCount !== null && attrs.turnCount !== undefined && (
            <span className="text-[10px] rounded-full border px-2 py-0.5 bg-white text-gray-700 font-medium">
              {attrs.turnCount} turns
            </span>
          )}
          {/* Category badge */}
          {attrs.flowCategories && attrs.flowCategories.length > 0 && (
            <span className="text-[10px] rounded-full border px-2 py-0.5 bg-white text-gray-700">
              {attrs.flowCategories[0]}
            </span>
          )}
        </>
      );
    } else if (attrs.type === "FILE") {
      const ext = getFileExtension(attrs.url || attrs.title);
      return ext ? (
        <span className="text-[10px] rounded-full border px-2 py-0.5 bg-white text-gray-700">
          {ext}
        </span>
      ) : null;
    } else if (attrs.type === "WEBSITE") {
      const abbreviated = getAbbreviatedUrl(attrs.url);
      return abbreviated ? (
        <span className="text-[10px] rounded-full border px-2 py-0.5 bg-white text-gray-700">
          {abbreviated}
        </span>
      ) : null;
    }
    return null;
  };

  const initials = getUserInitials(attrs.createdBy?.name, attrs.createdBy?.email);
  const colorClass = getColorForInitials(initials);

  return (
    <NodeViewWrapper
      as="div"
      className="my-3"
      draggable="true"
      data-drag-handle
    >
      <div className="group relative border rounded-lg bg-white hover:shadow-md transition-shadow">
        {/* Top Section */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Main type badge */}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black text-white text-[10px] font-medium">
                {attrs.type === "CHATGPT" ? (
                  <>
                    <Bot className="h-3 w-3" />
                    ChatGPT
                  </>
                ) : attrs.type === "FILE" ? (
                  <>
                    <FileText className="h-3 w-3" />
                    File
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3" />
                    {attrs.providerTag || "Link"}
                  </>
                )}
              </span>

              {/* Secondary badges */}
              {getSecondaryBadges()}
            </div>

            {/* Right: Actions and metadata */}
            <div className="flex items-center gap-2">
              {/* User info */}
              {attrs.createdBy && (
                <div className="flex items-center gap-1.5">
                  <div className={`h-7 w-7 rounded-full ${colorClass} text-white text-xs grid place-items-center font-medium`}>
                    {initials.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700">
                    {attrs.createdBy.name || attrs.createdBy.email?.split("@")[0] || "Unknown"}
                  </span>
                </div>
              )}

              {/* Date/Time */}
              {attrs.createdAt && (
                <span className="text-xs text-gray-500">
                  {formatDateTime(attrs.createdAt)}
                </span>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={showDetail}
                  title="View details"
                  className="p-1.5 rounded hover:bg-slate-100 text-gray-600"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  onClick={remove}
                  title="Delete"
                  className="p-1.5 rounded hover:bg-slate-100 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Divider */}
          <div className="border-t my-2"></div>

          {/* Title */}
          <div className="text-sm font-medium text-gray-900 line-clamp-2">
            {attrs.title || "(untitled)"}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
