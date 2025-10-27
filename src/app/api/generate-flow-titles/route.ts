export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { flows } = await req.json();
    
    if (!Array.isArray(flows) || flows.length === 0) {
      return NextResponse.json({ ok: false, error: "No flows provided" }, { status: 400 });
    }

    // Generate titles for each flow
    const titles = await Promise.all(
      flows.map(async (flow: any) => {
        // Get the first user text from the flow to analyze
        const userText = flow.userText || flow.turnPairs?.[0]?.userText || "";
        
        if (!userText) {
          return "";
        }
        
        try {
          // Detect language and determine appropriate length
          const isKorean = /[가-힣]/.test(userText);
          const charLimit = isKorean ? "25-35" : "15-20";
          
          const prompt = `Generate a concise title (${charLimit} characters, in the same language as the text) summarizing this user request. Match the sentence type: if it's a question, make it a question; if it's imperative, make it imperative; if it's declarative, make it declarative.

User request:
"${userText}"

Return only the title, nothing else.`;
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 50,
          });
          
          return completion.choices[0]?.message?.content?.trim() || "";
        } catch (err) {
          console.error("Error generating title:", err);
          return "";
        }
      })
    );

    return NextResponse.json({ ok: true, titles });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error generating titles" }, { status: 400 });
  }
}

