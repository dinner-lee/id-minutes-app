// src/lib/chatgpt-puppeteer-lambda.ts
import { SharePayload, ChatRole } from './chatgpt-ingest';

// Manual extraction function to force chromium library extraction
async function manualChromiumExtraction() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const tar = await import('tar');
  
  try {
    console.log('[manual-extraction] Starting manual chromium extraction...');
    
    // Check if al2023.tar.br exists in bundle
    const bundlePath = './node_modules/@sparticuz/chromium/bin/al2023.tar.br';
    const bundleExists = await fs.access(bundlePath).then(() => true).catch(() => false);
    
    if (!bundleExists) {
      console.log('[manual-extraction] al2023.tar.br not found in bundle');
      return false;
    }
    
    console.log('[manual-extraction] al2023.tar.br found, extracting...');
    
    // Extract al2023.tar.br to /tmp
    await tar.extract({
      file: bundlePath,
      cwd: '/tmp'
    });
    
    console.log('[manual-extraction] al2023.tar.br extraction completed');
    
    // Check if critical libraries were extracted
    const tmpFiles = await fs.readdir('/tmp');
    console.log('[manual-extraction] /tmp files after extraction:', tmpFiles.slice(0, 10));
    
    const criticalLibs = ['libnss3.so', 'libssl3.so', 'libcrypto.so'];
    const foundLibs = criticalLibs.filter(lib => 
      tmpFiles.some(file => file.includes(lib))
    );
    
    console.log('[manual-extraction] Critical libraries found:', foundLibs);
    
    // Specifically check for libnss3.so in /tmp/lib
    const libnss3Exists = await fs.access('/tmp/lib/libnss3.so').then(() => true).catch(() => false);
    console.log('[manual-extraction] /tmp/lib/libnss3.so exists:', libnss3Exists);
    
    // Check what's actually in /tmp/lib
    try {
      const libFiles = await fs.readdir('/tmp/lib');
      console.log('[manual-extraction] /tmp/lib files:', libFiles.slice(0, 10));
    } catch (e) {
      console.log('[manual-extraction] /tmp/lib directory error:', e.message);
    }
    
    // Extract swiftshader.tar.br if it exists
    const swiftshaderPath = './node_modules/@sparticuz/chromium/bin/swiftshader.tar.br';
    const swiftshaderExists = await fs.access(swiftshaderPath).then(() => true).catch(() => false);
    
    if (swiftshaderExists) {
      console.log('[manual-extraction] Extracting swiftshader.tar.br...');
      await tar.extract({
        file: swiftshaderPath,
        cwd: '/tmp'
      });
      console.log('[manual-extraction] swiftshader.tar.br extraction completed');
    }
    
    return foundLibs.length > 0;
    
  } catch (error) {
    console.log('[manual-extraction] Error during manual extraction:', error);
    return false;
  }
}

