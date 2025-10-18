export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { debugChatGPTShareBrowserless } from "@/lib/chatgpt-ingest";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const debugInfo = await debugChatGPTShareBrowserless(url);
    
    return NextResponse.json({
      ok: true,
      title: debugInfo.title,
      patterns: debugInfo.patterns,
      foundElements: debugInfo.foundElements,
      messages: debugInfo.messages,
      nextDataKeys: debugInfo.nextData ? Object.keys(debugInfo.nextData) : [],
      htmlLength: debugInfo.html.length,
      htmlPreview: debugInfo.html.substring(0, 1000)
    });
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Debug failed" 
    }, { status: 400 });
  }
}
