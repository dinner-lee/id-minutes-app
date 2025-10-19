export const runtime = "nodejs";
export const maxDuration = 60;

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

function parseManualTranscript(transcript: string): ChatMsg[] {
  console.log("Parsing manual transcript...");
  
  // Clean up the transcript by removing unnecessary parts
  let cleanedTranscript = transcript
    // Remove common ChatGPT UI elements
    .replace(/The following image can be moved on the page using keyboard controls \(left, right, up, down\)/g, '')
    .replace(/콘텐츠로 건너뛰기/g, '')
    .replace(/채팅 기록/g, '')
    .replace(/선택된 파일 없음/g, '')
    .replace(/ChatGPT는 실수를 할 수 있습니다\. 중요한 정보는 재차 확인하세요\./g, '')
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  console.log("Cleaned transcript length:", cleanedTranscript.length);
  
  const messages: ChatMsg[] = [];
  const sections = cleanedTranscript.split(/(나의 말:|ChatGPT의 말:)/);
  
  console.log("Found sections:", sections.length);
  
  let currentRole: ChatRole | null = null;
  let currentContent = "";
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    if (section === '나의 말:') {
      // Save previous message if exists
      if (currentContent.trim() && currentRole) {
        messages.push({
          role: currentRole,
          content: currentContent.trim()
        });
      }
      currentRole = "user";
      currentContent = "";
    } else if (section === 'ChatGPT의 말:') {
      // Save previous message if exists
      if (currentContent.trim() && currentRole) {
        messages.push({
          role: currentRole,
          content: currentContent.trim()
        });
      }
      currentRole = "assistant";
      currentContent = "";
    } else if (section && currentRole) {
      // This is content for the current role
      if (currentContent) {
        currentContent += '\n' + section;
      } else {
        currentContent = section;
      }
    }
  }
  
  // Don't forget the last message
  if (currentContent.trim() && currentRole) {
    messages.push({
      role: currentRole,
      content: currentContent.trim()
    });
  }
  
  console.log("Parsed messages:", messages.length);
  messages.forEach((msg, index) => {
    console.log(`Message ${index}: role=${msg.role}, content="${msg.content.substring(0, 50)}..."`);
  });
  
  return messages;
}

