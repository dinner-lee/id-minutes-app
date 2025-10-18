export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    
    return NextResponse.json({
      ok: true,
      debug: {
        browserlessUrl: BROWSERLESS_URL,
        tokenExists: !!BROWSERLESS_TOKEN,
        tokenLength: BROWSERLESS_TOKEN ? BROWSERLESS_TOKEN.length : 0,
        tokenPreview: BROWSERLESS_TOKEN ? BROWSERLESS_TOKEN.substring(0, 10) + '...' : 'NOT_SET',
        environment: process.env.NODE_ENV
      }
    });

  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Debug failed"
    }, { status: 400 });
  }
}
