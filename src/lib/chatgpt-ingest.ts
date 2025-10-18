// src/lib/chatgpt-ingest.ts
import crypto from "crypto";
import { openai } from "@/lib/openai";
import * as cheerio from "cheerio";

/** ===== Types ===== */
export type ChatRole = "user" | "assistant" | "system";
export type ChatMsg = { role: ChatRole; content: string; createdAt?: string };
export type SharePayload = { title?: string; messages: ChatMsg[] };

export type NineCategory =
  | "Information Seeking & Summarization"
  | "Idea Generation / Brainstorming"
  | "Idea Refinement / Elaboration"
  | "Data & Content Analysis"
  | "Learning & Conceptual Understanding"
  | "Writing & Communication Assistance"
  | "Problem Solving & Decision Support"
  | "Automation & Technical Support"
  | "Accuracy Verification & Source Checking";

/** A single user request and its following assistant replies (until next user) */
export type Pair = {
  userIndex: number;          // absolute index in raw messages
  userText: string;
  assistantTexts: string[];   // one or more assistant replies that followed
};

export type ChangeSegment = {
  category: NineCategory;
  startPair: number;          // index in pairs[]
  endPair: number;            // inclusive
  userIndices: number[];      // absolute user indices composing this segment
  assistantPreview: string;   // the **last** assistant text in this segment
  availableResponses?: string[]; // all available assistant responses for this segment
};

/** ===== Public helpers ===== */

/** Recognize ChatGPT share URLs */
export function isChatGPTShare(url: string) {
  try {
    const u = new URL(url);
    console.log(`Checking URL: ${url}, hostname: ${u.hostname}, pathname: ${u.pathname}`);
    
    const isShare = (
      (u.hostname.includes("chatgpt.com") && u.pathname.startsWith("/share")) ||
      u.hostname === "shareg.pt" ||
      u.hostname === "share.gpt" ||
      u.hostname === "chat.openai.com" ||
      (u.hostname.includes("openai.com") && u.pathname.includes("/share"))
    );
    
    console.log(`URL ${url} is ChatGPT share: ${isShare}`);
    return isShare;
  } catch (e) {
    console.log(`URL validation failed for ${url}:`, e);
    return false;
  }
}

/** ===== Core parsing functions ===== */

/** Simple ChatGPT parsing using Cheerio (fallback method) */
export async function fetchChatGPTShareCheerio(url: string): Promise<SharePayload> {
  const ALLOWED_HOSTS = new Set([
    "chatgpt.com",       // current domain
    "chat.openai.com",   // older domain (some links still redirect)
    "shareg.pt"          // legacy short links
  ]);

  function isAllowedShareUrl(urlStr: string) {
    try {
      const u = new URL(urlStr);
      if (!ALLOWED_HOSTS.has(u.hostname)) return false;
      return u.hostname === "shareg.pt" || u.pathname.startsWith("/share/");
    } catch {
      return false;
    }
  }

  if (!isAllowedShareUrl(url)) {
    throw new Error("Invalid ChatGPT share URL");
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const conversationData = await extractConversationDataFromHTML($, html);
    
    if (conversationData.messages.length === 0) {
      throw new Error("Could not extract any conversation messages from the page");
    }

    // Use the messages as-is from conversationData (they should already have proper roles)
    const deduped = conversationData.messages
      .map((m: any) => ({
        role: m.role || "assistant", // Use existing role or default to assistant
        content: String(m.content)
      }))
      .slice(0, 60); // Cap to keep payload reasonable

                  return { 
      title: conversationData.title,
      messages: deduped.map((m: any) => ({ role: m.role, content: m.content }))
    };
  } catch (error) {
    console.error("Cheerio parsing failed:", error);
    throw error;
  }
}

