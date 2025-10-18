export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Comparing HTML content from different methods for: ${url}`);

    // Method 1: Basic fetch
    console.log("Method 1: Basic fetch...");
    let basicHtml = "";
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      basicHtml = await response.text();
    } catch (e) {
      console.error("Basic fetch failed:", e);
    }

    // Method 2: Browserless.io
    console.log("Method 2: Browserless.io...");
    let browserlessHtml = "";
    try {
      const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
      const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
      
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

      if (response.ok) {
        const responseData = await response.json();
        browserlessHtml = responseData.content || responseData.html || responseData;
      }
    } catch (e) {
      console.error("Browserless.io failed:", e);
    }

    return NextResponse.json({
      ok: true,
      comparison: {
        basicFetch: {
          length: basicHtml.length,
          containsChatGPT: basicHtml.toLowerCase().includes('chatgpt'),
          containsMessages: basicHtml.toLowerCase().includes('message'),
          containsNextData: basicHtml.includes('__NEXT_DATA__'),
          preview: basicHtml.substring(0, 500)
        },
        browserless: {
          length: browserlessHtml.length,
          containsChatGPT: browserlessHtml.toLowerCase().includes('chatgpt'),
          containsMessages: browserlessHtml.toLowerCase().includes('message'),
          containsNextData: browserlessHtml.includes('__NEXT_DATA__'),
          preview: browserlessHtml.substring(0, 500)
        }
      }
    });

  } catch (e: any) {
    console.error("Comparison test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed"
    }, { status: 400 });
  }
}
