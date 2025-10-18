export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { analyzeConversationFlows, messagesToPairs } from "@/lib/chatgpt-ingest";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing user request classification for: ${url}`);

    // Import the Puppeteer function
    const { fetchChatGPTSharePuppeteer } = await import("@/lib/chatgpt-ingest");
    
    // Get the conversation data
    const raw = await fetchChatGPTSharePuppeteer(url);
    console.log(`Extracted ${raw.messages.length} messages`);
    
    // Convert messages to pairs
    const pairs = messagesToPairs(raw.messages);
    console.log(`Converted to ${pairs.length} pairs`);
    
    // Analyze conversation flows using OpenAI
    console.log("Analyzing conversation flows with OpenAI...");
    const segments = await analyzeConversationFlows(pairs);
    console.log(`Generated ${segments.length} segments`);
    
    // Display results
    const results = {
      title: raw.title,
      totalMessages: raw.messages.length,
      totalPairs: pairs.length,
      segments: segments.map((segment, index) => ({
        index,
        category: segment.category,
        startPair: segment.startPair,
        endPair: segment.endPair,
        userIndices: segment.userIndices,
        assistantPreview: segment.assistantPreview,
        pairCount: segment.endPair - segment.startPair + 1,
        userTexts: segment.userIndices.map(i => pairs[i]?.userText || "").filter(t => t),
        assistantTexts: segment.userIndices.map(i => pairs[i]?.assistantTexts || []).flat()
      })),
      categories: [
        "Information Seeking & Summarization",
        "Idea Generation / Brainstorming",
        "Idea Refinement / Elaboration",
        "Data & Content Analysis",
        "Learning & Conceptual Understanding",
        "Writing & Communication Assistance",
        "Problem Solving & Decision Support",
        "Automation & Technical Support",
        "Accuracy Verification & Source Checking"
      ]
    };

    return NextResponse.json({
      ok: true,
      results
    });

  } catch (e: any) {
    console.error("Classification test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Classification test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
