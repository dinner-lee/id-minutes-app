export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing practical ChatGPT parsing for: ${url}`);

    // Get HTML using basic fetch (the method that works)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://chatgpt.com/',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    console.log(`Received HTML: ${html.length} characters`);
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    
    // Extract available information
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || 'Shared Chat';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const url_meta = $('meta[property="og:url"]').attr('content') || url;
    
    // Check if this is a valid ChatGPT share page
    const isChatGPTShare = html.includes('chatgpt') && html.includes('share');
    
    if (!isChatGPTShare) {
      return NextResponse.json({
        ok: false,
        error: "This doesn't appear to be a ChatGPT share URL",
        extracted: {
          title,
          description,
          url: url_meta,
          htmlLength: html.length
        }
      });
    }

    // Since ChatGPT loads content dynamically, we can't extract conversation data from static HTML
    // Return a structured response indicating manual input is needed
    return NextResponse.json({
      ok: true,
      mode: "manual_input_required",
      extracted: {
        title,
        description,
        url: url_meta,
        htmlLength: html.length
      },
      message: "ChatGPT conversations load dynamically with JavaScript. Please copy and paste the conversation content manually.",
      instructions: [
        "1. Open the ChatGPT share URL in your browser",
        "2. Copy the conversation text",
        "3. Paste it in the manual input field",
        "4. The system will parse and analyze the conversation"
      ]
    });

  } catch (e: any) {
    console.error("Practical parsing failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed"
    }, { status: 400 });
  }
}
