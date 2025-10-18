"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import ChatGPTFlowReview from "./ChatGPTFlowReview";

/* ------------------------- helpers ------------------------- */

function isChatGPTShare(url: string) {
  try {
    const u = new URL(url.trim());
    return (
      (u.hostname.includes("chatgpt.com") && u.pathname.startsWith("/share")) ||
      u.hostname === "share.gpt" ||
      u.hostname === "shareg.pt"
    );
  } catch {
    return false;
  }
}

function safeParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* ------------------------- component ------------------------- */

export default function EmbedModal({
  open,
  onOpenChange,
  minuteId,
  onAdded,        // optional (if you still refresh any external lists)
  onCreated,      // returns the created block so the editor can insert an inline card
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  minuteId: string;
  onAdded?: () => void;
  onCreated?: (block: any) => void;
}) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  // ChatGPT preview state (segments before final add)
  const [cgptPreview, setCgptPreview] = useState<null | {
    title: string;
    segments: any[];
    addedByName: string;
    pairs: Array<{ userText: string; assistantTexts: string[] }>;
  }>(null);

  // Manual transcript fallback (when share page can’t be scraped)
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    if (!open) {
      setUrl("");
      setFile(null);
      setNote("");
      setCgptPreview(null);
      setShowManual(false);
      setManualText("");
      setLoading(false);
    }
  }, [open]);

  /* ------------------------- actions ------------------------- */

  // Primary action for link/file input row
  async function handlePrimary() {
    // 1) File upload
    if (file) {
      try {
        setLoading(true);
        const fd = new FormData();
        fd.append("file", file);
        if (note) fd.append("notes", note);
        const res = await fetch(`/api/minutes/${minuteId}/blocks/upload`, { method: "POST", body: fd });
        const text = await res.text();
        setLoading(false);
        if (!res.ok) return alert(text || "Upload failed");
        const data = safeParseJSON(text);
        onCreated?.(data?.block);
        onAdded?.();
        onOpenChange(false);
      } catch (e: any) {
        setLoading(false);
        console.error(e);
        alert(e?.message || "Upload failed");
      }
      return;
    }

    // 2) No URL? Nothing to do.
    if (!url) return;

    // 3) ChatGPT share link → preview (or manual fallback)
    if (isChatGPTShare(url)) {
      try {
        setLoading(true);
        const res = await fetch(`/api/minutes/${minuteId}/blocks/link/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const text = await res.text();
        const data = safeParseJSON(text);

        if (res.ok && data?.ok) {
          setCgptPreview({
            title: data.title || "ChatGPT Conversation",
            segments: data.segments || [],
            addedByName: data.addedByName || "You",
            pairs: data.pairs || [],
          });
        } else if (data?.needsManual || res.status === 422) {
          // Graceful: switch to manual paste UI
          setShowManual(true);
        } else {
          throw new Error(data?.error || text || "Preview failed");
        }
      } catch (e: any) {
        console.error(e);
        // As a fallback, allow manual
        setShowManual(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 4) Website link → save immediately
    try {
      setLoading(true);
      const res = await fetch(`/api/minutes/${minuteId}/blocks/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, notes: note || undefined }),
      });
      const text = await res.text();
      setLoading(false);
      if (!res.ok) return alert(text || "Failed to attach link");
      const data = safeParseJSON(text);
      onCreated?.(data?.block);
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to attach link");
    }
  }

  // Manual transcript → analyze to segments
  async function handleManualAnalyze() {
    if (!manualText.trim()) {
      alert("Paste the transcript first.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/minutes/${minuteId}/blocks/link/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualTranscript: manualText }),
      });
      const text = await res.text();
      const data = safeParseJSON(text);
      setLoading(false);

      if (!res.ok || !data?.ok) {
        return alert(data?.error || text || "Manual analysis failed");
      }

      setCgptPreview({
        title: data.title || "ChatGPT Conversation",
        segments: data.segments || [],
        addedByName: data.addedByName || "You",
        pairs: data.pairs || [],
      });
      setShowManual(false);
    } catch (e: any) {
      setLoading(false);
      console.error(e);
      alert(e?.message || "Manual analysis failed");
    }
  }

  /* ------------------------- render ------------------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Attach to minutes</DialogTitle>
        </DialogHeader>

        {/* 1) ChatGPT flow review (after preview) */}
        {cgptPreview ? (
          <ChatGPTFlowReview
            title={cgptPreview.title}
            segments={cgptPreview.segments}
            addedByName={cgptPreview.addedByName}
            pairs={cgptPreview.pairs}
            onCancel={() => setCgptPreview(null)}
            onConfirm={async ({ title, notes, segments }) => {
              // Save ChatGPT block, sending finalized segments
              const res = await fetch(`/api/minutes/${minuteId}/blocks/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: url || "manual://pasted-chat",
                  notes,
                  titleOverride: title,
                  flowsOverride: segments, // server: store as your chat/segments JSON
                }),
              });
              const text = await res.text();
              if (!res.ok) return alert(text || "Failed to add ChatGPT conversation");
              const data = safeParseJSON(text);
              onCreated?.(data?.block);
              onAdded?.();
              onOpenChange(false);
            }}
          />
        ) : /* 2) Manual transcript fallback UI */ showManual ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Couldn’t read the ChatGPT share page. Paste the transcript below
              (예: <span className="font-medium">나의 말:</span>,{" "}
              <span className="font-medium">ChatGPT의 말:</span> 라벨 포함), then click{" "}
              <span className="font-medium">Analyze transcript</span>.
            </p>
            <textarea
              className="w-full border rounded p-2 text-sm min-h-[220px]"
              placeholder={"나의 말: ...\nChatGPT의 말: ...\n\n나의 말: ...\nChatGPT의 말: ..."}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={() => setShowManual(false)}>
                Back
              </Button>
              <Button onClick={handleManualAnalyze} disabled={loading}>
                {loading ? "Analyzing…" : "Analyze transcript"}
              </Button>
            </div>
          </>
        ) : (
          /* 3) Default link/file UI */
          <>
            <p className="text-sm text-muted-foreground">
              Paste a link (ChatGPT share or any website), or upload a file.
            </p>

            {/* Link row */}
            <div className="flex gap-2">
              <Input
                placeholder="https://… (ChatGPT share link or website)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button onClick={handlePrimary} disabled={loading}>
                {loading ? "Loading…" : "Add"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Trouble with a ChatGPT link?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setShowManual(true)}
              >
                Paste transcript instead
              </button>
            </div>

            {/* Optional note for website/file */}
            <div className="mt-2">
              <Input
                placeholder="Optional note (why this is relevant)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            {/* File upload */}
            <div className="border-dashed border rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Drag & drop a file, or click to select.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
