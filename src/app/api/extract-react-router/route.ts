export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Extracting conversation data from React Router stream for: ${url}`);

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
      
      // Extract React Router stream data
      reactRouterData: [] as string[],
      decodedData: [] as any[],
      
      // Look for conversation-related patterns
      conversationPatterns: [] as string[],
      messagePatterns: [] as string[],
      
      // Extract any readable text that might be conversation content
      readableText: [] as string[]
    };

    // Look for React Router stream controller enqueue calls
    $('script').each((i, el) => {
      const scriptText = $(el).text();
      
      // Find streamController.enqueue calls
      const enqueueMatches = scriptText.match(/window\.__reactRouterContext\.streamController\.enqueue\(["']([^"']+)["']\)/g);
      if (enqueueMatches) {
        enqueueMatches.forEach(match => {
          const dataMatch = match.match(/enqueue\(["']([^"']+)["']\)/);
          if (dataMatch) {
            const encodedData = dataMatch[1];
            results.reactRouterData.push(encodedData);
            
            // Try to decode the data
            try {
              // The data might be URL encoded or base64 encoded
              let decoded = encodedData;
              
              // Try URL decoding
              try {
                decoded = decodeURIComponent(encodedData);
              } catch (e) {
                // If URL decoding fails, try base64
                try {
                  decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
                } catch (e2) {
                  // Keep original if both fail
                }
              }
              
              results.decodedData.push({
                original: encodedData.substring(0, 100),
                decoded: decoded.substring(0, 500),
                length: decoded.length
              });
              
              // Look for conversation-related patterns in decoded data
              if (decoded.toLowerCase().includes('message') || 
                  decoded.toLowerCase().includes('conversation') ||
                  decoded.toLowerCase().includes('turn') ||
                  decoded.includes('user') ||
                  decoded.includes('assistant')) {
                results.conversationPatterns.push(decoded.substring(0, 200));
              }
              
            } catch (e) {
              console.log('Failed to decode data:', e);
            }
          }
        });
      }
    });

    // Look for any readable text in the HTML that might be conversation content
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 500) {
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
            text.includes('question')) {
          results.readableText.push(text);
        }
      }
    });

    return NextResponse.json({
      ok: true,
      results: results
    });

  } catch (e: any) {
    console.error("React Router extraction failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Test failed"
    }, { status: 400 });
  }
}
