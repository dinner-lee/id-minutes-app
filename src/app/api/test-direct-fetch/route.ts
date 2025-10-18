export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing direct fetch to: ${url}`);

    // Test 1: Basic fetch
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      const html = await response.text();
      
      return NextResponse.json({
        ok: true,
        method: "basic_fetch",
        status: response.status,
        statusText: response.statusText,
        contentLength: html.length,
        contentType: response.headers.get('content-type'),
        isHtml: html.includes('<html') || html.includes('<!DOCTYPE'),
        containsChatGPT: html.toLowerCase().includes('chatgpt'),
        containsMessages: html.toLowerCase().includes('message'),
        containsNextData: html.includes('__NEXT_DATA__'),
        htmlPreview: html.substring(0, 2000),
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
    } catch (e) {
      return NextResponse.json({
        ok: false,
        error: e?.message || "Basic fetch failed",
        stack: e?.stack
      });
    }

  } catch (e: any) {
    console.error("Direct test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
