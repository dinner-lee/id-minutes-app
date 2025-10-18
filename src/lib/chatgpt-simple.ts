// src/lib/chatgpt-simple.ts
import { SharePayload } from './chatgpt-ingest';

/** Simple ChatGPT parsing using direct fetch with better headers */
export async function fetchChatGPTShareSimple(url: string): Promise<SharePayload> {
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

  console.log("Using simple fetch for ChatGPT parsing...");

  try {
    // Try with different user agents and headers
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    for (const userAgent of userAgents) {
      try {
        console.log(`Trying with user agent: ${userAgent.substring(0, 50)}...`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          console.log(`Response not OK: ${response.status} ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        console.log(`Received HTML: ${html.length} characters`);

        // Look for conversation data in the HTML
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

        // If we found messages, return them
        if (messages.length > 0) {
          console.log(`Found ${messages.length} messages via simple fetch`);
          return {
            title,
            messages: messages.slice(0, 60) // Cap to keep payload reasonable
          };
        }

        // Try to extract from meta tags or other sources
        const metaDescription = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        if (metaDescription && metaDescription[1].length > 50) {
          // This might be a conversation summary
          messages.push({
            role: 'assistant',
            content: metaDescription[1]
          });
          
          console.log(`Found content via meta description: ${metaDescription[1].substring(0, 100)}...`);
        }

        // Try to extract from other script tags that might contain conversation data
        const scriptTags = html.match(/<script[^>]*>(.*?)<\/script>/gs);
        if (scriptTags) {
          for (const scriptTag of scriptTags) {
            const scriptContent = scriptTag.replace(/<\/?script[^>]*>/g, '');
            if (scriptContent.includes('conversation') || scriptContent.includes('messages') || scriptContent.includes('chat')) {
              try {
                // Look for JSON-like data in script content
                const jsonMatch = scriptContent.match(/\{[\s\S]*"messages"[\s\S]*\}/);
                if (jsonMatch) {
                  const data = JSON.parse(jsonMatch[0]);
                  if (data.messages && Array.isArray(data.messages)) {
                    for (const msg of data.messages) {
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
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }

        // Try to extract from page content using regex patterns
        const conversationPatterns = [
          /<div[^>]*class="[^"]*message[^"]*"[^>]*>(.*?)<\/div>/gs,
          /<div[^>]*class="[^"]*conversation[^"]*"[^>]*>(.*?)<\/div>/gs,
          /<div[^>]*class="[^"]*chat[^"]*"[^>]*>(.*?)<\/div>/gs,
          /<p[^>]*class="[^"]*message[^"]*"[^>]*>(.*?)<\/p>/gs
        ];

        for (const pattern of conversationPatterns) {
          const matches = html.match(pattern);
          if (matches) {
            for (const match of matches) {
              const text = match.replace(/<[^>]*>/g, '').trim();
              if (text && text.length > 10 && text.length < 2000) {
                // Simple role detection based on content
                let role = 'assistant';
                if (/^(hi|hello|hey|what|how|why|when|where|who|can you|please|help|안녕|질문|문의|도움)/i.test(text)) {
                  role = 'user';
                }
                messages.push({ role, content: text });
              }
            }
          }
        }

        // If we found any messages, return them
        if (messages.length > 0) {
          console.log(`Found ${messages.length} messages via simple fetch`);
          return {
            title,
            messages: messages.slice(0, 60) // Cap to keep payload reasonable
          };
        }

      } catch (fetchError) {
        console.log(`Fetch failed with user agent ${userAgent.substring(0, 20)}:`, fetchError.message);
        continue;
      }
    }

    throw new Error("Could not extract conversation content with any user agent");

  } catch (error) {
    console.error("Simple fetch parsing failed:", error);
    throw new Error(`Simple fetch parsing failed: ${error.message}`);
  }
}
