#!/usr/bin/env node

/**
 * Nextdoor Hunter - Safe Templates (No Prices)
 * 
 * This script simulates the Nextdoor Hunter skill:
 * 1. Searches for handyman requests in LA (simulated)
 * 2. Uses safe templates without prices
 * 3. Generates Telegram alert
 * 
 * In a real implementation, this would use browser automation
 * to actually log into Nextdoor and search.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // LA neighborhoods in service area
  SERVICE_AREAS: [
    'Silver Lake', 'Echo Park', 'Los Feliz', 'Highland Park',
    'Atwater Village', 'Mount Washington', 'Eagle Rock', 'Glassell Park',
    'Cypress Park', 'Lincoln Heights', 'Boyle Heights', 'Downtown LA',
    'Westlake', 'Koreatown', 'Hollywood', 'East Hollywood'
  ],
  
  // Maximum posts to process per scan
  MAX_POSTS_PER_SCAN: 8,
  
  // Maximum responses per day
  MAX_RESPONSES_PER_DAY: 25,
  
  // Telegram configuration (would come from env vars in real implementation)
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || null,
  
  // Hunter API secret (for recording leads)
  HUNTER_API_SECRET: process.env.HUNTER_API_SECRET || null,
  
  // API endpoint
  HUNTER_API_URL: 'https://handyandfriend.com/api/hunter-lead'
};

// Safe templates (no prices) - from SKILL-safe.md
const SAFE_TEMPLATES = {
  // Service-specific templates
  tv_mounting: "Hi [name]! TV mounting is what we do daily. Professional & insured, clean installation. Free estimate: (213) 361-1700",
  cabinet_painting: "Hi [name]! Cabinet painting is our specialty. Professional spray finish with premium paint included. Free estimate: (213) 361-1700",
  interior_painting: "Hi [name]! We paint interiors with professional finish. Walls, ceilings, trim - we do it all. Free estimate: (213) 361-1700",
  flooring: "Hi [name]! We install laminate/LVP flooring with professional finish. Quick turnaround. Free estimate: (213) 361-1700",
  furniture_assembly: "Hi [name]! We assemble furniture regularly - IKEA, Wayfair, all brands. Professional & insured. Free estimate: (213) 361-1700",
  plumbing: "Hi [name]! We handle minor plumbing - faucets, toilets, shower heads. Professional & insured. Free estimate: (213) 361-1700",
  electrical: "Hi [name]! We do like-for-like electrical work - lights, outlets, switches. Professional & insured. Free estimate: (213) 361-1700",
  drywall: "Hi [name]! We patch drywall holes and repair damage. Professional finish. Free estimate: (213) 361-1700",
  art_mirrors: "Hi [name]! We hang art, mirrors, shelves with precision. Professional & insured. Free estimate: (213) 361-1700",
  door_installation: "Hi [name]! We install interior and exterior doors professionally. Clean setup. Free estimate: (213) 361-1700",
  vanity_installation: "Hi [name]! We install bathroom vanities professionally. Clean work. Free estimate: (213) 361-1700",
  backsplash: "Hi [name]! We install kitchen backsplash - tile or peel & stick. Professional finish. Free estimate: (213) 361-1700",
  
  // Generic templates
  generic_green: "Hi [name]! We can help with that. Professional & insured handyman service. Free estimate: (213) 361-1700",
  yellow_scope: "Hi [name]! That might be something I can help with — depends on the scope. Mind if I take a quick look? No charge for the estimate. (213) 361-1700 — Sergii"
};

// Service scope classification
const SCOPE_FILTER = {
  GREEN: [
    'handyman', 'general home repair', 'TV mounting', 'shelf mounting', 
    'mirror/art hanging', 'Furniture assembly', 'Cabinet painting', 
    'kitchen painting', 'Interior wall painting', 'Flooring (laminate, LVP, vinyl plank)', 
    'Minor plumbing', 'Minor electrical', 'Door/lock repair', 
    'Drywall patch/repair', 'Caulking', 'weatherstripping', 'Pressure washing'
  ],
  
  YELLOW: [
    'Landscape lighting', 'Tile work', 'Fence repair', 'Deck repair', 
    'Appliance installation', 'Exterior painting', 'Bathroom remodel (minor only)'
  ],
  
  RED: [
    'Roofing', 'HVAC', 'Full kitchen remodel', 'Full bathroom remodel', 
    'Structural work', 'Pool maintenance', 'Tree removal', 'Pest control', 
    'Landscaping/gardening', 'Garage door springs', 'Solar panels', 
    'Window replacement', 'Foundation work', 'Any job requiring permits'
  ]
};

// Simulated search results (in real implementation, this would come from browser automation)
function simulateNextdoorSearch() {
  console.log('🔍 Simulating Nextdoor search for handyman requests in LA...');
  
  // Simulate finding posts
  const posts = [
    {
      id: 'post_001',
      url: 'https://nextdoor.com/p/abc123',
      author: 'John D.',
      area: 'Silver Lake',
      text: 'Looking for someone to mount my 65" TV on the wall. Need it done this week.',
      service: 'TV mounting',
      timeAgo: '2 hours ago',
      comments: 3,
      isRequesting: true,
      datePosted: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: 'post_002',
      url: 'https://nextdoor.com/p/def456',
      author: 'Maria S.',
      area: 'Echo Park',
      text: 'Need kitchen cabinets painted. Looking for professional with spray finish.',
      service: 'Cabinet painting',
      timeAgo: '5 hours ago',
      comments: 7,
      isRequesting: true,
      datePosted: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
    },
    {
      id: 'post_003',
      url: 'https://nextdoor.com/p/ghi789',
      author: 'Robert T.',
      area: 'Los Feliz',
      text: 'IKEA furniture assembly needed - bed frame and dresser.',
      service: 'Furniture assembly',
      timeAgo: '1 day ago',
      comments: 12,
      isRequesting: true,
      datePosted: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      id: 'post_004',
      url: 'https://nextdoor.com/p/jkl012',
      author: 'Lisa M.',
      area: 'Highland Park',
      text: 'Drywall repair needed - small hole from door handle.',
      service: 'Drywall repair',
      timeAgo: '2 days ago',
      comments: 8,
      isRequesting: true,
      datePosted: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
    },
    {
      id: 'post_005',
      url: 'https://nextdoor.com/p/mno345',
      author: 'David K.',
      area: 'Atwater Village',
      text: 'Need plumber to fix leaking faucet in kitchen.',
      service: 'Plumbing',
      timeAgo: '3 hours ago',
      comments: 5,
      isRequesting: true,
      datePosted: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    },
    {
      id: 'post_006',
      url: 'https://nextdoor.com/p/pqr678',
      author: 'Sarah L.',
      area: 'Boyle Heights',
      text: 'Looking for roofing contractor to replace entire roof.',
      service: 'Roofing',
      timeAgo: '1 day ago',
      comments: 15,
      isRequesting: true,
      datePosted: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      id: 'post_007',
      url: 'https://nextdoor.com/p/stu901',
      author: 'Mike R.',
      area: 'Downtown LA',
      text: 'Need exterior painting for my house - 2 story.',
      service: 'Exterior painting',
      timeAgo: '6 hours ago',
      comments: 4,
      isRequesting: true,
      datePosted: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      id: 'post_008',
      url: 'https://nextdoor.com/p/vwx234',
      author: 'Jennifer P.',
      area: 'Koreatown',
      text: 'Looking for handyman for various small repairs around the house.',
      service: 'General handyman',
      timeAgo: '4 hours ago',
      comments: 2,
      isRequesting: true,
      datePosted: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    }
  ];
  
  console.log(`✅ Found ${posts.length} potential posts`);
  return posts;
}

// Classify service scope
function classifyServiceScope(postText, service) {
  const text = postText.toLowerCase();
  
  // Check RED scope first
  for (const redService of SCOPE_FILTER.RED) {
    if (text.includes(redService.toLowerCase()) || 
        (service && service.toLowerCase().includes(redService.toLowerCase()))) {
      return 'RED';
    }
  }
  
  // Check YELLOW scope
  for (const yellowService of SCOPE_FILTER.YELLOW) {
    if (text.includes(yellowService.toLowerCase()) || 
        (service && service.toLowerCase().includes(yellowService.toLowerCase()))) {
      return 'YELLOW';
    }
  }
  
  // Check GREEN scope
  for (const greenService of SCOPE_FILTER.GREEN) {
    if (text.includes(greenService.toLowerCase()) || 
        (service && service.toLowerCase().includes(greenService.toLowerCase()))) {
      return 'GREEN';
    }
  }
  
  // Default to GREEN for general handyman requests
  if (text.includes('handyman') || text.includes('repair') || text.includes('fix')) {
    return 'GREEN';
  }
  
  // If we can't classify, be conservative and don't respond
  return 'UNKNOWN';
}

// Detect specific service type
function detectServiceType(postText) {
  const text = postText.toLowerCase();
  
  if (text.includes('tv') && (text.includes('mount') || text.includes('hang'))) {
    return 'tv_mounting';
  }
  if ((text.includes('cabinet') || text.includes('kitchen')) && text.includes('paint')) {
    return 'cabinet_painting';
  }
  if (text.includes('paint') && (text.includes('wall') || text.includes('interior') || text.includes('room'))) {
    return 'interior_painting';
  }
  if (text.includes('floor') || text.includes('laminate') || text.includes('lvp')) {
    return 'flooring';
  }
  if (text.includes('furniture') && text.includes('assemble')) {
    return 'furniture_assembly';
  }
  if (text.includes('plumb') || text.includes('faucet') || text.includes('toilet') || text.includes('leak')) {
    return 'plumbing';
  }
  if (text.includes('electric') || text.includes('outlet') || text.includes('light') || text.includes('switch')) {
    return 'electrical';
  }
  if (text.includes('drywall') || text.includes('patch') || text.includes('hole')) {
    return 'drywall';
  }
  if ((text.includes('art') || text.includes('mirror') || text.includes('shelf')) && text.includes('hang')) {
    return 'art_mirrors';
  }
  if (text.includes('door') && text.includes('install')) {
    return 'door_installation';
  }
  if (text.includes('vanity') && text.includes('install')) {
    return 'vanity_installation';
  }
  if (text.includes('backsplash')) {
    return 'backsplash';
  }
  
  return 'generic';
}

// Generate safe response
function generateSafeResponse(author, area, serviceType, scope) {
  if (scope === 'YELLOW') {
    return SAFE_TEMPLATES.yellow_scope.replace('[name]', author);
  }
  
  const templateKey = SAFE_TEMPLATES[serviceType] ? serviceType : 'generic_green';
  return SAFE_TEMPLATES[templateKey].replace('[name]', author);
}

// Calculate priority
function calculatePriority(post, scope) {
  if (scope === 'RED') {
    return 'SKIP';
  }
  
  const hoursAgo = (Date.now() - post.datePosted.getTime()) / (1000 * 60 * 60);
  const comments = post.comments || 0;
  
  if (hoursAgo < 24 && comments < 10) {
    return 'HOT';
  } else if (hoursAgo < 72 && comments < 20) {
    return 'WARM';
  } else if (hoursAgo < 168 && comments < 30) {
    return 'COOL';
  }
  
  return 'SKIP';
}

// Filter and process posts
function processPosts(posts) {
  console.log('\n📋 Processing posts...');
  
  const results = {
    total: posts.length,
    filtered: 0,
    green: 0,
    yellow: 0,
    red: 0,
    unknown: 0,
    hot: [],
    warm: [],
    cool: [],
    skipped: []
  };
  
  for (const post of posts) {
    // Check if post is requesting (not offering)
    if (!post.isRequesting) {
      results.skipped.push({ post, reason: 'Not requesting service' });
      continue;
    }
    
    // Check if area is in service area
    if (!CONFIG.SERVICE_AREAS.some(area => post.area.toLowerCase().includes(area.toLowerCase()))) {
      results.skipped.push({ post, reason: 'Outside service area' });
      continue;
    }
    
    // Classify scope
    const scope = classifyServiceScope(post.text, post.service);
    const serviceType = detectServiceType(post.text);
    const priority = calculatePriority(post, scope);
    
    // Skip RED scope
    if (scope === 'RED') {
      results.red++;
      results.skipped.push({ post, reason: 'RED scope - not responding', scope, serviceType });
      continue;
    }
    
    // Skip UNKNOWN scope
    if (scope === 'UNKNOWN') {
      results.unknown++;
      results.skipped.push({ post, reason: 'Unknown scope - not responding', scope, serviceType });
      continue;
    }
    
    // Count by scope
    if (scope === 'GREEN') results.green++;
    if (scope === 'YELLOW') results.yellow++;
    
    // Generate response
    const response = generateSafeResponse(post.author, post.area, serviceType, scope);
    
    // Add to results
    const processedPost = {
      ...post,
      scope,
      serviceType,
      priority,
      response,
      responseLength: response.length
    };
    
    results.filtered++;
    
    // Categorize by priority
    if (priority === 'HOT') {
      results.hot.push(processedPost);
    } else if (priority === 'WARM') {
      results.warm.push(processedPost);
    } else if (priority === 'COOL') {
      results.cool.push(processedPost);
    } else {
      results.skipped.push({ post: processedPost, reason: 'Low priority', scope, serviceType });
    }
  }
  
  return results;
}

// Format Telegram message
function formatTelegramAlert(results) {
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    hour12: true,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let message = `🔍 Nextdoor Hunter Scan Complete (Safe Templates)\n`;
  message += `Time: ${timeStr} PT\n\n`;
  
  message += `📊 Summary:\n`;
  message += `Found: ${results.total} posts\n`;
  message += `Filtered: ${results.filtered} posts\n`;
  message += `GREEN scope: ${results.green}\n`;
  message += `YELLOW scope: ${results.yellow}\n`;
  message += `RED scope: ${results.red}\n`;
  message += `Unknown: ${results.unknown}\n\n`;
  
  if (results.hot.length > 0) {
    message += `🔥 HOT LEADS (<24h, <10 comments):\n`;
    results.hot.forEach((post, i) => {
      message += `${i + 1}. ${post.author} — ${post.area}\n`;
      message += `   Service: ${post.serviceType}\n`;
      message += `   Posted: ${post.timeAgo}, ${post.comments} comments\n`;
      message += `   Scope: ${post.scope}\n`;
      message += `   Response: "${post.response.substring(0, 60)}..."\n\n`;
    });
  }
  
  if (results.warm.length > 0) {
    message += `🌡️ WARM LEADS (1-3 days,