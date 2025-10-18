export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Searching for conversation data in HTML for: ${url}`);

    // Get HTML using basic fetch
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
    
    const results = {
      htmlLength: html.length,
      title: $('title').text(),
      
      // Look for various data patterns
      jsonLd: [] as any[],
      metaTags: [] as string[],
      scriptData: [] as string[],
      
      // Look for conversation-related content
      conversationText: [] as string[],
      messageText: [] as string[],
      
      // Look for specific ChatGPT patterns
      chatgptPatterns: [] as string[]
    };

    // Look for JSON-LD structured data
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).text());
        results.jsonLd.push(jsonData);
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    // Look for meta tags that might contain conversation data
    $('meta').each((i, el) => {
      const content = $(el).attr('content');
      const name = $(el).attr('name') || $(el).attr('property');
      if (content && content.length > 10) {
        results.metaTags.push(`${name}: ${content}`);
      }
    });

    // Look for script tags with potential conversation data
    $('script').each((i, el) => {
      const scriptText = $(el).text();
      if (scriptText.length > 100) {
        // Look for patterns that might indicate conversation data
        if (scriptText.includes('conversation') || 
            scriptText.includes('message') || 
            scriptText.includes('turn') ||
            scriptText.includes('user') ||
            scriptText.includes('assistant') ||
            scriptText.includes('철학') ||
            scriptText.includes('동아리')) {
          results.scriptData.push(scriptText.substring(0, 300));
        }
      }
    });

    // Look for any text content that might be conversation
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 1000) {
        // Check if this looks like conversation content
        if (text.includes('?') || 
            text.includes('안녕') || 
            text.includes('질문') || 
            text.includes('도움') ||
            text.includes('철학') ||
            text.includes('동아리') ||
            text.includes('시작') ||
            text.includes('Hello') ||
            text.includes('help') ||
            text.includes('question') ||
            text.includes('philosophy') ||
            text.includes('club')) {
          results.conversationText.push(text);
        }
      }
    });

    // Look for specific ChatGPT conversation patterns
    const conversationRegex = /(?:conversation|message|turn|chat).*?(?:user|assistant|human|ai).*?/gi;
    const matches = html.match(conversationRegex);
    if (matches) {
      results.chatgptPatterns = matches.slice(0, 10);
    }

    return NextResponse.json({
      ok: true,
      results: results
    });

  } catch (e: any) {
    console.error("Conversation search failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed"
    }, { status: 400 });
  }
}
