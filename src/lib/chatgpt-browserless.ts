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
    // Try different Browserless.io endpoints
    let response;
    let html;
    
    // Method 1: Try the /content endpoint
    try {
      console.log("Trying Browserless.io /content endpoint...");
      response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          waitFor: 5000,
          gotoOptions: {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        html = result.content || result.html || result;
        console.log("Successfully got content from /content endpoint");
      } else {
        throw new Error(`Content endpoint failed: ${response.status}`);
      }
    } catch (contentError) {
      console.log("Content endpoint failed, trying /screenshot endpoint...");
      
      // Method 2: Try the /screenshot endpoint (which also returns HTML)
      try {
        response = await fetch(`${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            waitFor: 5000,
            gotoOptions: {
              waitUntil: 'domcontentloaded',
              timeout: 30000
            }
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          html = result.content || result.html || result;
          console.log("Successfully got content from /screenshot endpoint");
        } else {
          throw new Error(`Screenshot endpoint failed: ${response.status}`);
        }
      } catch (screenshotError) {
        console.log("Screenshot endpoint failed, trying simple GET...");
        
        // Method 3: Try simple GET request
        response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}&url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("All Browserless.io methods failed. Last error:", errorText);
          throw new Error(`All Browserless.io methods failed. Last error: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }
        
        const result = await response.json();
        html = result.content || result.html || result;
        console.log("Successfully got content from simple GET");
      }
    }

    console.log(`Received HTML from Browserless.io: ${html.length} characters`);
    
    if (!html || typeof html !== 'string') {
      throw new Error("No HTML content received from Browserless.io");
    }

    console.log(`Received HTML from Browserless.io: ${html.length} characters`);

    // Parse the HTML to extract conversation data
    const messages = [];
    let title = "Shared Chat";

    // Try to extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Look for __NEXT_DATA__ script tag
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const messagesData = data?.props?.pageProps?.serverResponse?.messages ||
                            data?.props?.pageProps?.messages ||
                            data?.props?.messages ||
                            data?.messages;
        
        if (Array.isArray(messagesData)) {
          for (const msg of messagesData) {
            if (msg && typeof msg === 'object') {
              const role = msg.role || msg.author_role || 'assistant';
              const content = msg.content || msg.text || msg.message || '';
              if (content && typeof content === 'string' && content.trim()) {
                messages.push({
                  role: role === 'user' ? 'user' : 'assistant',
                  content: content.trim()
                });
              }
            }
          }
        }
      } catch (e) {
        console.log('Failed to parse __NEXT_DATA__:', e);
      }
    }

    // If no messages found, try to extract from page content
    if (messages.length === 0) {
      // Look for conversation elements in HTML
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
        const regex = new RegExp(`<[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>(.*?)</[^>]*>`, 'gs');
        const matches = html.match(regex);
        if (matches) {
          for (const match of matches) {
            const text = match.replace(/<[^>]*>/g, '').trim();
            if (text && text.length > 10 && text.length < 5000) {
              // Filter out navigation and UI elements
              if (!/Continue this conversation|Log in|Sign up|Share|Copy link|Download|Regenerate|Skip to content|ChatGPT|Attach|Search|Study|Voice|By messaging ChatGPT|Terms|Privacy Policy|Loading|Error|Try again|window\.__oai|requestAnimationFrame|function\(\)|Date\.now\(\)|__oai_logHTML|__oai_SSR_HTML|__oai_logTTI|__oai_SSR_TTI/i.test(text)) {
                
                // Simple role detection
                let role = 'assistant';
                if (/^(hi|hello|hey|what|how|why|when|where|who|can you|please|help|안녕|질문|문의|도움)/i.test(text)) {
                  role = 'user';
                }
                
                messages.push({ role, content: text });
              }
            }
          }
        }
      }
    }

    if (messages.length === 0) {
      throw new Error("No conversation messages found in Browserless.io response");
    }

    // Deduplicate messages by content
    const uniqueMessages = [];
    const seenContent = new Set();
    
    for (const msg of messages) {
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
      title: title,
      messages: uniqueMessages.slice(0, 60) // Cap to keep payload reasonable
    };

  } catch (error) {
    console.error("Browserless.io parsing failed:", error);
    throw new Error(`Browserless.io parsing failed: ${error.message}`);
  }
}
