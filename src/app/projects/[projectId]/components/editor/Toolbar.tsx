"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table,
  Link,
  Image,
  Palette,
  Type,
  Highlighter,
  MoreHorizontal,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50/50 sticky top-0 z-10">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("strike") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("code") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("highlight") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className="h-8 w-8 p-0"
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Block Elements */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("codeBlock") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className="h-8 w-8 p-0"
        >
          <Code2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="h-8 w-8 p-0"
        >
          <Table className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: "justify" }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className="h-8 w-8 p-0"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Colors */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#000000").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-black"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#ef4444").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-red-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#f97316").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-orange-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#eab308").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#22c55e").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-green-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#3b82f6").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-blue-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#8b5cf6").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-violet-500"></div>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setColor("#ec4899").run()}
          className="h-8 w-8 p-0"
        >
          <div className="h-4 w-4 rounded-full bg-pink-500"></div>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Advanced Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt("Enter image URL:");
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
