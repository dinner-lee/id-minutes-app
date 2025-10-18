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

    console.log(`Testing Browserless.io API with URL: ${url}`);
    console.log(`Using endpoint: ${BROWSERLESS_URL}`);
    console.log(`Token: ${BROWSERLESS_TOKEN.substring(0, 10)}...`);

    // Test 1: Simple content endpoint
    console.log("Test 1: Testing simple content endpoint...");
    try {
      const response1 = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
      });

      console.log(`Response 1 status: ${response1.status}`);
      console.log(`Response 1 headers:`, Object.fromEntries(response1.headers.entries()));
      
      const text1 = await response1.text();
      console.log(`Response 1 content length: ${text1.length}`);
      console.log(`Response 1 first 500 chars:`, text1.substring(0, 500));

      if (response1.ok) {
        return NextResponse.json({
          ok: true,
          method: "content",
          status: response1.status,
          contentLength: text1.length,
          contentPreview: text1.substring(0, 1000),
          isHtml: text1.includes('<html') || text1.includes('<!DOCTYPE'),
          containsChatGPT: text1.toLowerCase().includes('chatgpt'),
          containsMessages: text1.toLowerCase().includes('message')
        });
      }
    } catch (e) {
      console.error("Test 1 failed:", e);
    }

    // Test 2: Unblock endpoint
    console.log("Test 2: Testing unblock endpoint...");
    try {
      const response2 = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
      });

      console.log(`Response 2 status: ${response2.status}`);
      console.log(`Response 2 headers:`, Object.fromEntries(response2.headers.entries()));
      
      const text2 = await response2.text();
      console.log(`Response 2 content length: ${text2.length}`);
      console.log(`Response 2 first 500 chars:`, text2.substring(0, 500));

      if (response2.ok) {
        return NextResponse.json({
          ok: true,
          method: "unblock",
          status: response2.status,
          contentLength: text2.length,
          contentPreview: text2.substring(0, 1000),
          isHtml: text2.includes('<html') || text2.includes('<!DOCTYPE'),
          containsChatGPT: text2.toLowerCase().includes('chatgpt'),
          containsMessages: text2.toLowerCase().includes('message')
        });
      }
    } catch (e) {
      console.error("Test 2 failed:", e);
    }

    // Test 3: Screenshot endpoint (to verify the page loads)
    console.log("Test 3: Testing screenshot endpoint...");
    try {
      const response3 = await fetch(`${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
      });

      console.log(`Response 3 status: ${response3.status}`);
      
      if (response3.ok) {
        const buffer = await response3.arrayBuffer();
        return NextResponse.json({
          ok: true,
          method: "screenshot",
          status: response3.status,
          screenshotSize: buffer.byteLength,
          message: "Screenshot captured successfully - page loads but content might be blocked"
        });
      }
    } catch (e) {
      console.error("Test 3 failed:", e);
    }

    return NextResponse.json({
      ok: false,
      error: "All Browserless.io tests failed",
      tests: ["content", "unblock", "screenshot"]
    });

  } catch (e: any) {
    console.error("Browserless.io test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
