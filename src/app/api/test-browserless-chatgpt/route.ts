export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    
    if (!BROWSERLESS_TOKEN) {
      return NextResponse.json({ error: "BROWSERLESS_TOKEN not set" }, { status: 500 });
    }

    console.log(`Testing Browserless.io with ChatGPT URL: ${url}`);

    // Test 1: Unblock endpoint with ChatGPT URL
    console.log("Test 1: Testing unblock endpoint with ChatGPT URL...");
    try {
      const response = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}&proxy=residential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          browserWSEndpoint: false,
          cookies: false,
          content: true,
          screenshot: false,
        })
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response statusText: ${response.statusText}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`Response content length: ${text.length}`);
      console.log(`Response content:`, text.substring(0, 1000));

      return NextResponse.json({
        ok: response.ok,
        method: "unblock",
        status: response.status,
        statusText: response.statusText,
        contentLength: text.length,
        contentPreview: text.substring(0, 1000),
        headers: Object.fromEntries(response.headers.entries()),
        isHtml: text.includes('<html') || text.includes('<!DOCTYPE'),
        containsChatGPT: text.toLowerCase().includes('chatgpt'),
        containsMessages: text.toLowerCase().includes('message'),
        containsNextData: text.includes('__NEXT_DATA__'),
        error: response.ok ? null : text
      });
    } catch (e) {
      console.error("Test 1 failed:", e);
      return NextResponse.json({
        ok: false,
        method: "unblock",
        error: e?.message || "Unknown error",
        stack: e?.stack
      });
    }

  } catch (e: any) {
    console.error("ChatGPT test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
