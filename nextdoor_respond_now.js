#!/usr/bin/env node

/**
 * Nextdoor Respond NOW Script
 * For responding to 3 specific cleaning/handyman requests in Nextdoor LA feed
 * 
 * Targets:
 * 1. Neda Kasher (housekeeper for Thursday dinner guests)
 * 2. Elise Andrews (handyman/construction worker)  
 * 3. Brigitte Davis (deep clean apartment)
 * 
 * Posts comments from personal account Sergii KUROPIATNYK
 * Uses safe templates without prices
 * Includes Handy & Friend branding and phone (213) 361-1700
 */

const { chromium } = require('playwright');

// Safe response templates (no prices)
const RESPONSE_TEMPLATES = {
  // For Neda Kasher - housekeeper for Thursday dinner guests
  neda_kasher: `Hi Neda! Getting ready for Thursday dinner guests? Our professional housekeeping team can help with deep cleaning, kitchen sanitization, and making your home guest-ready. We're insured and available on short notice. Free estimate: (213) 361-1700 - Sergii from Handy & Friend`,

  // For Elise Andrews - handyman/construction worker
  elise_andrews: `Hi Elise! We handle a wide range of handyman and construction work - from repairs and installations to small renovation projects. Professional, licensed, and insured team. Free estimate: (213) 361-1700 - Sergii from Handy & Friend`,

  // For Brigitte Davis - deep clean apartment
  brigitte_davis: `Hi Brigitte! Deep cleaning apartments is our specialty. We do thorough cleaning of kitchens (appliances, cabinets), bathrooms (tile, grout), floors, windows, and all surfaces. Professional team with eco-friendly products. Free estimate: (213) 361-1700 - Sergii from Handy & Friend`
};

// Configuration
const CONFIG = {
  // Nextdoor login credentials (should be in environment variables)
  NEXTDOOR_EMAIL: process.env.NEXTDOOR_EMAIL || '',
  NEXTDOOR_PASSWORD: process.env.NEXTDOOR_PASSWORD || '',
  
  // Post URLs (need to be found manually first)
  POST_URLS: {
    neda_kasher: '', // Need to find this URL
    elise_andrews: '', // Need to find this URL  
    brigitte_davis: '' // Need to find this URL
  },
  
  // Browser settings
  HEADLESS: false, // Set to true for headless mode
  SLOW_MO: 1000, // Slow down for debugging
  TIMEOUT: 30000 // 30 second timeout
};

async function loginToNextdoor(page) {
  console.log('🔐 Logging into Nextdoor...');
  
  // Go to Nextdoor login page
  await page.goto('https://nextdoor.com/login/');
  
  // Wait for login form
  await page.waitForSelector('input[name="email"]', { timeout: CONFIG.TIMEOUT });
  
  // Fill in credentials
  await page.fill('input[name="email"]', CONFIG.NEXTDOOR_EMAIL);
  await page.fill('input[name="password"]', CONFIG.NEXTDOOR_PASSWORD);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for login to complete (check for feed or profile)
  await page.waitForSelector('[data-testid="feed"]', { timeout: CONFIG.TIMEOUT });
  
  console.log('✅ Logged in successfully');
}

async function findPostByAuthor(page, authorName, searchQuery) {
  console.log(`🔍 Searching for post by ${authorName}...`);
  
  // Go to search
  await page.goto('https://nextdoor.com/search/');
  
  // Enter search query
  await page.fill('input[placeholder*="Search"]', searchQuery);
  await page.keyboard.press('Enter');
  
  // Wait for results
  await page.waitForSelector('[data-testid="search-results"]', { timeout: CONFIG.TIMEOUT });
  
  // Look for posts by author name
  // This is simplified - actual implementation would need to parse results
  const posts = await page.$$('[data-testid="post"]');
  
  for (const post of posts) {
    const authorElement = await post.$('[data-testid="author-name"]');
    if (authorElement) {
      const authorText = await authorElement.textContent();
      if (authorText.includes(authorName)) {
        // Get post URL
        const linkElement = await post.$('a[href*="/p/"]');
        if (linkElement) {
          const href = await linkElement.getAttribute('href');
          return `https://nextdoor.com${href}`;
        }
      }
    }
  }
  
  return null;
}

