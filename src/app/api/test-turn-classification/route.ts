export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { analyzeConversationFlows, messagesToPairs } from "@/lib/chatgpt-ingest";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`Testing turn-by-turn classification for: ${url}`);

    // Import the Puppeteer function
    const { fetchChatGPTSharePuppeteer } = await import("@/lib/chatgpt-ingest");
    
    // Get the conversation data
    const raw = await fetchChatGPTSharePuppeteer(url);
    console.log(`Extracted ${raw.messages.length} messages`);
    
    // Convert messages to pairs
    const pairs = messagesToPairs(raw.messages);
    console.log(`Converted to ${pairs.length} pairs`);
    
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
          return {
            turnNumber: index + 1,
            userText: pair.userText,
            assistantTexts: pair.assistantTexts,
            category: category || "Information Seeking & Summarization",
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
          startTurn: turn.turnNumber,
          endTurn: turn.turnNumber,
          userIndices: [turn.userIndex],
          assistantPreview: turn.assistantTexts[turn.assistantTexts.length - 1] || ""
        };
      } else {
        // Add to current flow
        currentFlow.turns.push(turn);
        currentFlow.endTurn = turn.turnNumber;
        currentFlow.userIndices.push(turn.userIndex);
        currentFlow.assistantPreview = turn.assistantTexts[turn.assistantTexts.length - 1] || "";
      }
    }
    
    // Don't forget the last flow
    if (currentFlow) {
      flows.push(currentFlow);
    }

    // Create the final structure
    const results = {
      title: raw.title,
      totalMessages: raw.messages.length,
      totalTurns: pairs.length,
      turnClassifications: turnClassifications.map(turn => ({
        turnNumber: turn.turnNumber,
        userRequest: turn.userText,
        chatgptResponse: turn.assistantTexts.join('\n\n'),
        userRequestType: turn.category,
        addedBy: "Test User", // In real app, this would be the actual user
        userIndex: turn.userIndex
      })),
      flows: flows.map((flow, index) => ({
        flowIndex: index + 1,
        category: flow.category,
        startTurn: flow.startTurn,
        endTurn: flow.endTurn,
        turnCount: flow.turns.length,
        userIndices: flow.userIndices,
        assistantPreview: flow.assistantPreview,
        turns: flow.turns.map(turn => ({
          turnNumber: turn.turnNumber,
          userRequest: turn.userText,
          chatgptResponse: turn.assistantTexts.join('\n\n'),
          userRequestType: turn.category
        }))
      })),
      categories: [
        "Information Seeking & Summarization",
        "Idea Generation / Brainstorming",
        "Idea Refinement / Elaboration",
        "Data & Content Analysis",
        "Learning & Conceptual Understanding",
        "Writing & Communication Assistance",
        "Problem Solving & Decision Support",
        "Automation & Technical Support",
        "Accuracy Verification & Source Checking"
      ]
    };

    return NextResponse.json({
      ok: true,
      results
    });

  } catch (e: any) {
    console.error("Turn classification test failed:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Turn classification test failed",
      stack: e?.stack
    }, { status: 400 });
  }
}
