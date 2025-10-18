// src/lib/chatgpt-browserless.ts
import { SharePayload } from './chatgpt-ingest';

/** ChatGPT parsing using Browserless.io (reliable for Vercel) */
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
  
  console.log("Browserless.io configuration:", {
    url: BROWSERLESS_URL,
    tokenExists: !!BROWSERLESS_TOKEN,
    tokenLength: BROWSERLESS_TOKEN ? BROWSERLESS_TOKEN.length : 0
  });
  
  if (!BROWSERLESS_TOKEN) {
    throw new Error("BROWSERLESS_TOKEN environment variable is required for Vercel deployment. Please set it in Vercel dashboard → Project Settings → Environment Variables");
  }

  console.log("Using Browserless.io for ChatGPT parsing...");

  try {
    // Use Browserless.io content endpoint with JavaScript execution
    const response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        waitFor: 3000, // Wait 3 seconds for content to load
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000
        },
        addScriptTag: [
          {
            content: `
              // Wait for conversation content to load
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Extract conversation data
              const messages = [];
              let title = document.title || "Shared Chat";
              
              // Try to get title from meta or other sources
              const titleEl = document.querySelector('title');
              if (titleEl) {
                title = titleEl.textContent || title;
              }
              
              // Look for conversation elements
              const messageSelectors = [
                '[data-message-author-role]',
                '[data-testid*="message"]',
                '[data-testid*="conversation"]',
                '[data-message-id]',
                '.group\\/conversation-turn',
                '.group\\/message',
                '.conversation-turn',
                '.message',
                '[class*="message"]',
                '[class*="turn"]',
                '[class*="chat"]'
              ];
              
              for (const selector of messageSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                  const text = el.textContent?.trim();
                  if (text && text.length > 10 && text.length < 5000) {
                    // Filter out navigation and UI elements
                    if (!/Continue this conversation|Log in|Sign up|Share|Copy link|Download|Regenerate|Skip to content|ChatGPT|Attach|Search|Study|Voice|By messaging ChatGPT|Terms|Privacy Policy|Loading|Error|Try again|window\.__oai|requestAnimationFrame|function\(\)|Date\.now\(\)|__oai_logHTML|__oai_SSR_HTML|__oai_logTTI|__oai_SSR_TTI/i.test(text)) {
                      
                      // Determine role from element attributes or content patterns
                      let role = "assistant";
                      
                      const authorRole = el.getAttribute('data-message-author-role') || 
                                        el.getAttribute('data-author-role') ||
                                        el.getAttribute('data-role');
                      
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
                      
                      messages.push({ role, content: text });
                    }
                  }
                }
              }
              
              // Return the extracted data
              return { title, messages };
            `
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Browserless.io request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Browserless.io response:", result);

    // Extract the result from the script execution
    const extractedData = result.result || result;
    
    if (!extractedData || !extractedData.messages || extractedData.messages.length === 0) {
      throw new Error("No conversation messages found in Browserless.io response");
    }

    // Deduplicate messages by content
    const uniqueMessages = [];
    const seenContent = new Set();
    
    for (const msg of extractedData.messages) {
      const contentKey = msg.content.trim();
      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        uniqueMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    console.log(`Extracted ${uniqueMessages.length} unique messages via Browserless.io`);

    return {
      title: extractedData.title || "Shared Chat",
      messages: uniqueMessages.slice(0, 60) // Cap to keep payload reasonable
    };

  } catch (error) {
    console.error("Browserless.io parsing failed:", error);
    throw new Error(`Browserless.io parsing failed: ${error.message}`);
  }
}
