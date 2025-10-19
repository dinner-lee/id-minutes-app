export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isChatGPTShare } from "@/lib/chatgpt-ingest";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const debugInfo = {
      // Environment info
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL === '1',
        region: process.env.VERCEL_REGION,
        functionRegion: process.env.VERCEL_FUNCTION_REGION,
        chromiumAvailable: false,
        puppeteerAvailable: false,
      },
      
      // URL validation
      url: {
        provided: url,
        isValidChatGPTShare: isChatGPTShare(url),
        parsed: (() => {
          try {
            const u = new URL(url);
            return {
              hostname: u.hostname,
              pathname: u.pathname,
              protocol: u.protocol
            };
          } catch {
            return null;
          }
        })()
      },
      
      // Dependencies check
      dependencies: {
        chromium: false,
        puppeteer: false,
        cheerio: false
      },
      
      // Test results
      tests: {
        basicFetch: null,
        puppeteerLaunch: null,
        cheerioParse: null
      }
    };

    // Test Chromium availability
    try {
      const chromium = await import('@sparticuz/chromium');
      const executablePath = await chromium.executablePath();
      debugInfo.environment.chromiumAvailable = !!executablePath;
      debugInfo.dependencies.chromium = true;
    } catch (e) {
      debugInfo.environment.chromiumAvailable = false;
      debugInfo.dependencies.chromium = false;
    }

    // Test Puppeteer availability
    try {
      const puppeteer = await import('puppeteer');
      debugInfo.dependencies.puppeteer = true;
    } catch (e) {
      debugInfo.dependencies.puppeteer = false;
    }

    // Test Cheerio availability
    try {
      const cheerio = await import('cheerio');
      debugInfo.dependencies.cheerio = true;
    } catch (e) {
      debugInfo.dependencies.cheerio = false;
    }

    // Test basic fetch
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      debugInfo.tests.basicFetch = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      };
    } catch (e: any) {
      debugInfo.tests.basicFetch = {
        success: false,
        error: e.message
      };
    }

    // Test Puppeteer launch (if available)
    if (debugInfo.dependencies.puppeteer && debugInfo.dependencies.chromium) {
      try {
        const puppeteer = await import('puppeteer');
        const chromium = await import('@sparticuz/chromium-min');
        
        const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
        
        await browser.close();
        
        debugInfo.tests.puppeteerLaunch = {
          success: true,
          message: "Puppeteer launched successfully"
        };
      } catch (e: any) {
        debugInfo.tests.puppeteerLaunch = {
          success: false,
          error: e.message
        };
      }
    }

    // Test Cheerio parsing (if basic fetch worked)
    if (debugInfo.tests.basicFetch?.success && debugInfo.dependencies.cheerio) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });
        
        const html = await response.text();
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);
        
        const nextDataScript = $('script#__NEXT_DATA__');
        const hasNextData = nextDataScript.length > 0;
        
        debugInfo.tests.cheerioParse = {
          success: true,
          htmlLength: html.length,
          hasNextData,
          title: $('title').text(),
          message: "Cheerio parsing successful"
        };
      } catch (e: any) {
        debugInfo.tests.cheerioParse = {
          success: false,
          error: e.message
        };
      }
    }

    return NextResponse.json({
      ok: true,
      debug: debugInfo,
      recommendations: generateRecommendations(debugInfo)
    });

  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Debug failed",
      stack: e?.stack
    }, { status: 400 });
  }
}

function generateRecommendations(debugInfo: any): string[] {
  const recommendations = [];
  
  if (!debugInfo.dependencies.chromium) {
    recommendations.push("Chromium dependency is missing - check @sparticuz/chromium installation");
  }
  
  if (!debugInfo.dependencies.puppeteer) {
    recommendations.push("Puppeteer dependency is missing - check puppeteer installation");
  }
  
  if (!debugInfo.dependencies.cheerio) {
    recommendations.push("Cheerio dependency is missing - check cheerio installation");
  }
  
  if (!debugInfo.tests.basicFetch?.success) {
    recommendations.push("Basic fetch failed - check network connectivity and URL accessibility");
  }
  
  if (!debugInfo.tests.puppeteerLaunch?.success) {
    recommendations.push("Puppeteer launch failed - check Vercel memory limits and Chromium configuration");
  }
  
  if (!debugInfo.tests.cheerioParse?.success) {
    recommendations.push("Cheerio parsing failed - check HTML content and parsing logic");
  }
  
  if (debugInfo.environment.vercel) {
    recommendations.push("Running on Vercel - consider using Pro plan for higher memory limits");
    recommendations.push("Consider implementing request queuing to avoid concurrent Puppeteer instances");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("All tests passed - the issue may be with specific ChatGPT URLs or bot detection");
  }
  
  return recommendations;
}
