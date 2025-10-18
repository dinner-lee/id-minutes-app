export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://chrome.browserless.io';
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    
    if (!BROWSERLESS_TOKEN) {
      return NextResponse.json({ error: "BROWSERLESS_TOKEN not set" }, { status: 500 });
    }

    console.log(`Testing Browserless.io API with detailed error reporting`);
    console.log(`Using endpoint: ${BROWSERLESS_URL}`);
    console.log(`Token: ${BROWSERLESS_TOKEN.substring(0, 10)}...`);

    // Test with a simple website first
    const testUrl = "https://httpbin.org/html";
    
    // Test 1: Unblock endpoint
    console.log("Test 1: Testing unblock endpoint...");
    try {
      const response = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testUrl,
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
    console.error("Detailed test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