/** ChatGPT parsing using Puppeteer (primary) with Browserless.io fallback */
export async function fetchChatGPTShareBrowserless(url: string): Promise<SharePayload> {
  const ALLOWED_HOSTS = new Set([
    "chatgpt.com",       // current domain
    "chat.openai.com",   // older domain (some links still redirect)
    "shareg.pt"          // legacy short links
  ]);

  function isAllowedShareUrl(urlStr: string) {
    try {
      const u = new URL(urlStr);
      if (!ALLOWED_HOSTS.has(u.hostname)) return false;
      return u.hostname === "shareg.pt" || u.pathname.startsWith("/share/");
    } catch {
      return false;
    }
  }

  if (!isAllowedShareUrl(url)) {
    throw new Error("Invalid ChatGPT share URL");
  }

  const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  
  if (!BROWSERLESS_TOKEN) {
    throw new Error("BROWSERLESS_TOKEN environment variable is required");
  }

  // Try multiple approaches in sequence for maximum reliability
  
  // Method 1: Puppeteer with Chromium (best for dynamic content)
  console.log("Method 1: Trying Puppeteer with Chromium...");
  try {
    const result = await fetchChatGPTSharePuppeteer(url);
    console.log("Method 1 succeeded!");
    return result;
    } catch (e) {
    console.log("Method 1 failed:", e);
  }

  // Method 2: Browserless.io unblock endpoint (fallback)
  console.log("Method 2: Trying Browserless.io unblock endpoint...");
  try {
    const response = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}&proxy=residential`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        browserWSEndpoint: false,
        cookies: false,
        content: true,
        screenshot: false,
      })
    });

    if (response.ok) {
      const html = await response.text();
      console.log(`Method 2 received HTML: ${html.length} characters`);
      
      if (html.length > 1000) {
        const $ = cheerio.load(html);
        const conversationData = await extractConversationDataFromHTML($, html);
        
        if (conversationData.messages.length > 0) {
          console.log("Method 2 succeeded!");
          return processMessages(conversationData);
        }
      }
    }
  } catch (e) {
    console.log("Method 2 failed:", e);
  }

  // Method 3: Browserless.io unblock without proxy (fallback)
  console.log("Method 3: Trying Browserless.io unblock without proxy...");
  try {
    const response = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        browserWSEndpoint: false,
        cookies: false,
        content: true,
        screenshot: false,
      })
    });

    if (response.ok) {
      const html = await response.text();
      console.log(`Method 3 received HTML: ${html.length} characters`);
      
      if (html.length > 1000) {
        const $ = cheerio.load(html);
        const conversationData = await extractConversationDataFromHTML($, html);
        
        if (conversationData.messages.length > 0) {
          console.log("Method 3 succeeded!");
          return processMessages(conversationData);
        }
      }
    }
  } catch (e) {
    console.log("Method 3 failed:", e);
  }

  // All methods failed, fallback to Cheerio
  console.log("All Puppeteer and Browserless methods failed, falling back to Cheerio...");
  return fetchChatGPTShareCheerio(url);
}

/** Helper function to process and deduplicate messages */
function processMessages(conversationData: {title: string, messages: Array<{role: string, content: string}>}): SharePayload {
  console.log("Processing messages:", conversationData.messages.length);
  
  // Deduplicate messages
  const deduped = Array.from(new Set(conversationData.messages.map((m: any) => m.content)))
    .map((content: any) => {
      const contentStr = String(content);
      let role: "user" | "assistant" = "assistant";
      if (/^(hi|hello|hey|안녕|질문|문의|도움|help|can you|please|요청|what|how|why|when|where|who|알아|알고|궁금|하고|싶어|해줘|해주|도와|설명|분석|제시|분류|추출)/i.test(contentStr)) {
        role = "user";
      } else if (/^(i'm|i am|i can|i will|i would|i should|i think|i believe|here's|here is|let me|i'll|네|예|좋습니다|알겠습니다|도와드리겠습니다|제안해드리겠습니다|분석해보겠습니다|설명드리겠습니다)/i.test(contentStr)) {
        role = "assistant";
      } else {
        if (contentStr.includes('?') || /^(무엇|어떤|어떻게|왜|언제|어디서|누가|어느|몇|얼마나)/i.test(contentStr)) {
          role = "user";
        } else {
          role = contentStr.length < 100 ? "user" : "assistant";
      }
      }
      return { role, content: contentStr };
    })
    .slice(0, 60);

  console.log("Final processed messages:", deduped.length);
  return {
    title: conversationData.title,
    messages: deduped.map((m: any) => ({ role: m.role, content: m.content }))
  };
}

/** Helper function to extract conversation data from HTML using Cheerio */
async function extractConversationDataFromHTML($: cheerio.Root, html: string): Promise<{title: string, messages: Array<{role: string, content: string}>}> {
      const messages: Array<{role: "user" | "assistant", content: string}> = [];
  let title = "Shared Chat";

      // Strategy 1: Look for __NEXT_DATA__ script tag
  const nextDataScript = $('script#__NEXT_DATA__');
  if (nextDataScript.length > 0) {
    console.log("Found __NEXT_DATA__ script tag");
    try {
      const scriptText = nextDataScript.text() || '';
      console.log("Script content length:", scriptText.length);
      
      const data = JSON.parse(scriptText);
      console.log("Parsed __NEXT_DATA__ keys:", Object.keys(data));
      
          const messagesData = data?.props?.pageProps?.serverResponse?.messages ||
                              data?.props?.pageProps?.messages ||
                              data?.props?.messages ||
                              data?.messages;
          
      console.log("Messages data found:", messagesData ? messagesData.length : 0);
          
          if (Array.isArray(messagesData)) {
            for (const msg of messagesData) {
              if (msg && typeof msg === 'object') {
                const role = msg.role || msg.author_role || 'assistant';
                const content = msg.content || msg.text || msg.message || '';
                if (content && typeof content === 'string') {
                  messages.push({
                    role: role === 'user' ? 'user' : 'assistant',
                    content: content.trim()
                  });
                }
              }
            }
          }

          // Extract title
          title = data?.props?.pageProps?.meta?.title || 
                  data?.props?.pageProps?.title || 
                  data?.title || 
              $('title').text() ||
                  title;
        } catch (e) {
          console.log('Failed to parse __NEXT_DATA__:', e);
        }
  } else {
    console.log("No __NEXT_DATA__ script tag found");
      }

  // Strategy 2: Look for conversation elements in DOM with more comprehensive selectors
      if (messages.length === 0) {
        const messageSelectors = [
          '[data-message-author-role]',
          '[data-testid*="message"]',
          '[data-testid*="conversation"]',
      '.conversation-turn',
          '.message',
          '[class*="message"]',
      '[class*="turn"]',
          '[class*="chat"]',
          'div[role="presentation"]',
      '[role="listitem"]',
      // ChatGPT specific selectors
      '[data-message-id]',
      '.group\\/conversation-turn',
      '.group\\/message',
      // More generic patterns
      'div[class*="group"] div[class*="text"]',
      'div[class*="flex"] div[class*="text"]'
        ];

        for (const selector of messageSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.each((_, element) => {
          const $el = $(element);
          const text = $el.text()?.trim();
          
          // Filter out navigation and UI elements
          if (text && text.length > 10 && text.length < 5000) {
            if (!/Continue this conversation|Log in|Sign up|Share|Copy link|Download|Regenerate|Skip to content|ChatGPT|Attach|Search|Study|Voice|By messaging ChatGPT|Terms|Privacy Policy|Loading|Error|Try again/i.test(text)) {
              
              // Determine role from various attributes and content patterns
                let role: "user" | "assistant" = "assistant";
              
              const authorRole = $el.attr('data-message-author-role') || 
                                $el.attr('data-author-role') ||
                                $el.attr('data-role');
              
                if (authorRole === 'user') {
                  role = "user";
                } else if (authorRole === 'assistant') {
                  role = "assistant";
                } else {
                // Content-based heuristics
                  if (/^(hi|hello|hey|안녕|질문|문의|도움|help|can you|please|요청|what|how|why|when|where|who|알아|알고|궁금|하고|싶어|해줘|해주|도와|설명|분석|제시|분류|추출)/i.test(text)) {
                    role = "user";
                  } else if (/^(i'm|i am|i can|i will|i would|i should|i think|i believe|here's|here is|let me|i'll|네|예|좋습니다|알겠습니다|도와드리겠습니다|제안해드리겠습니다|분석해보겠습니다|설명드리겠습니다)/i.test(text)) {
                    role = "assistant";
                  } else {
                    // For Korean text, questions often end with "?" or contain question words
                    if (text.includes('?') || /^(무엇|어떤|어떻게|왜|언제|어디서|누가|어느|몇|얼마나)/i.test(text)) {
                      role = "user";
                    } else {
                      role = text.length < 100 ? "user" : "assistant";
                    }
                  }
                }
                
              messages.push({
                role,
                content: text
          });
        }
      }
        });
        
        if (messages.length > 0) {
          console.log(`Successfully extracted ${messages.length} messages using selector: ${selector}`);
          break; // Use first successful selector
        }
      }
    }
  }

  // Strategy 3: Try to extract from other script tags and data sources
  if (messages.length === 0) {
    console.log("Trying Strategy 3: Looking for other data sources...");
    
    // Look for other script tags that might contain conversation data
    const scriptTags = $('script');
    scriptTags.each((_, script) => {
      const scriptContent = $(script).text();
      if (scriptContent && scriptContent.includes('messages') && scriptContent.includes('conversation')) {
        try {
          // Try to extract JSON-like data from script content
          const jsonMatch = scriptContent.match(/\{[\s\S]*"messages"[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.messages && Array.isArray(data.messages)) {
              data.messages.forEach((msg: any) => {
                if (msg && typeof msg === 'object') {
                  const role = msg.role || msg.author_role || 'assistant';
                  const content = msg.content || msg.text || msg.message || '';
                  if (content && typeof content === 'string') {
                    messages.push({
                      role: role === 'user' ? 'user' : 'assistant',
                      content: content.trim()
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
  }

  // Strategy 4: Extract title from page
  if (title === "Shared Chat") {
    title = $('title').text() || 
            $('h1').first().text() || 
            $('[class*="title"]').first().text() ||
            title;
  }

  // Deduplicate messages by content to avoid duplicates from multiple selectors
  const uniqueMessages = [];
  const seenContent = new Set();
  
  for (const msg of messages) {
    const contentKey = msg.content.trim();
    if (!seenContent.has(contentKey)) {
      seenContent.add(contentKey);
      uniqueMessages.push(msg);
    }
  }
  
  console.log(`Final extraction result: ${uniqueMessages.length} unique messages found (was ${messages.length})`);
  return { title, messages: uniqueMessages };
}

/** Debug function using Browserless.io to understand ChatGPT share page structure */
export async function debugChatGPTShareBrowserless(url: string): Promise<{ 
  title: string;
  html: string; 
  patterns: string[]; 
  foundElements: Array<{selector: string, count: number, samples: string[]}>;
  messages: Array<{role: string, text: string}>;
  nextData: any;
}> {
  const ALLOWED_HOSTS = new Set([
    "chatgpt.com",       // current domain
    "chat.openai.com",   // older domain (some links still redirect)
    "shareg.pt"          // legacy short links
  ]);

  function isAllowedShareUrl(urlStr: string) {
    try {
      const u = new URL(urlStr);
      if (!ALLOWED_HOSTS.has(u.hostname)) return false;
      return u.hostname === "shareg.pt" || u.pathname.startsWith("/share/");
    } catch {
      return false;
    }
  }

  if (!isAllowedShareUrl(url)) {
    throw new Error("Invalid ChatGPT share URL");
  }

  const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://production-sfo.browserless.io';
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  
  if (!BROWSERLESS_TOKEN) {
    throw new Error("BROWSERLESS_TOKEN environment variable is required");
  }

  try {
    // Use Browserless.io unblock endpoint to bypass bot detection
    const response = await fetch(`${BROWSERLESS_URL}/unblock?token=${BROWSERLESS_TOKEN}&proxy=residential`, {
      method: 'POST',
    headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        browserWSEndpoint: false,
        cookies: false,
        content: true,
        screenshot: false,
      })
    });

    if (!response.ok) {
      throw new Error(`Browserless.io request failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
  const $ = cheerio.load(html);
  
    // Extract debug information
    const patterns = [
      '__NEXT_DATA__',
      'data-message-author-role',
      'conversation-turn',
      'message',
    '[class*="message"]',
      '[class*="turn"]',
      '[class*="chat"]'
    ];

    const foundElements = patterns.map(pattern => {
      const elements = $(pattern);
      const samples = elements.slice(0, 3).map((_, el) => $(el).text().substring(0, 100)).get();
      return {
        selector: pattern,
        count: elements.length,
        samples
      };
    });

    // Extract messages using the same logic as the main function
    const conversationData = await extractConversationDataFromHTML($, html);

    // Extract __NEXT_DATA__ if available
    let nextData = null;
    const nextDataScript = $('script#__NEXT_DATA__');
    if (nextDataScript.length > 0) {
      try {
        nextData = JSON.parse(nextDataScript.text() || '');
      } catch (e) {
        console.log('Failed to parse __NEXT_DATA__:', e);
      }
  }

  return { 
      title: conversationData.title,
      html: html.substring(0, 1000) + '...', // Truncate for readability
    patterns, 
    foundElements,
      messages: conversationData.messages.map(m => ({ role: m.role, text: m.content })),
      nextData
    };

  } catch (error) {
    console.error("Browserless.io debug failed:", error);
    throw error;
  }
}

