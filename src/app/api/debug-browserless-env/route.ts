export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const debugInfo = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL === '1',
        region: process.env.VERCEL_REGION,
        functionRegion: process.env.VERCEL_FUNCTION_REGION,
      },
      
      browserless: {
        url: process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io',
        tokenExists: !!process.env.BROWSERLESS_TOKEN,
        tokenLength: process.env.BROWSERLESS_TOKEN ? process.env.BROWSERLESS_TOKEN.length : 0,
        tokenPreview: process.env.BROWSERLESS_TOKEN ? process.env.BROWSERLESS_TOKEN.substring(0, 10) + '...' : 'NOT_SET',
      },
      
      allEnvVars: Object.keys(process.env)
        .filter(key => key.includes('BROWSERLESS') || key.includes('VERCEL'))
        .reduce((acc, key) => {
          acc[key] = process.env[key] ? 'SET' : 'NOT_SET';
          return acc;
        }, {} as Record<string, string>)
    };

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
  
  if (!debugInfo.browserless.tokenExists) {
    recommendations.push("❌ BROWSERLESS_TOKEN is not set");
    recommendations.push("💡 Go to Vercel dashboard → Project Settings → Environment Variables");
    recommendations.push("💡 Add BROWSERLESS_TOKEN with your Browserless.io token");
    recommendations.push("💡 Redeploy the project after adding the environment variable");
  } else {
    recommendations.push("✅ BROWSERLESS_TOKEN is set");
  }
  
  if (debugInfo.environment.vercel) {
    recommendations.push("✅ Running on Vercel");
    recommendations.push("💡 Environment variables should be available");
  }
  
  return recommendations;
}