async function postComment(page, postUrl, commentText) {
  console.log(`💬 Posting comment on ${postUrl}...`);
  
  // Go to the post
  await page.goto(postUrl);
  
  // Wait for post to load
  await page.waitForSelector('[data-testid="post-content"]', { timeout: CONFIG.TIMEOUT });
  
  // Find comment box
  const commentBox = await page.$('textarea[placeholder*="Add a comment"]');
  if (!commentBox) {
    console.log('❌ Could not find comment box');
    return false;
  }
  
  // Type comment
  await commentBox.click();
  await commentBox.fill(commentText);
  
  // Submit comment
  const submitButton = await page.$('button[type="submit"]');
  if (submitButton) {
    await submitButton.click();
    
    // Wait for comment to appear
    await page.waitForTimeout(2000);
    
    // Check if comment was posted
    const comments = await page.$$('[data-testid="comment"]');
    const lastComment = comments[comments.length - 1];
    if (lastComment) {
      const commentTextContent = await lastComment.textContent();
      if (commentTextContent.includes(commentText.substring(0, 50))) {
        console.log('✅ Comment posted successfully');
        return true;
      }
    }
  }
  
  console.log('❌ Failed to post comment');
  return false;
}

async function main() {
  console.log('🚀 Starting Nextdoor Respond NOW script');
  console.log('========================================\n');
  
  // Check for credentials
  if (!CONFIG.NEXTDOOR_EMAIL || !CONFIG.NEXTDOOR_PASSWORD) {
    console.log('❌ Nextdoor credentials not found in environment variables');
    console.log('Please set NEXTDOOR_EMAIL and NEXTDOOR_PASSWORD environment variables');
    process.exit(1);
  }
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: CONFIG.HEADLESS,
    slowMo: CONFIG.SLOW_MO
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login
    await loginToNextdoor(page);
    
    // Step 2: Find posts (if URLs not provided)
    const postsToRespond = [];
    
    for (const [key, url] of Object.entries(CONFIG.POST_URLS)) {
      if (!url) {
        // Need to find post
        let searchQuery = '';
        let authorName = '';
        
        switch(key) {
          case 'neda_kasher':
            authorName = 'Neda Kasher';
            searchQuery = 'housekeeper Thursday dinner guests';
            break;
          case 'elise_andrews':
            authorName = 'Elise Andrews';
            searchQuery = 'handyman construction worker';
            break;
          case 'brigitte_davis':
            authorName = 'Brigitte Davis';
            searchQuery = 'deep clean apartment';
            break;
        }
        
        const foundUrl = await findPostByAuthor(page, authorName, searchQuery);
        if (foundUrl) {
          postsToRespond.push({
            key,
            authorName,
            url: foundUrl,
            comment: RESPONSE_TEMPLATES[key]
          });
          console.log(`✅ Found post by ${authorName}: ${foundUrl}`);
        } else {
          console.log(`❌ Could not find post by ${authorName}`);
        }
      } else {
        // URL provided
        let authorName = '';
        switch(key) {
          case 'neda_kasher': authorName = 'Neda Kasher'; break;
          case 'elise_andrews': authorName = 'Elise Andrews'; break;
          case 'brigitte_davis': authorName = 'Brigitte Davis'; break;
        }
        
        postsToRespond.push({
          key,
          authorName,
          url,
          comment: RESPONSE_TEMPLATES[key]
        });
      }
    }
    
    // Step 3: Post comments
    console.log('\n📝 Posting comments...');
    let successCount = 0;
    
    for (const post of postsToRespond) {
      console.log(`\n--- Responding to ${post.authorName} ---`);
      console.log(`URL: ${post.url}`);
      console.log(`Comment: ${post.comment.substring(0, 100)}...`);
      
      const success = await postComment(page, post.url, post.comment);
      if (success) {
        successCount++;
        
        // Record the lead (simplified)
        console.log(`📊 Recorded response to ${post.authorName}`);
        
        // Wait between posts to avoid rate limiting
        if (postsToRespond.indexOf(post) < postsToRespond.length - 1) {
          console.log('⏳ Waiting 2 minutes before next comment...');
          await page.waitForTimeout(120000); // 2 minutes
        }
      }
    }
    
    console.log(`\n✅ Done! Successfully responded to ${successCount} out of ${postsToRespond.length} posts`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close browser
    await browser.close();
    console.log('\n👋 Browser closed');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { RESPONSE_TEMPLATES, CONFIG };