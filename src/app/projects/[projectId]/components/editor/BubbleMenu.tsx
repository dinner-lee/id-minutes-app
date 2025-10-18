"use client";

import { BubbleMenu } from "@tiptap/react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Palette,
  Highlighter,
} from "lucide-react";

interface BubbleMenuProps {
  editor: Editor;
}

export function BubbleMenuComponent({ editor }: BubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      className="flex items-center gap-1 p-2 bg-white border rounded-lg shadow-lg"
    >
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
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button
        variant={editor.isActive("link") ? "default" : "ghost"}
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
    </BubbleMenu>
  );
}
