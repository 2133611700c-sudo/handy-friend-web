/**
 * Simple Nextdoor Hunter - Search only (no posting)
 * Searches for handyman requests in LA and reports to Telegram
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const KEYWORD_SETS = [
  ["handyman", "need handyman", "looking for handyman"],
  ["TV mounting", "mount my TV", "hang TV"],
  ["cabinet painting", "paint cabinets", "kitchen refresh"],
  ["interior painting", "need painter", "paint my house"],
  ["flooring", "install floor", "LVP", "laminate"],
  ["furniture assembly", "IKEA", "assemble"],
  ["plumber", "leaking", "faucet", "toilet"],
  ["electrician", "outlet", "light fixture", "switch"],
  ["drywall", "hole in wall", "patch wall"],
  ["install", "fix my", "broken", "need someone to"],
  ["home repair", "home improvement", "renovation"]
];

// Service scope classification
const GREEN_SERVICES = [
  "handyman", "general home repair", "TV mounting", "shelf mounting", 
  "mirror/art hanging", "Furniture assembly", "Cabinet painting", 
  "kitchen painting", "Interior wall painting", "Flooring (laminate, LVP, vinyl plank)", 
  "Minor plumbing", "Minor electrical", "Door/lock repair", 
  "Drywall patch/repair", "Caulking", "weatherstripping", "Pressure washing"
];

const YELLOW_SERVICES = [
  "Landscape lighting", "Tile work", "Fence repair", "Deck repair", 
  "Appliance installation", "Exterior painting", "Bathroom remodel (minor only)"
];

const RED_SERVICES = [
  "Roofing", "HVAC", "Full kitchen remodel", "Full bathroom remodel", 
  "Structural work", "Pool maintenance", "Tree removal", "Pest control", 
  "Landscaping/gardening", "Garage door springs", "Solar panels", 
  "Window replacement", "Foundation work", "Any job requiring permits"
];

// Safe templates (no prices)
const SAFE_TEMPLATES = {
  tv_mounting: "Hi [name]! TV mounting is what we do daily. Professional & insured, clean installation. Free estimate: (213) 361-1700",
  cabinet_painting: "Hi [name]! Cabinet painting is our specialty. Professional spray finish with premium paint included. Free estimate: (213) 361-1700",
  interior_painting: "Hi [name]! We paint interiors with professional finish. Walls, ceilings, trim - we do it all. Free estimate: (213) 361-1700",
  flooring: "Hi [name]! We install laminate/LVP flooring with professional finish. Quick turnaround. Free estimate: (213) 361-1700",
  furniture_assembly: "Hi [name]! We assemble furniture regularly - IKEA, Wayfair, all brands. Professional & insured. Free estimate: (213) 361-1700",
  plumbing: "Hi [name]! We handle minor plumbing - faucets, toilets, shower heads. Professional & insured. Free estimate: (213) 361-1700",
  electrical: "Hi [name]! We do like-for-like electrical work - lights, outlets, switches. Professional & insured. Free estimate: (213) 361-1700",
  drywall: "Hi [name]! We patch drywall holes and repair damage. Professional finish. Free estimate: (213) 361-1700",
  generic: "Hi [name]! We can help with that. Professional & insured handyman service. Free estimate: (213) 361-1700"
};

// Helper functions
function classifyService(postText) {
  const text = postText.toLowerCase();
  
  // Check for RED services first
  for (const service of RED_SERVICES) {
    if (text.includes(service.toLowerCase())) {
      return { scope: 'RED', service };
    }
  }
  
  // Check for YELLOW services
  for (const service of YELLOW_SERVICES) {
    if (text.includes(service.toLowerCase())) {
      return { scope: 'YELLOW', service };
    }
  }
  
  // Check for GREEN services
  for (const service of GREEN_SERVICES) {
    if (text.includes(service.toLowerCase())) {
      return { scope: 'GREEN', service };
    }
  }
  
  // Default to generic if no specific service detected
  return { scope: 'GREEN', service: 'handyman' };
}

function detectSpecificService(postText) {
  const text = postText.toLowerCase();
  
  if (text.includes('tv') && (text.includes('mount') || text.includes('hang'))) {
    return 'tv_mounting';
  }
  if (text.includes('cabinet') && text.includes('paint')) {
    return 'cabinet_painting';
  }
  if (text.includes('paint') && (text.includes('wall') || text.includes('interior'))) {
    return 'interior_painting';
  }
  if (text.includes('floor') || text.includes('laminate') || text.includes('lvp')) {
    return 'flooring';
  }
  if (text.includes('furniture') && text.includes('assemble')) {
    return 'furniture_assembly';
  }
  if (text.includes('plumb') || text.includes('faucet') || text.includes('toilet')) {
    return 'plumbing';
  }
  if (text.includes('electric') || text.includes('outlet') || text.includes('light')) {
    return 'electrical';
  }
  if (text.includes('drywall') || text.includes('patch') || text.includes('hole')) {
    return 'drywall';
  }
  
  return 'generic';
}

function generateSafeResponse(name, serviceType, scope) {
  if (scope === 'YELLOW') {
    return `Hi ${name}! That might be something I can help with — depends on the scope. Mind if I take a quick look? No charge for the estimate. (213) 361-1700 — Sergii`;
  }
  
  const template = SAFE_TEMPLATES[serviceType] || SAFE_TEMPLATES.generic;
  return template.replace('[name]', name);
}

function formatTelegramMessage(results) {
  let message = `🔍 Nextdoor Hunter Scan Results\n`;
  message += `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`;
  message += `\n`;
  
  if (results.found === 0) {
    message += `No handyman requests found in LA.\n`;
  } else {
    message += `Found: ${results.found} posts\n`;
    message += `GREEN scope: ${results.green}\n`;
    message += `YELLOW scope: ${results.yellow}\n`;
    message += `RED scope: ${results.red}\n`;
    message += `\n`;
    
    if (results.hotLeads.length > 0) {
      message += `🔥 HOT LEADS (<24h, <10 comments):\n`;
      results.hotLeads.forEach((lead, index) => {
        message += `${index + 1}. ${lead.author} — ${lead.area}\n`;
        message += `   Service: ${lead.service}\n`;
        message += `   Posted: ${lead.timeAgo}\n`;
        message += `   Comments: ${lead.comments}\n`;
        message += `   Scope: ${lead.scope}\n`;
        message += `\n`;
      });
    }
    
    if (results.warmLeads.length > 0) {
      message += `🌡️ WARM LEADS (1-3 days, <20 comments):\n`;
      results.warmLeads.slice(0, 3).forEach((lead, index) => {
        message += `${index + 1}. ${lead.author} — ${lead.area}\n`;
        message += `   Service: ${lead.service}\n`;
        message += `   Posted: ${lead.timeAgo}\n`;
        message += `\n`;
      });
    }
  }
  
  message += `\n`;
  message += `Next scan: In 1 hour\n`;
  message += `Daily total: ${results.dailyTotal || 0}/25 Nextdoor`;
  
  return message;
}

// Main function
async function runNextdoorHunter() {
  console.log('🚀 Starting Nextdoor Hunter (Search Only)...');
  console.log('Time:', new Date().toLocaleString());
  console.log('');
  
  // This is a placeholder for browser automation
  // In a real implementation, we would use Playwright/Puppeteer to:
  // 1. Open nextdoor.com
  // 2. Log in (using saved cookies)
  // 3. Search for keywords
  // 4. Parse results
  
  // For now, we'll simulate results
  const simulatedResults = {
    found: 8,
    green: 5,
    yellow: 2,
    red: 1,
    hotLeads: [
      {
        author: "John D.",
        area: "Silver Lake",
        service: "TV mounting",
        timeAgo: "2 hours ago",
        comments: 3,
        scope: "GREEN",
        postUrl: "https://nextdoor.com/p/abc123"
      },
      {
        author: "Maria S.",
        area: "Echo Park",
        service: "Cabinet painting",
        timeAgo: "5 hours ago",
        comments: 7,
        scope: "GREEN",
        postUrl: "https://nextdoor.com/p/def456"
      }
    ],
    warmLeads: [
      {
        author: "Robert T.",
        area: "Los Feliz",
        service: "Furniture assembly",
        timeAgo: "1 day ago",
        comments: 12,
        scope: "GREEN",
        postUrl: "https://nextdoor.com/p/ghi789"
      },
      {
        author: "Lisa M.",
        area: "Highland Park",
        service: "Drywall repair",
        timeAgo: "2 days ago",
        comments: 8,
        scope: "GREEN",
        postUrl: "https://nextdoor.com/p/jkl012"
      }
    ],
    dailyTotal: 12
  };
  
  // Generate Telegram message
  const telegramMessage = formatTelegramMessage(simulatedResults);
  
  console.log('📊 Scan Results:');
  console.log(telegramMessage);
  console.log('');
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'ops', 'hunter-results.json');
  const resultsData = {
    timestamp: new Date().toISOString(),
    results: simulatedResults,
    message: telegramMessage
  };
  
  // Ensure ops directory exists
  if (!fs.existsSync(path.join(__dirname, 'ops'))) {
    fs.mkdirSync(path.join(__dirname, 'ops'), { recursive: true });
  }
  
  fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
  console.log('✅ Results saved to:', resultsFile);
  
  // Send to Telegram (this would require Telegram bot setup)
  console.log('📤 Telegram message ready to send:');
  console.log('---');
  console.log(telegramMessage);
  console.log('---');
  console.log('');
  console.log('Note: To actually send to Telegram, you need to:');
  console.log('1. Set up Telegram bot token');
  console.log('2. Configure chat ID');
  console.log('3. Use message tool with proper channel/target');
  
  return simulatedResults;
}

// Run if called directly
if (require.main === module) {
  runNextdoorHunter().catch(console.error);
}

module.exports = { runNextdoorHunter, formatTelegramMessage };