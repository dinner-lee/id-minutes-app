export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    
    if (!BROWSERLESS_TOKEN) {
      return NextResponse.json({ error: "BROWSERLESS_TOKEN not set" }, { status: 500 });
    }

    console.log(`Testing Browserless.io API with simple website`);
    console.log(`Using endpoint: ${BROWSERLESS_URL}`);
    console.log(`Token: ${BROWSERLESS_TOKEN.substring(0, 10)}...`);

    // Test with a simple website first
    const testUrl = "https://httpbin.org/html";
    
    // Test 1: Unblock endpoint
    console.log("Test 1: Testing unblock endpoint with simple website...");
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
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log(`Response content length: ${text.length}`);
      console.log(`Response first 500 chars:`, text.substring(0, 500));

      if (response.ok) {
        return NextResponse.json({
          ok: true,
          method: "unblock",
          status: response.status,
          contentLength: text.length,
          contentPreview: text.substring(0, 1000),
          isHtml: text.includes('<html') || text.includes('<!DOCTYPE'),
          message: "Browserless.io API is working!"
        });
      }
    } catch (e) {
      console.error("Test 1 failed:", e);
    }

    // Test 2: Content endpoint
    console.log("Test 2: Testing content endpoint with simple website...");
    try {
      const response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testUrl,
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
      });

      console.log(`Response status: ${response.status}`);
      
      const text = await response.text();
      console.log(`Response content length: ${text.length}`);

      if (response.ok) {
        return NextResponse.json({
          ok: true,
          method: "content",
          status: response.status,
          contentLength: text.length,
          contentPreview: text.substring(0, 1000),
          isHtml: text.includes('<html') || text.includes('<!DOCTYPE'),
          message: "Browserless.io content endpoint is working!"
        });
      }
    } catch (e) {
      console.error("Test 2 failed:", e);
    }

    return NextResponse.json({
      ok: false,
      error: "All Browserless.io tests failed",
      message: "Browserless.io API might not be working properly"
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
