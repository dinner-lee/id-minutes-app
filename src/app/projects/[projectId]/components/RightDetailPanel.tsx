"use client";

import { useEffect, useState } from "react";
import { usePanelStore } from "./panelStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";

export default function RightDetailPanel() {
  const { selected, clear } = usePanelStore();
  const [blockData, setBlockData] = useState<any>(null);
  const [conversationModal, setConversationModal] = useState<{
    isOpen: boolean;
    flow: any;
    flowIndex: number;
    pairs: any[];
  }>({
    isOpen: false,
    flow: null,
    flowIndex: -1,
    pairs: [],
  });

  useEffect(() => {
    const handleAttachmentDetail = async (event: CustomEvent) => {
      const { blockId } = event.detail;
      try {
        const res = await fetch(`/api/blocks/${blockId}`);
        const data = await res.json();
        if (res.ok && data?.block) {
          setBlockData(data.block);
        } else {
          console.error("Failed to fetch block data:", data?.error);
        }
      } catch (e) {
        console.error("Error fetching block data:", e);
      }
    };

    window.addEventListener("attachment:detail", handleAttachmentDetail as unknown as EventListener);
    return () => {
      window.removeEventListener("attachment:detail", handleAttachmentDetail as unknown as EventListener);
    };
  }, []);

  const displayData = selected || blockData;

  const openConversationModal = (flow: any, flowIndex: number, pairs: any[]) => {
    setConversationModal({
      isOpen: true,
      flow,
      flowIndex,
      pairs,
    });
  };

  const closeConversationModal = () => {
    setConversationModal({
      isOpen: false,
      flow: null,
      flowIndex: -1,
      pairs: [],
    });
  };

  if (!displayData) {
    return (
      <div className="h-full p-4 text-sm text-muted-foreground">
        Select a block's "Details" to see more here.
      </div>
    );
  }

  const createdAt =
    displayData.createdAt ? new Date(displayData.createdAt).toLocaleString() : undefined;
  const updatedAt =
    displayData.updatedAt ? new Date(displayData.updatedAt).toLocaleString() : undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{displayData.title || "Details"}</h3>
          <Button variant="ghost" size="sm" onClick={() => {
            clear();
            setBlockData(null);
          }}>
            Close
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{displayData.type}</Badge>
          {displayData.providerTag ? <Badge variant="outline">{displayData.providerTag}</Badge> : null}
          {displayData.purpose ? <Badge>{displayData.purpose}</Badge> : null}
          {displayData.isRemix ? <Badge variant="destructive">Remixed</Badge> : null}
        </div>
        
        {/* Block creator attribution */}
        {displayData.createdBy && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
              {displayData.createdBy.name ? displayData.createdBy.name.charAt(0).toUpperCase() : "?"}
            </div>
            <span className="text-xs text-muted-foreground">
              Added by {displayData.createdBy.name || displayData.createdBy.email || "Unknown user"}
            </span>
          </div>
        )}
        
        {(createdAt || updatedAt) && (
          <p className="text-xs text-muted-foreground mt-1">
            {createdAt ? `Created ${createdAt}` : ""}{" "}
            {updatedAt ? `· Updated ${updatedAt}` : ""}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {displayData.type === "WEBSITE" && (
          <WebsiteDetails url={displayData.url} notes={displayData.chat?.notes} thumbnail={displayData.thumbnailUrl} />
        )}

        {displayData.type === "FILE" && (
          <FileDetails file={displayData.file} notes={displayData.chat?.notes} />
        )}

        {displayData.type === "CHATGPT" && (
          <ChatGPTDetails 
            notes={displayData.chat?.notes} 
            flows={displayData.chat?.flows}
            pairs={displayData.chat?.raw?.pairs || []}
            onViewConversation={openConversationModal}
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t flex items-center justify-end gap-2">
        {displayData.type === "CHATGPT" && displayData.url && (
          <Button
            onClick={() => {
              // Open the ChatGPT shared link in a new tab
              window.open(displayData.url, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Continue chat
          </Button>
        )}
      </div>

      {/* Conversation Modal */}
      <ConversationModal
        isOpen={conversationModal.isOpen}
        onClose={closeConversationModal}
        flow={conversationModal.flow}
        flowIndex={conversationModal.flowIndex}
        pairs={conversationModal.pairs}
      />
    </div>
  );
}

function WebsiteDetails({
  url,
  notes,
  thumbnail,
}: {
  url?: string | null;
  notes?: string | null;
  thumbnail?: string | null;
}) {
  return (
    <div>
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="thumbnail" className="rounded-md border mb-3 w-full" />
      ) : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          Open website <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
      {url && notes ? <Separator className="my-3" /> : null}
      {notes ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p> : null}
    </div>
  );
}

function FileDetails({
  file,
  notes,
}: {
  file?: { filename?: string; mimeType?: string; size?: number; key?: string } | null;
  notes?: string | null;
}) {
  return (
    <div>
      {file ? (
        <div className="text-sm">
          <div className="font-medium">{file.filename}</div>
          <div className="text-muted-foreground">
            {file.mimeType} · {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "—"}
          </div>
          {/* TODO: add signed download link once you wire S3 */}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No file metadata.</div>
      )}
      {notes ? (
        <>
          <Separator className="my-3" />
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
        </>
      ) : null}
    </div>
  );
}

function ChatGPTDetails({
  notes,
  flows,
  pairs,
  onViewConversation,
}: {
  notes?: string | null;
  flows?: any;
  pairs?: any[];
  onViewConversation?: (flow: any, flowIndex: number, pairs: any[]) => void;
}) {
  const [expandedFlows, setExpandedFlows] = useState<Set<number>>(new Set());

  // Helper to render markdown bold in text and normalize line breaks
  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;
    
    // First normalize line breaks
    const normalized = text.replace(/\n{3,}/g, '\n\n');
    
    // Split by line breaks to preserve them
    const lines = normalized.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      // Process markdown bold in this line
      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        
        // Add bold text
        parts.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-semibold">
            {match[1]}
          </strong>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      // Add the processed line
      result.push(
        <span key={lineIdx}>
          {parts.length > 0 ? parts : line}
        </span>
      );
      
      // Add line break except for last line
      if (lineIdx < lines.length - 1) {
        result.push('\n');
      }
    });
    
    return result.length > 0 ? result : normalized;
  };
  
  // Calculate total turns across all flows
  const totalTurns = Array.isArray(flows) 
    ? flows.reduce((sum, flow) => sum + ((flow?.endPair || 0) - (flow?.startPair || 0) + 1), 0)
    : 0;

  // Get one most frequent category
  const categoryFrequency: Record<string, number> = {};
  if (Array.isArray(flows)) {
    flows.forEach((flow) => {
      if (flow?.category) {
        categoryFrequency[flow.category] = (categoryFrequency[flow.category] || 0) + 1;
      }
    });
  }
  const sortedCategories = Object.entries(categoryFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 1)
    .map(([category]) => category);

  const toggleFlow = (index: number) => {
    setExpandedFlows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Helper to shorten category names for display
  const shortenCategory = (category: string): string => {
    if (category.length <= 15) return category;
    // Try to truncate smartly
    const words = category.split(' ');
    if (words.length > 1) {
      return words.slice(0, 2).join(' ') + '...';
    }
    return category.slice(0, 15) + '...';
  };

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      {Array.isArray(flows) && flows.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
          <div className="flex gap-3">
            <div className="w-[30%]">
              <div className="text-xs text-gray-500 mb-1">Total Turns</div>
              <div className="text-lg font-semibold text-gray-900">{totalTurns}</div>
            </div>
            <div className="w-[70%]">
              <div className="text-xs text-gray-500 mb-1">Top Category</div>
              <div className="flex flex-col gap-1">
                {sortedCategories.length > 0 ? (
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {sortedCategories[0]}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {Array.isArray(flows) && flows.length > 0 ? (
        <div className="space-y-2">
          {flows.map((f: any, idx: number) => {
            const conversationTurns = (f?.endPair || 0) - (f?.startPair || 0) + 1;
            const isExpanded = expandedFlows.has(idx);
            
            // Get conversation pairs for this flow
            const flowPairs = f?.turnPairs || [];
            
            return (
              <div key={idx} className="border rounded-lg bg-white">
                {/* Header: Badges + Title + Chevron */}
                <button
                  onClick={() => toggleFlow(idx)}
                  className="w-full text-left p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  {/* Flow number badge */}
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium shrink-0">
                    {idx + 1}
                  </span>
                  
                  {/* Category badge */}
                  <span className="text-xs rounded-full border px-2 py-0.5 bg-white text-gray-700 shrink-0">
                    {shortenCategory(f?.category ?? "Flow")}
                  </span>
                  
                  {/* Title */}
                  <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                    {f?.title || "Untitled flow"}
                  </span>
                  
                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                </button>
                
                {/* Metadata underneath */}
                <div className="px-3 pb-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{conversationTurns} turns</span>
                  {f?.addedBy && (
                    <>
                      <span>•</span>
                      <span>{f.addedBy}</span>
                    </>
                  )}
                </div>
                
                {/* Expanded content: Original conversation pairs */}
                {isExpanded && flowPairs.length > 0 && (
                  <div className="border-t p-3 space-y-4 bg-gray-50">
                    {flowPairs.map((pair: any, turnIdx: number) => (
                      <div key={turnIdx} className="space-y-2">
                        {/* User message */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-800">
                              U
                            </div>
                            <span className="text-xs font-medium text-blue-800">User</span>
                          </div>
                          <div className="text-sm text-blue-900 whitespace-pre-wrap">
                            {pair.userText || "User request"}
                          </div>
                        </div>
                        
                        {/* Assistant responses */}
                        {pair.assistantTexts?.map((response: string, respIdx: number) => (
                          <div key={respIdx} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-800">
                                A
                              </div>
                              <span className="text-xs font-medium text-gray-800">Assistant</span>
                            </div>
                            <div className="text-sm text-gray-900 whitespace-pre-wrap">
                              {renderMarkdown(response)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No flows parsed yet.</p>
      )}

      {notes ? (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-1">Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ConversationModal({
  isOpen,
  onClose,
  flow,
  flowIndex,
  pairs,
}: {
  isOpen: boolean;
  onClose: () => void;
  flow: any;
  flowIndex: number;
  pairs: any[];
}) {
  if (!isOpen || !flow) return null;

  // Extract conversation pairs for this specific flow from the raw data
  const flowPairs = pairs.slice(flow.startPair, flow.endPair + 1);
  
  // Debug: Log the flow data to see what's available
  console.log("Flow data for conversation modal:", flow);
  console.log("Raw pairs data:", pairs);
  console.log("Flow pairs:", flowPairs);
  console.log("Flow startPair:", flow.startPair, "endPair:", flow.endPair);
  console.log("Total pairs length:", pairs.length);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                {flowIndex + 1}
              </div>
              <DialogTitle className="text-lg font-semibold">
                {flow.category || "Conversation Flow"}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 pb-6">
            {flowPairs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No conversation pairs found for this flow.</p>
                <p className="text-sm mt-2">Flow range: {flow.startPair} - {flow.endPair}</p>
                <p className="text-sm">Total pairs: {pairs.length}</p>
                <p className="text-sm">Flow pairs length: {flowPairs.length}</p>
                {/* Fallback: show all pairs if slicing failed */}
                {pairs.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Showing all available pairs:</p>
                    {pairs.map((pair: any, idx: number) => (
                      <div key={idx} className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <div><strong>Pair {idx}:</strong> {pair.userText?.slice(0, 50)}...</div>
                        <div><strong>Category:</strong> {pair.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              flowPairs.map((pair: any, pairIdx: number) => (
                <div key={pairIdx} className="space-y-3">
                  {/* Turn number */}
                  <div className="flex items-center justify-center">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
                      Turn {flow.startPair + pairIdx + 1}
                    </div>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>
                  
                  {/* User Request */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-800">
                        U
                      </div>
                      <span className="text-sm font-medium text-blue-800">User Request</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {pair.category || flow.category}
                      </span>
                    </div>
                    <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                      {pair.userText || "User request text not available"}
                    </div>
                  </div>
                  
                  {/* Assistant Response(s) */}
                  {pair.assistantTexts && pair.assistantTexts.length > 0 ? (
                    pair.assistantTexts.map((response: string, respIdx: number) => (
                      <div key={respIdx} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-800">
                            A
                          </div>
                          <span className="text-sm font-medium text-gray-800">Assistant Response</span>
                          {pair.addedBy && (
                            <span className="text-xs text-gray-500">
                              Added by {pair.addedBy}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                          {response}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-800">
                          A
                        </div>
                        <span className="text-sm font-medium text-gray-800">Assistant Response</span>
                      </div>
                      <div className="text-sm text-gray-500 italic">
                        {flow.assistantPreview || "No response available"}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Show flow metadata */}
            <div className="bg-gray-50 border rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Flow Information</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Category: {flow.category}</div>
                <div>Pairs: {flow.startPair + 1}–{flow.endPair + 1}</div>
                {flow.userIndices?.length ? (
                  <div>User turns: [{flow.userIndices.join(", ")}]</div>
                ) : null}
                {flow.addedBy ? (
                  <div>Added by: {flow.addedBy}</div>
                ) : null}
                {flow.addedAt ? (
                  <div>Added: {new Date(flow.addedAt).toLocaleDateString()}</div>
                ) : null}
              </div>
            </div>
            
            {/* Note about full conversation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> This shows the assistant's response preview for this flow. 
                The full conversation with user requests is not currently stored in the database.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
