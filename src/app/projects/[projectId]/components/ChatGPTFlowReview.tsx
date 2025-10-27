"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

/** --- Simple native select wrapper (no shadcn dependency) --- */
function SelectBox({
  value,
  onValueChange,
  options,
  className = "",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`h-8 w-[320px] rounded border bg-white px-2 text-sm ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** The 9 canonical categories */
export const NINE_CATEGORIES = [
  "Information Seeking & Summarization",
  "Idea Generation / Brainstorming",
  "Idea Refinement / Elaboration",
  "Data & Content Analysis",
  "Learning & Conceptual Understanding",
  "Writing & Communication Assistance",
  "Problem Solving & Decision Support",
  "Automation & Technical Support",
  "Accuracy Verification & Source Checking",
] as const;

export type NineCategory = typeof NINE_CATEGORIES[number];

export type ChangeSegment = {
  category: NineCategory;
  startPair: number;     // index in pairs[]
  endPair: number;       // inclusive
  userIndices: number[]; // absolute user indices
  assistantPreview: string; // last assistant response within this segment
  availableResponses?: string[]; // all available assistant responses for this segment
  title?: string; // User-friendly title summarizing the flow (15-20 chars)
};

/** Component for selecting assistant responses */
function ResponseSelector({
  value,
  onChange,
  availableResponses = [],
  userText,
}: {
  value: string;
  onChange: (value: string) => void;
  availableResponses: string[];
  userText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (availableResponses.length <= 1) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Assistant response (last message of this segment)"
        className="min-h-[96px] text-sm w-full rounded border p-2"
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {availableResponses.length} response{availableResponses.length !== 1 ? 's' : ''} available
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-6 px-2 text-xs"
        >
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {isOpen ? 'Hide' : 'Show'} options
        </Button>
      </div>
      
      {isOpen && (
        <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
          {availableResponses.map((response, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-xs text-muted-foreground">Response {idx + 1}:</div>
              <div className="text-sm p-2 bg-white rounded border cursor-pointer hover:bg-gray-100"
                   onClick={() => {
                     onChange(response);
                     setIsOpen(false);
                   }}>
                {response.slice(0, 200)}{response.length > 200 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Assistant response (last message of this segment)"
        className="min-h-[96px] text-sm w-full rounded border p-2"
      />
    </div>
  );
}

export default function ChatGPTFlowReview({
  title: initialTitle,
  segments: initialSegments,
  addedByName,
  pairs = [],
  onCancel,
  onConfirm,
}: {
  title: string;
  segments: ChangeSegment[];
  addedByName: string;
  pairs?: Array<{ userText: string; assistantTexts: string[] }>;
  onCancel: () => void;
  onConfirm: (opts: { title?: string; notes?: string; segments: ChangeSegment[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle || "ChatGPT Conversation");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ChangeSegment[]>(initialSegments || []);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [generatingTitles, setGeneratingTitles] = useState(false);

  // Generate titles for flows that don't have titles
  useEffect(() => {
    async function generateTitles() {
      const needsTitles = rows.filter(row => !row.title || row.title.trim() === "");
      if (needsTitles.length === 0 || !pairs || pairs.length === 0) return;

      setGeneratingTitles(true);
      try {
        // Prepare flows data with userText for title generation
        const flowsToGenerate = needsTitles.map(row => ({
          userText: pairs[row.startPair]?.userText || "",
          turnPairs: pairs.slice(row.startPair, row.endPair + 1),
        }));

        const response = await fetch("/api/generate-flow-titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flows: flowsToGenerate }),
        });

        if (response.ok) {
          const { titles } = await response.json();
          
          // Update rows with generated titles
          setRows(prev => {
            let needsTitleIdx = 0;
            return prev.map((row) => {
              const needsTitle = !row.title || row.title.trim() === "";
              if (needsTitle && needsTitleIdx < titles.length && titles[needsTitleIdx]) {
                const result = { ...row, title: titles[needsTitleIdx] };
                needsTitleIdx++;
                return result;
              }
              if (needsTitle) needsTitleIdx++;
              return row;
            });
          });
        }
      } catch (err) {
        console.error("Failed to generate titles:", err);
      } finally {
        setGeneratingTitles(false);
      }
    }

    generateTitles();
  }, [pairs]); // Generate titles when pairs are loaded

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const initials = useMemo(() => {
    const parts = (addedByName || "").split(/\s+/);
    const s = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return s.toUpperCase() || "U";
  }, [addedByName]);

  function updateRow(i: number, patch: Partial<ChangeSegment>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addRow() {
    const availablePairs = pairs.filter(pair => pair.assistantTexts.length > 0);
    if (availablePairs.length > 0) {
      setShowDropdown(!showDropdown);
    } else {
      // If no responses available, add empty row
      setRows((prev) => [
        ...prev,
        {
          category: "Information Seeking & Summarization",
          startPair: prev.length,
          endPair: prev.length,
          userIndices: [],
          assistantPreview: "",
          title: "",
        },
      ]);
    }
  }

  function addRowWithResponse(pair: { userText: string; assistantTexts: string[] }) {
    const lastResponse = pair.assistantTexts[pair.assistantTexts.length - 1] || "";
    setRows((prev) => [
      ...prev,
      {
        category: "Information Seeking & Summarization",
        startPair: prev.length,
        endPair: prev.length,
        userIndices: [],
        assistantPreview: lastResponse,
        availableResponses: pair.assistantTexts.length > 0 ? [...pair.assistantTexts] : undefined,
        title: "",
      },
    ]);
    setShowDropdown(false); // Close dropdown after selection
  }

  async function handleConfirm() {
    // Enhance segments with actual conversation data from pairs
    const enhancedSegments = rows.map((segment) => {
      // For collapsed flows (multiple turns), we need to get data for each turn
      const turnPairs = [];
      for (let i = segment.startPair; i <= segment.endPair; i++) {
        const pairData = pairs[i];
        if (pairData) {
          turnPairs.push({
            userText: pairData.userText || "",
            assistantTexts: pairData.assistantTexts || [],
            turnNumber: i + 1,
          });
        }
      }
      
      const enhanced = {
        category: segment.category,
        startPair: segment.startPair,
        endPair: segment.endPair,
        userIndices: segment.userIndices,
        assistantPreview: segment.assistantPreview,
        title: segment.title || "", // Explicitly include title
        turnPairs: turnPairs, // Store all turns for this flow
        userText: pairs[segment.startPair]?.userText || "",
        assistantTexts: pairs[segment.startPair]?.assistantTexts || [segment.assistantPreview || ""],
      };
      
    return enhanced;
    });

    await onConfirm({
      title: title?.trim() || undefined,
      notes: notes?.trim() || undefined,
      segments: enhancedSegments,
    });
  }

  return (
    <div className="space-y-4">
      {/* Header: who + title */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 grid place-items-center text-sm font-medium">
          {initials}
        </div>
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chat title"
            className="font-medium"
          />
          <div className="text-[11px] text-muted-foreground">Added by {addedByName}</div>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
        {generatingTitles && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Generating titles...
          </div>
        )}
        {rows.map((row, i) => (
          <div key={i} className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs w-5 shrink-0 text-muted-foreground">{i + 1}.</span>

              <SelectBox
                value={row.category}
                onValueChange={(v) => updateRow(i, { category: v as NineCategory })}
                options={NINE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />

              <Input
                value={row.title || ""}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                placeholder="Flow title (auto-generated)"
                className="h-8 w-[250px] text-sm"
              />

              <button
                title="Delete"
                onClick={() => removeRow(i)}
                className="ml-auto p-1 rounded hover:bg-slate-100 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2">
              <ResponseSelector
                value={row.assistantPreview}
                onChange={(value) => updateRow(i, { assistantPreview: value })}
                availableResponses={row.availableResponses || []}
                userText={pairs[row.startPair]?.userText || ""}
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                Covers pairs {row.startPair + 1}–{row.endPair + 1}
                {row.userIndices?.length ? ` • user turns: [${row.userIndices.join(", ")}]` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <Button type="button" variant="secondary" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add flow
          {pairs.filter(pair => pair.assistantTexts.length > 0).length > 0 && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {pairs.filter(pair => pair.assistantTexts.length > 0).length} responses available
            </span>
          )}
          </Button>
          {showDropdown && pairs.filter(pair => pair.assistantTexts.length > 0).length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[300px]">
              <div className="p-2 text-xs text-gray-600 border-b">
                Select a response to add as a new flow:
              </div>
              {pairs.filter(pair => pair.assistantTexts.length > 0).map((pair, index) => (
                <button
                  key={index}
                  onClick={() => addRowWithResponse(pair)}
                  className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {pair.userText.slice(0, 60)}...
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pair.assistantTexts.length} response{pair.assistantTexts.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Optional note for teammates</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why is this chat relevant?"
          className="min-h-[80px] text-sm w-full rounded border p-2"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleConfirm}>
          Add to minutes
        </Button>
      </div>
    </div>
  );
}
