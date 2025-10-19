export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test basic environment detection
    const environment = {
      isVercel: process.env.VERCEL === '1',
      nodeEnv: process.env.NODE_ENV,
      region: process.env.VERCEL_REGION,
      functionRegion: process.env.VERCEL_FUNCTION_REGION,
      memoryLimit: process.env.VERCEL_MEMORY_LIMIT,
    };

    // Test Chromium availability
    let chromiumTest = { available: false, error: null };
    try {
      const chromium = await import('@sparticuz/chromium');
      const executablePath = await chromium.executablePath();
      chromiumTest = { 
        available: !!executablePath, 
        executablePath: executablePath?.substring(0, 50) + '...' 
      };
    } catch (e: any) {
      chromiumTest = { available: false, error: e.message };
    }

    // Test Puppeteer availability
    let puppeteerTest = { available: false, error: null };
    try {
      const puppeteer = await import('puppeteer-core');
      puppeteerTest = { available: true };
    } catch (e: any) {
      puppeteerTest = { available: false, error: e.message };
    }

    // Test basic browser launch (if both available)
    let browserTest = { success: false, error: null, duration: 0 };
    if (chromiumTest.available && puppeteerTest.available) {
      try {
        const puppeteer = await import('puppeteer-core');
        const chromium = await import('@sparticuz/chromium');
        
        const launchStart = Date.now();
        const browser = await puppeteer.default.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--disable-gpu',
            '--memory-pressure-off',
            '--max_old_space_size=512'
          ],
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          timeout: 30000,
        });
        
        await browser.close();
        browserTest = { 
          success: true, 
          duration: Date.now() - launchStart 
        };
      } catch (e: any) {
        browserTest = { success: false, error: e.message };
      }
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      test: "vercel_puppeteer_configuration",
      environment,
      chromium: chromiumTest,
      puppeteer: puppeteerTest,
      browser: browserTest,
      timing: {
        totalDuration,
        timestamp: new Date().toISOString()
      },
      recommendations: generateRecommendations({
        chromium: chromiumTest,
        puppeteer: puppeteerTest,
        browser: browserTest,
        environment
      })
    });

  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Configuration test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}

function generateRecommendations(testResults: any): string[] {
  const recommendations = [];
  
  if (!testResults.chromium.available) {
    recommendations.push("❌ Chromium not available - check @sparticuz/chromium installation");
  }
  
  if (!testResults.puppeteer.available) {
    recommendations.push("❌ Puppeteer not available - check puppeteer installation");
  }
  
  if (!testResults.browser.success) {
    recommendations.push("❌ Browser launch failed - check Vercel memory limits and function timeout");
    recommendations.push("💡 Consider upgrading to Vercel Pro plan for higher limits");
  }
  
  if (testResults.environment.isVercel) {
    recommendations.push("✅ Running on Vercel - ensure functions have maxDuration configured");
    recommendations.push("💡 Check vercel.json functions configuration");
  }
  
  if (testResults.browser.duration > 10000) {
    recommendations.push("⚠️ Browser launch took >10s - consider optimizing Chromium args");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("✅ All tests passed - Puppeteer should work on Vercel");
  }
  
  return recommendations;
}