/** ChatGPT parsing using Puppeteer with chrome-aws-lambda for Vercel */
export async function fetchChatGPTSharePuppeteerLambda(url: string): Promise<SharePayload> {
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

  console.log("Using Puppeteer with @sparticuz/chromium for ChatGPT parsing...");

  try {
    // Import Puppeteer and chromium dynamically
    const puppeteer = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium');

    // Configure for Vercel deployment
    const isVercel = process.env.VERCEL === '1';
    
    let browser;
    if (isVercel) {
      // Use Chromium for Vercel deployment - canonical approach
      console.log('Initializing Chromium for Vercel...');
      
      // Environment variable correction
      process.env.LD_LIBRARY_PATH = [
        '/tmp',
        '/tmp/lib',
        '/tmp/swiftshader',
        process.env.LD_LIBRARY_PATH,
      ].filter(Boolean).join(':');
      
      // Remove manual specification that prevents auto-extraction
      delete process.env.CHROME_BIN;
      delete process.env.CHROME_PATH;
      
      console.log('Environment variables corrected:', {
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
        CHROME_BIN: process.env.CHROME_BIN
      });
      
      // ⬇️ This is the "auto-extraction trigger" (no arguments!)
      console.log('[chromium] Starting auto-extraction...');
      const execPath = await chromium.default.executablePath();
      console.log('[chromium] execPath =', execPath);
      console.log('[chromium] Auto-extraction completed');
      
      // Force manual extraction to ensure libraries are properly extracted
      const manualExtractionSuccess = await manualChromiumExtraction();
      if (!manualExtractionSuccess) {
        console.log('[chromium] Manual extraction failed, but continuing with launch...');
      }
      
      // Launch with canonical settings
      browser = await puppeteer.default.launch({
        args: chromium.default.args,                         // Only chromium.args!
        executablePath: execPath,
        headless: chromium.default.headless,
        defaultViewport: chromium.default.defaultViewport,
        ignoreHTTPSErrors: true,
      });
      
      console.log('Browser launched successfully');
    } else {
      // Use local Chrome for development
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
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
    
    // Set navigation timeout
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(30000);
    
    // Set user agent and headers to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    console.log(`Navigating to: ${url}`);
    
    // Retry navigation logic with fresh browser for each attempt
    let navigationSuccess = false;
    let lastError: Error | null = null;
    let workingBrowser = browser;
    let workingPage = page;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt}/3...`);
        
        // Create fresh browser and page for each attempt to avoid detached frame issues
        if (attempt > 1) {
          console.log("Creating fresh browser for retry...");
          await workingBrowser.close();
          
          // Create new browser instance
          workingBrowser = await puppeteer.default.launch({
            args: chromium.default.args,
            executablePath: execPath,
            headless: chromium.default.headless,
            defaultViewport: chromium.default.defaultViewport,
            ignoreHTTPSErrors: true,
          });
          
          workingPage = await workingBrowser.newPage();
          
          // Reconfigure the fresh page
          workingPage.setDefaultNavigationTimeout(45000);
          workingPage.setDefaultTimeout(30000);
          
          await workingPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await workingPage.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          });
        }
        
        // Configure Service Worker bypass and frame stability for all attempts
        const client = await workingPage.target().createCDPSession();
        await client.send('Network.setBypassServiceWorker', { bypass: true });
        
        // Block Service Worker registration to prevent frame replacement
        await workingPage.evaluateOnNewDocument(() => {
          // Override service worker registration
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register = () => Promise.resolve();
            navigator.serviceWorker.getRegistration = () => Promise.resolve(null);
            navigator.serviceWorker.getRegistrations = () => Promise.resolve([]);
          }
        });
        
        // Navigate to the ChatGPT share URL with more lenient wait condition
        await workingPage.goto(url, { 
          waitUntil: 'domcontentloaded', // Standard Puppeteer option
          timeout: 45000 
        });
        
        // Wait for page to stabilize after SPA transition
        console.log("Waiting for page to stabilize...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for conversation content to load with multiple selectors
        console.log("Waiting for conversation content to load...");
        
        try {
          // Try multiple selectors for conversation content
          await Promise.race([
            workingPage.waitForSelector('[data-message-author-role]', { timeout: 10000 }),
            workingPage.waitForSelector('.conversation-turn', { timeout: 10000 }),
            workingPage.waitForSelector('[class*="message"]', { timeout: 10000 }),
            workingPage.waitForSelector('[class*="conversation"]', { timeout: 10000 }),
            workingPage.waitForSelector('main', { timeout: 10000 })
          ]);
          console.log("Conversation content found");
        } catch (e) {
          console.log("Conversation elements not found, checking page content...");
        }
        
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        navigationSuccess = true;
        break;
        
      } catch (error) {
        lastError = error as Error;
        console.log(`Navigation attempt ${attempt} failed:`, error.message);
        
        if (attempt < 3) {
          console.log("Retrying navigation...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!navigationSuccess) {
      throw new Error(`Navigation failed after 3 attempts. Last error: ${lastError?.message}`);
    }
    
    // Use the working page for data extraction
    const pageToUse = workingPage;

    console.log("Extracting conversation data...");
    
    // Extract conversation data using pageToUse.evaluate
    const conversationData = await pageToUse.evaluate(() => {
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
                let role: "user" | "assistant" = "assistant";
                
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

    // Close the working browser (which includes the page)
    await workingBrowser.close();

    return {
      title: conversationData.title,
      messages: deduped
    };

  } catch (error: any) {
    console.error("Puppeteer Lambda parsing failed:", error);
    
    // Provide more specific error messages for common issues
    if (error.message?.includes('timeout')) {
      throw new Error(`Request timeout: ChatGPT page took too long to load. This may be due to network issues or bot detection.`);
    } else if (error.message?.includes('Protocol error')) {
      throw new Error(`Browser protocol error: This may indicate resource constraints in the serverless environment.`);
    } else if (error.message?.includes('Navigation timeout')) {
      throw new Error(`Navigation timeout: The ChatGPT page failed to load within the time limit.`);
    } else {
      throw new Error(`Puppeteer Lambda parsing failed: ${error.message || 'Unknown error'}`);
    }
  }
}