/** ===== Flow segmentation and analysis ===== */

/** Convert raw messages to pairs (user + assistant responses) */
export function messagesToPairs(messages: ChatMsg[]): Pair[] {
  const pairs: Pair[] = [];
  let currentPair: Partial<Pair> | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.role === "user") {
      // Save previous pair if exists
      if (currentPair && currentPair.userText) {
        pairs.push(currentPair as Pair);
      }
      
      // Start new pair
      currentPair = {
        userIndex: i,
        userText: msg.content,
        assistantTexts: []
      };
    } else if (msg.role === "assistant" && currentPair) {
      // Add assistant response to current pair
      if (currentPair.assistantTexts) {
        currentPair.assistantTexts.push(msg.content);
      }
    }
  }

    // Don't forget the last pair
    if (currentPair && currentPair.userText && currentPair.assistantTexts) {
      pairs.push(currentPair as Pair);
    }

  return pairs;
}

/** Analyze conversation and segment into flows using OpenAI */
export async function analyzeConversationFlows(pairs: Pair[]): Promise<ChangeSegment[]> {
  if (pairs.length === 0) return [];

  try {
    const prompt = `Analyze this ChatGPT conversation and segment it into logical flows. Each flow should represent a distinct topic or purpose.

Conversation pairs:
${pairs.map((pair, i) => `${i}: User: ${pair.userText}\n   Assistant: ${pair.assistantTexts.join('\n   ')}`).join('\n\n')}

Please segment this into flows and categorize each flow using these categories:
- "Information Seeking & Summarization"
- "Idea Generation / Brainstorming" 
- "Idea Refinement / Elaboration"
- "Data & Content Analysis"
- "Learning & Conceptual Understanding"
- "Writing & Communication Assistance"
- "Problem Solving & Decision Support"
- "Automation & Technical Support"
- "Accuracy Verification & Source Checking"

Return JSON in this format:
[
  {
    "category": "category name",
    "startPair": 0,
    "endPair": 2,
    "userIndices": [0, 1, 2],
    "assistantPreview": "summary of assistant's last response in this flow"
  }
]`;

    const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error("No response from OpenAI");

    const segments = JSON.parse(response);
    return segments.map((seg: any) => ({
      ...seg,
      assistantPreview: seg.assistantPreview || ""
    }));

  } catch (error) {
    console.error("Flow analysis failed:", error);
    // Fallback: create single segment for entire conversation
    return [{
      category: "Information Seeking & Summarization" as NineCategory,
      startPair: 0,
      endPair: pairs.length - 1,
      userIndices: pairs.map(p => p.userIndex),
      assistantPreview: pairs[pairs.length - 1]?.assistantTexts[pairs[pairs.length - 1].assistantTexts.length - 1] || ""
    }];
  }
}

/** ===== Legacy Puppeteer functions (kept for compatibility) ===== */

/** ChatGPT parsing using Puppeteer with Chromium for Vercel deployment */
export async function fetchChatGPTSharePuppeteer(url: string): Promise<SharePayload> {
  const { fetchChatGPTSharePuppeteer: puppeteerFetch } = await import('./chatgpt-puppeteer');
  return puppeteerFetch(url);
}

/** Debug function for Puppeteer ChatGPT parsing */
export async function debugChatGPTSharePuppeteer(url: string): Promise<{ 
  title: string;
  html: string; 
  patterns: string[]; 
  foundElements: Array<{selector: string, count: number, samples: string[]}>;
  messages: Array<{role: string, text: string}>;
  nextData: any;
}> {
  const { debugChatGPTSharePuppeteer: puppeteerDebug } = await import('./chatgpt-puppeteer');
  return puppeteerDebug(url);
}