export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchChatGPTShareBrowserless, debugChatGPTShareBrowserless } from "@/lib/chatgpt-ingest";

export async function POST(req: NextRequest) {
  try {
    const { url, debug = false } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing ChatGPT parsing for URL: ${url}`);
    
    if (debug) {
      // Use debug function for detailed analysis
      const debugInfo = await debugChatGPTShareBrowserless(url);
      
      return NextResponse.json({
        ok: true,
        mode: "debug",
        title: debugInfo.title,
        patterns: debugInfo.patterns,
        foundElements: debugInfo.foundElements,
        messages: debugInfo.messages,
        nextDataKeys: debugInfo.nextData ? Object.keys(debugInfo.nextData) : [],
        htmlLength: debugInfo.html.length,
        htmlPreview: debugInfo.html.substring(0, 1000)
      });
    } else {
      // Use main parsing function
      const result = await fetchChatGPTShareBrowserless(url);
      
      return NextResponse.json({
        ok: true,
        mode: "parse",
        title: result.title,
        messageCount: result.messages.length,
        messages: result.messages.slice(0, 5), // First 5 messages for preview
        allMessages: result.messages
      });
    }
  } catch (e: any) {
    console.error("Test parsing failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test parsing failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
