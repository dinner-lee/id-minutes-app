export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing conversation extraction from basic fetch for: ${url}`);

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
    
    // Look for conversation data in various ways
    const results = {
      htmlLength: html.length,
      title: $('title').text(),
      
      // Look for script tags with conversation data
      scriptTags: $('script').length,
      nextDataScript: $('script#__NEXT_DATA__').length,
      
      // Look for message-related elements
      messageElements: $('[data-message-author-role]').length,
      conversationElements: $('[class*="conversation"]').length,
      turnElements: $('[class*="turn"]').length,
      chatElements: $('[class*="chat"]').length,
      
      // Look for specific text patterns
      containsMessages: html.toLowerCase().includes('message'),
      containsConversation: html.toLowerCase().includes('conversation'),
      containsTurn: html.toLowerCase().includes('turn'),
      
      // Extract any potential conversation data
      potentialMessages: [] as string[],
      scriptContents: [] as string[]
    };

    // Look for script tags that might contain conversation data
    $('script').each((i, el) => {
      const scriptText = $(el).text();
      if (scriptText.length > 100) {
        results.scriptContents.push(scriptText.substring(0, 200));
        
        // Look for patterns that might indicate conversation data
        if (scriptText.includes('message') || scriptText.includes('conversation') || scriptText.includes('turn')) {
          results.potentialMessages.push(scriptText.substring(0, 500));
        }
      }
    });

    // Look for any elements that might contain conversation text
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && text.length < 1000) {
        // Check if this looks like a conversation message
        if (text.includes('?') || text.includes('안녕') || text.includes('질문') || text.includes('도움')) {
          results.potentialMessages.push(text);
        }
      }
    });

    return NextResponse.json({
      ok: true,
      results: results
    });

  } catch (e: any) {
    console.error("Extraction test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed"
    }, { status: 400 });
  }
}
