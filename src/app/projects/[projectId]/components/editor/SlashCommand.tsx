"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Table,
  CheckSquare,
  Image,
  Link,
  Minus,
} from "lucide-react";

interface SlashCommandProps {
  editor: Editor;
}

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: () => void;
}

export function SlashCommand({ editor }: SlashCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: SlashCommandItem[] = [
    {
      title: "Heading 1",
      description: "Large heading",
      icon: <Heading1 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium heading",
      icon: <Heading2 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small heading",
      icon: <Heading3 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Create a bullet list (type * at start of line)",
      icon: <List className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Create a numbered list",
      icon: <ListOrdered className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Quote",
      description: "Create a quote block",
      icon: <Quote className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Code Block",
      description: "Create a code block",
      icon: <Code2 className="h-4 w-4" />,
      command: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Table",
      description: "Create a table",
      icon: <Table className="h-4 w-4" />,
      command: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: "Divider",
      description: "Create a horizontal divider",
      icon: <Minus className="h-4 w-4" />,
      command: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      title: "Image",
      description: "Insert an image",
      icon: <Image className="h-4 w-4" />,
      command: () => {
        const url = window.prompt("Enter image URL:");
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      },
    },
    {
      title: "Link",
      description: "Insert a link",
      icon: <Link className="h-4 w-4" />,
      command: () => {
        const url = window.prompt("Enter URL:");
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commands.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        commands[selectedIndex].command();
        setIsOpen(false);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, commands]);

  useEffect(() => {
    const handleSlash = (event: KeyboardEvent) => {
      if (event.key === "/" && editor.isFocused) {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 10), from);
        
        // Only show slash command if we're at the start of a line or after whitespace
        if (textBefore.match(/\s$/) || from === 0) {
          setIsOpen(true);
          setSelectedIndex(0);
        }
      }
    };

    document.addEventListener("keydown", handleSlash);
    return () => document.removeEventListener("keydown", handleSlash);
  }, [editor]);

  if (!isOpen) return null;

  return (
    <div className="absolute z-50 w-64 bg-white border rounded-lg shadow-lg p-2">
      <div className="text-xs text-gray-500 mb-2 px-2">Quick Insert</div>
      {commands.map((command, index) => (
        <Button
          key={command.title}
          variant={index === selectedIndex ? "default" : "ghost"}
          className="w-full justify-start h-auto p-2 mb-1"
          onClick={() => {
            command.command();
            setIsOpen(false);
          }}
        >
          <div className="flex items-center gap-3">
            {command.icon}
            <div className="text-left">
              <div className="font-medium text-sm">{command.title}</div>
              <div className="text-xs text-gray-500">{command.description}</div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
