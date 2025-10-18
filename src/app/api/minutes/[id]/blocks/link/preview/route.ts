export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isChatGPTShare,
  fetchChatGPTSharePuppeteer,
  messagesToPairs,
  SharePayload,
  ChatRole,
} from "@/lib/chatgpt-ingest";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

const Body = z.object({
  url: z.string().url().optional(),
  manualTranscript: z.string().optional(),
});

async function getDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: "Dev User" } });
  return user;
}

async function analyzeWithTurnClassification(raw: SharePayload) {
  console.log("Analyze function - raw messages:", raw.messages.length);
  console.log("First few raw messages:", raw.messages.slice(0, 2));
  
  const pairs = messagesToPairs(raw.messages);
  console.log("After messagesToPairs:", pairs.length);
  
  // Classify each turn individually
  console.log("Classifying each turn individually...");
  const turnClassifications = await Promise.all(
    pairs.map(async (pair, index) => {
      try {
        const prompt = `Classify this single user request into one of these 9 categories:

User Request: "${pair.userText}"

Categories:
1. "Information Seeking & Summarization"
2. "Idea Generation / Brainstorming" 
3. "Idea Refinement / Elaboration"
4. "Data & Content Analysis"
5. "Learning & Conceptual Understanding"
6. "Writing & Communication Assistance"
7. "Problem Solving & Decision Support"
8. "Automation & Technical Support"
9. "Accuracy Verification & Source Checking"

Return only the category name, nothing else.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });

        const category = completion.choices[0]?.message?.content?.trim();
        // Clean up the category name (remove numbers and quotes)
        const cleanCategory = category?.replace(/^\d+\.\s*"?|"?$/g, '') || "Information Seeking & Summarization";
        return {
          turnNumber: index + 1,
          userText: pair.userText,
          assistantTexts: pair.assistantTexts,
          category: cleanCategory,
          userIndex: pair.userIndex
        };
      } catch (error) {
        console.error(`Failed to classify turn ${index + 1}:`, error);
        return {
          turnNumber: index + 1,
          userText: pair.userText,
          assistantTexts: pair.assistantTexts,
          category: "Information Seeking & Summarization",
          userIndex: pair.userIndex
        };
      }
    })
  );

  // Group consecutive turns with same category into flows
  console.log("Creating flows from consecutive same categories...");
  const flows = [];
  let currentFlow = null;

  for (const turn of turnClassifications) {
    if (!currentFlow || currentFlow.category !== turn.category) {
      // Start new flow
      if (currentFlow) {
        flows.push(currentFlow);
      }
      currentFlow = {
        category: turn.category,
        turns: [turn],
        startPair: turn.turnNumber - 1,
        endPair: turn.turnNumber - 1,
        userIndices: [turn.userIndex],
        assistantPreview: turn.assistantTexts[turn.assistantTexts.length - 1] || ""
      };
    } else {
      // Add to current flow
      currentFlow.turns.push(turn);
      currentFlow.endPair = turn.turnNumber - 1;
      currentFlow.userIndices.push(turn.userIndex);
      currentFlow.assistantPreview = turn.assistantTexts[turn.assistantTexts.length - 1] || "";
    }
  }
  
  // Don't forget the last flow
  if (currentFlow) {
    flows.push(currentFlow);
  }

  console.log("After turn classification:", flows.length, "flows created");
  
  // Create properly structured pairs for the UI
  const structuredPairs = turnClassifications.map(turn => ({
    userIndex: turn.userIndex,
    userText: turn.userText,
    assistantTexts: turn.assistantTexts,
    category: turn.category,
    turnNumber: turn.turnNumber
  }));

  // Create properly structured segments for the UI
  const structuredSegments = flows.map((flow, index) => ({
    category: flow.category,
    startPair: flow.startPair,
    endPair: flow.endPair,
    userIndices: flow.userIndices,
    assistantPreview: flow.assistantPreview,
    // Add availableResponses for the ResponseSelector component
    availableResponses: flow.turns.flatMap(turn => turn.assistantTexts)
  }));

  console.log("Structured pairs:", structuredPairs.length);
  console.log("Structured segments:", structuredSegments.length);
  
  return { 
    pairs: structuredPairs, 
    segments: structuredSegments, 
    title: raw.title ?? "Chat" 
  };
}

async function analyzeManual(raw: SharePayload) {
  const pairs = messagesToPairs(raw.messages);
  // For manual input, use simple flow analysis
  const segments = [{
    category: "Information Seeking & Summarization",
    startPair: 0,
    endPair: pairs.length - 1,
    userIndices: pairs.map(p => p.userIndex),
    assistantPreview: pairs[pairs.length - 1]?.assistantTexts[pairs[pairs.length - 1].assistantTexts.length - 1] || ""
  }];
  return { pairs, segments, title: raw.title ?? "Chat" };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { url, manualTranscript } = Body.parse(await req.json());
    const me = await getDevUser();

    // Manual path first (if provided)
    if (manualTranscript && manualTranscript.trim()) {
      // Create a simple SharePayload from manual transcript
      const raw: SharePayload = {
        title: "Manual Transcript",
        messages: manualTranscript.split('\n').filter(line => line.trim()).map((line, index) => ({
          role: index % 2 === 0 ? "user" : "assistant" as ChatRole,
          content: line.trim()
        }))
      };
      const result = await analyzeManual(raw);
      return NextResponse.json({
        ok: true,
        mode: "manual",
        addedByName: me.name || me.email,
        title: result.title,
        pairs: result.pairs,
        segments: result.segments,
      });
    }

    // Link path
    if (!url) {
      return NextResponse.json({ ok: false, error: "Provide a URL or a transcript." }, { status: 400 });
    }
    if (!isChatGPTShare(url)) {
      return NextResponse.json({ ok: false, error: "Not a ChatGPT share link" }, { status: 400 });
    }

        try {
          // Try Puppeteer parsing first (best for dynamic content)
          console.log("Attempting Puppeteer parsing...");
          const raw = await fetchChatGPTSharePuppeteer(url);
          
          // Check if this is a manual input required response
          if (raw.messages.length === 1 && raw.messages[0].role === "system") {
            return NextResponse.json({
              ok: false,
              needsManual: true,
              extractedTitle: raw.title,
              error: "ChatGPT conversations load dynamically with JavaScript. Please copy and paste the conversation content manually.",
              instructions: [
                "1. Open the ChatGPT share URL in your browser",
                "2. Copy the conversation text",
                "3. Paste it in the manual input field below",
                "4. The system will parse and analyze the conversation"
              ]
            }, { status: 422 });
          }
          
          // If we got actual conversation data, analyze it with turn-by-turn classification
          const result = await analyzeWithTurnClassification(raw);
          return NextResponse.json({
            ok: true,
            mode: "link_puppeteer",
            addedByName: me.name || me.email,
            title: result.title,
            pairs: result.pairs,
            segments: result.segments,
          });
        } catch (e: any) {
          console.error("Puppeteer parsing failed:", e);
          
          // Try Cheerio fallback if Puppeteer fails
          try {
            console.log("Attempting Cheerio fallback...");
            const { fetchChatGPTShareCheerio } = await import("@/lib/chatgpt-ingest");
            const raw = await fetchChatGPTShareCheerio(url);
            
            if (raw.messages.length > 0) {
              const result = await analyzeWithTurnClassification(raw);
              return NextResponse.json({
                ok: true,
                mode: "link_cheerio",
                addedByName: me.name || me.email,
                title: result.title,
                pairs: result.pairs,
                segments: result.segments,
              });
            }
          } catch (cheerioError) {
            console.error("Cheerio fallback also failed:", cheerioError);
          }
          
          // All methods failed — instruct client to show manual paste UI.
          return NextResponse.json(
            { 
              ok: false, 
              needsManual: true, 
              error: `Could not parse share page: ${e?.message || "Unknown error"}`,
              suggestions: [
                "The ChatGPT page may be using bot detection or require JavaScript",
                "Try copying the conversation text manually",
                "Ensure the share link is publicly accessible",
                "Check if the link has expired or been made private"
              ]
            },
            { status: 422 }
          );
        }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Preview failed" }, { status: 400 });
  }
}