async function analyzeWithTurnClassification(raw: SharePayload) {
  console.log("Analyze function - raw messages:", raw.messages.length);
  console.log("First few raw messages:", raw.messages.slice(0, 2));
  
  // Debug: Log all raw messages
  console.log("All raw messages:");
  raw.messages.forEach((msg, index) => {
    console.log(`Message ${index}: role=${msg.role}, content="${msg.content.substring(0, 100)}..."`);
  });
  
  const pairs = messagesToPairs(raw.messages);
  console.log("After messagesToPairs:", pairs.length);
  
  // Debug: Log all pairs
  console.log("All pairs:");
  pairs.forEach((pair, index) => {
    console.log(`Pair ${index}: userIndex=${pair.userIndex}, userText="${pair.userText.substring(0, 50)}...", assistantTexts=${pair.assistantTexts.length}`);
  });
  
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
  
  // Create properly structured pairs for the UI - sort by userIndex to maintain original order
  const structuredPairs = turnClassifications
    .sort((a, b) => a.userIndex - b.userIndex) // Sort by original message order
    .map(turn => ({
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
  
  // Debug: Log pair details
  console.log("Pair details:");
  structuredPairs.forEach((pair, index) => {
    console.log(`Pair ${index}: userIndex=${pair.userIndex}, userText="${pair.userText.substring(0, 50)}...", assistantTexts=${pair.assistantTexts.length}`);
  });
  
  return { 
    pairs: structuredPairs, 
    segments: structuredSegments, 
    title: raw.title ?? "Chat" 
  };
}

async function analyzeManual(raw: SharePayload) {
  console.log("Analyze manual function - raw messages:", raw.messages.length);
  console.log("First few raw messages:", raw.messages.slice(0, 2));
  
  // Debug: Log all raw messages
  console.log("All raw messages:");
  raw.messages.forEach((msg, index) => {
    console.log(`Message ${index}: role=${msg.role}, content="${msg.content.substring(0, 100)}..."`);
  });
  
  const pairs = messagesToPairs(raw.messages);
  console.log("After messagesToPairs:", pairs.length);
  
  // Debug: Log all pairs
  console.log("All pairs:");
  pairs.forEach((pair, index) => {
    console.log(`Pair ${index}: userIndex=${pair.userIndex}, userText="${pair.userText.substring(0, 50)}...", assistantTexts=${pair.assistantTexts.length}`);
  });
  
  // Use the same turn-by-turn classification as analyzeWithTurnClassification
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
  
  // Create properly structured pairs for the UI - sort by userIndex to maintain original order
  const structuredPairs = turnClassifications
    .sort((a, b) => a.userIndex - b.userIndex) // Sort by original message order
    .map(turn => ({
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
  
  // Debug: Log pair details
  console.log("Pair details:");
  structuredPairs.forEach((pair, index) => {
    console.log(`Pair ${index}: userIndex=${pair.userIndex}, userText="${pair.userText.substring(0, 50)}...", assistantTexts=${pair.assistantTexts.length}`);
  });
  
  return { 
    pairs: structuredPairs, 
    segments: structuredSegments, 
    title: raw.title ?? "Chat" 
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { url, manualTranscript } = Body.parse(await req.json());
    const me = await getDevUser();

    // Manual path first (if provided)
    if (manualTranscript && manualTranscript.trim()) {
      console.log("Processing manual transcript...");
      
      // Create a more sophisticated SharePayload from manual transcript
      const raw: SharePayload = {
        title: "Manual Transcript",
        messages: parseManualTranscript(manualTranscript)
      };
      
      console.log("Parsed manual transcript messages:", raw.messages.length);
      
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
          // Try Puppeteer Lambda first (most reliable for Vercel with browser automation)
          console.log("Attempting Puppeteer Lambda parsing...");
          const { fetchChatGPTSharePuppeteerLambda } = await import("@/lib/chatgpt-puppeteer-lambda");
          const raw = await fetchChatGPTSharePuppeteerLambda(url);
          
          // If we got actual conversation data, analyze it with turn-by-turn classification
          const result = await analyzeWithTurnClassification(raw);
          return NextResponse.json({
            ok: true,
            mode: "link_puppeteer_lambda",
            addedByName: me.name || me.email,
            title: result.title,
            pairs: result.pairs,
            segments: result.segments,
          });
        } catch (puppeteerLambdaError) {
          console.error("Puppeteer Lambda parsing failed:", puppeteerLambdaError);
          
          // Try Puppeteer as fallback
          try {
            console.log("Attempting Puppeteer fallback...");
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
          } catch (puppeteerError) {
            console.error("Puppeteer fallback also failed:", puppeteerError);
            
            // Try simple fetch fallback
            try {
              console.log("Attempting simple fetch fallback...");
              const { fetchChatGPTShareSimple } = await import("@/lib/chatgpt-simple");
              const raw = await fetchChatGPTShareSimple(url);
              
              if (raw.messages.length > 0) {
                const result = await analyzeWithTurnClassification(raw);
                return NextResponse.json({
                  ok: true,
                  mode: "link_simple",
                  addedByName: me.name || me.email,
                  title: result.title,
                  pairs: result.pairs,
                  segments: result.segments,
                });
              }
            } catch (simpleError) {
              console.error("Simple fetch fallback failed:", simpleError);
              
              // Try Cheerio as final fallback
              try {
                console.log("Attempting Cheerio final fallback...");
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
            }
            
            // All methods failed — instruct client to show manual paste UI.
            return NextResponse.json(
              { 
                ok: false, 
                needsManual: true, 
                error: `All parsing methods failed. Puppeteer Lambda: ${(puppeteerLambdaError as any)?.message || 'Unknown error'}, Puppeteer: ${(puppeteerError as any)?.message || 'Unknown error'}`,
                suggestions: [
                  "The ChatGPT page may be using bot detection or require JavaScript",
                  "Try copying the conversation text manually",
                  "Ensure the share link is publicly accessible",
                  "Check if the link has expired or been made private",
                  "Consider using manual input for better reliability"
                ]
              },
              { status: 422 }
            );
          }
        }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Preview failed" }, { status: 400 });
  }
}
