import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export interface SharePayload {
  title: string;
  messages: Array<{ role: "user" | "assistant", content: string }>;
}

/** ChatGPT parsing using Puppeteer with Chromium for Vercel deployment */
export async function fetchChatGPTSharePuppeteer(url: string): Promise<SharePayload> {
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

  let browser;
  
  try {
    console.log("Launching Puppeteer browser...");
    
    // Configure Puppeteer for Vercel deployment
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // Use Chromium for Vercel deployment
      console.log("Configuring Puppeteer for Vercel...");
      
      try {
        const executablePath = await chromium.executablePath();
        console.log("Chromium executable path:", executablePath);
        
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
        console.log("Puppeteer launched successfully on Vercel");
      } catch (error) {
        console.error("Failed to launch Puppeteer on Vercel:", error);
        throw error;
      }
    } else {
      // Use local Chrome for development
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ],
        ignoreHTTPSErrors: true,
      });
    }

    const page = await browser.newPage();
    
    // Set user agent and headers to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    console.log(`Navigating to: ${url}`);
    
    // Navigate to the ChatGPT share URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for the page to load and conversation content to appear
    console.log("Waiting for conversation content to load...");
    
    try {
      // Wait for conversation elements to appear
      await page.waitForSelector('[data-message-author-role], .conversation-turn, [class*="message"]', { 
        timeout: 15000 
      });
    } catch (e) {
      console.log("Conversation elements not found, trying alternative selectors...");
      
      // Try alternative selectors
      try {
        await page.waitForSelector('main, [role="main"], .main-content', { timeout: 10000 });
      } catch (e2) {
        console.log("No main content found, proceeding with page content...");
      }
    }

    // Wait a bit more for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Extracting conversation data...");
    
    // Extract conversation data using page.evaluate
    const conversationData = await page.evaluate(() => {
      const messages: Array<{role: "user" | "assistant", content: string}> = [];
      let title = "Shared Chat";

      // Try to get title
      const titleEl = document.querySelector('title');
      if (titleEl) {
        title = titleEl.textContent || title;
      }

      // Strategy 1: Look for __NEXT_DATA__ script tag
      const nextDataScript = document.querySelector('script#__NEXT_DATA__');
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent || '');
          const messagesData = data?.props?.pageProps?.serverResponse?.messages ||
                              data?.props?.pageProps?.messages ||
                              data?.props?.messages ||
                              data?.messages;
          
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
        } catch (e) {
          console.log('Failed to parse __NEXT_DATA__:', e);
        }
      }

      // Strategy 2: Look for conversation elements in DOM
      if (messages.length === 0) {
        const messageSelectors = [
          '[data-message-author-role]',
          '.conversation-turn',
          '[class*="message"]',
          '[class*="turn"]',
          '[class*="chat"]'
        ];

        for (const selector of messageSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent?.trim();
            if (text && text.length > 10) {
              // Try to determine role from element attributes or content
              let role: "user" | "assistant" = "assistant";
              
              const authorRole = el.getAttribute('data-message-author-role');
              if (authorRole) {
                role = authorRole === 'user' ? 'user' : 'assistant';
              } else {
                // Try to determine role from content patterns
                if (text.includes('?') || /^(hi|hello|hey|안녕|질문|문의|도움|help|can you|please|요청|what|how|why|when|where|who|중학교에서|어떤|좋을까요|흥미로울까요)/i.test(text)) {
                  role = "user";
                } else if (/^(i'm|i am|i can|i will|i would|i should|i think|i believe|here's|here is|let me|i'll|네|예|좋습니다|알겠습니다|도와드리겠습니다|철학 동아리를|다음은|예를 들어|이러한)/i.test(text)) {
                  role = "assistant";
                }
              }
              
              messages.push({ role, content: text });
            }
          }
        }
      }

      return { title, messages };
    });

    console.log(`Extracted ${conversationData.messages.length} messages`);
    
    if (conversationData.messages.length === 0) {
      throw new Error("Could not extract any conversation messages from the page");
    }

    // Deduplicate messages by content to avoid duplicates from multiple selectors
    const uniqueMessages = [];
    const seenContent = new Set();
    
    for (const msg of conversationData.messages) {
      const contentKey = msg.content.trim();
      if (!seenContent.has(contentKey)) {
        seenContent.add(contentKey);
        uniqueMessages.push(msg);
      }
    }
    
    console.log(`After deduplication: ${uniqueMessages.length} unique messages (was ${conversationData.messages.length})`);

    // Simple alternating pattern for role detection (more reliable)
    const deduped = uniqueMessages.map((message, index) => {
      const contentStr = String(message.content);
      // Simple alternating pattern: even indices = user, odd indices = assistant
      const role = index % 2 === 0 ? "user" : "assistant";
      return { role, content: contentStr };
    }).slice(0, 60); // Cap to keep payload reasonable

    console.log(`Final processed messages: ${deduped.length}`);

    return {
      title: conversationData.title,
      messages: deduped
    };

  } catch (error) {
    console.error("Puppeteer parsing failed:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
  const ALLOWED_HOSTS = new Set([
    "chatgpt.com",
    "chat.openai.com", 
    "shareg.pt"
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

  let browser;
  
  try {
    console.log("Launching Puppeteer browser for debugging...");
    
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
        ignoreHTTPSErrors: true,
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    try {
      await page.waitForSelector('[data-message-author-role], .conversation-turn, [class*="message"]', { timeout: 15000 });
    } catch (e) {
      console.log("Conversation elements not found, proceeding...");
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const debugInfo = await page.evaluate(() => {
      const patterns = [
        '__NEXT_DATA__',
        'data-message-author-role',
        'conversation-turn',
        'message',
        '[class*="message"]',
        '[class*="turn"]',
        '[class*="chat"]'
      ];

      const foundElements = patterns.map(selector => {
        const elements = document.querySelectorAll(selector);
        const samples = Array.from(elements).slice(0, 3).map(el => el.textContent?.substring(0, 100) || '');
        return {
          selector,
          count: elements.length,
          samples
        };
      });

      // Extract messages
      const messages: Array<{role: string, text: string}> = [];
      
      // Try __NEXT_DATA__ first
      const nextDataScript = document.querySelector('script#__NEXT_DATA__');
      let nextData = null;
      if (nextDataScript) {
        try {
          nextData = JSON.parse(nextDataScript.textContent || '');
          const messagesData = nextData?.props?.pageProps?.serverResponse?.messages ||
                              nextData?.props?.pageProps?.messages ||
                              nextData?.props?.messages ||
                              nextData?.messages;
          
          if (Array.isArray(messagesData)) {
            for (const msg of messagesData) {
              if (msg && typeof msg === 'object') {
                const role = msg.role || msg.author_role || 'assistant';
                const content = msg.content || msg.text || msg.message || '';
                if (content && typeof content === 'string') {
                  messages.push({ role, text: content });
                }
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse __NEXT_DATA__:', e);
        }
      }

      return {
        title: document.title,
        patterns,
        foundElements,
        messages,
        nextData
      };
    });

    const html = await page.content();

    return {
      ...debugInfo,
      html
    };

  } catch (error) {
    console.error("Puppeteer debug failed:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
