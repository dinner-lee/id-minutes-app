"use client";

import { useState } from "react";
import { MinutesListItem } from "./MinutesListItem";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  projectId: string;
  minutes: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    createdAt: Date;
    stageId: string | null;
    markdown?: string | null;
  }>;
  activeId?: string | null;
};

export function MinutesList({ projectId, minutes, activeId }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter minutes based on search query
  const filteredMinutes = minutes.filter((minute) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = minute.title?.toLowerCase().includes(query);
    const contentMatch = minute.markdown?.toLowerCase().includes(query);
    
    return titleMatch || contentMatch;
  });

  if (!minutes.length) {
    return (
      <div className="px-4 text-sm text-muted-foreground">
        No minutes yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search field */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="기록 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Minutes list */}
      <ul className="px-2 space-y-1 overflow-y-auto flex-1 pt-2">
        {filteredMinutes.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            No minutes found matching "{searchQuery}"
          </li>
        ) : (
          filteredMinutes.map((m) => {
            const href = `/projects/${projectId}?minuteId=${m.id}`;
            const active = m.id === activeId;
            return (
              <MinutesListItem 
                key={m.id}
                projectId={projectId}
                minute={m}
                href={href}
                active={active}
              />
            );
          })
        )}
      </ul>
    </div>
  );
}

