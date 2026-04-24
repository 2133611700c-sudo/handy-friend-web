const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get cookies from Chrome via Python
function getChromeCookies() {
  const script = `
from pycookiecheat import chrome_cookies
import json
cookies = chrome_cookies("https://nextdoor.com/")
print(json.dumps(cookies))
`;
  const result = execSync(`python3 -c "${script.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, { timeout: 15000 });
  return JSON.parse(result.toString());
}

const posts = [
  {
    title: "Recommend: interior painter in Silver Lake — did our living room last week",
    body: `Sharing because I wish someone had told me about this sooner.

We had the same beige walls for 8 years. Finally decided to do something about it. Found Handy & Friend through a friend — they came out same day to look, gave us a quote on the spot.

Living room + hallway, 2-coat color change. They covered everything with drop cloths, did the cut-in lines super clean, and were completely done in 2 days. No paint smell by evening. No mess left behind. The walls look genuinely professional — not like a DIY job.

We paid around $3/sq ft for the refresh. Totally worth it.

Their number if anyone needs it: (213) 361-1700
Website: handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_fpcwn6fpcwn6fpcw.png"
  },
  {
    title: "Kitchen cabinets painted — spray finish, looks like a full remodel",
    body: `Okay I have to share this because the transformation is unreal.

I was quoted $18,000 for new kitchen cabinets. Instead I paid $840 to have mine painted. I know, sounds too good. But look at the before/after photo I'm attaching — it's the same kitchen.

Handy & Friend took all the doors off, sprayed them in their shop (both sides), installed new hardware, and rehung everything in 2 days. Zero brush marks because it's spray finish. Everything closes perfectly.

If your kitchen looks dated — seriously consider this before spending $15k+ on a remodel.

📞 (213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_umf52cumf52cumf5.png"
  },
  {
    title: "Replaced cracked tile with LVP flooring — $3/sq ft labor, done in 2 days",
    body: `The tile in my kitchen and hallway was cracked, stained, and impossible to clean. Had been putting this off for 2 years.

Finally called Handy & Friend. They:
— Ripped out the old tile (loud but fast)
— Leveled the subfloor where needed
— Installed LVP planks — warm oak tone
— Finished the edges with new trim

280 sq ft total. 2 days. $840 labor (I bought the flooring separately from Floor & Decor).

The difference is night and day. Attached photo is my actual before/after.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_s18md2s18md2s18m.png"
  },
  {
    title: "Big drywall hole — fixed in 3 hours, you cannot tell it was ever there",
    body: `Moving furniture + not paying attention = a fist-sized hole in my bedroom wall. Tried the Home Depot patch kit. It looked worse than the hole.

Called Handy & Friend on a Tuesday. They came Wednesday morning. 3 hours later — completely seamless. Matching texture, paint touched up, not a single sign anything happened.

Price: $180 for a larger hole. They also do patches quoted on-site. Paint touch-up is included.

Honestly the best money I've spent on this house in a while.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_k34gwsk34gwsk34g.png"
  },
  {
    title: "TV mounted + cables hidden in wall — $150, same day, took 45 min",
    body: `Had a 65" TV on a cheap stand with a cable disaster behind it. You know the look.

Tried to mount it myself — couldn't find the studs confidently, didn't want to risk it with a $1,200 TV.

Called Handy & Friend. The guy came same day with a stud finder, proper drill bits, and the in-wall cable kit. 45 minutes later — TV is centered, perfectly level, all cables completely hidden. Looks like it was built that way.

$150 service call — cable management included. Zero regrets.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_5acz715acz715acz.png"
  },
  {
    title: "IKEA PAX assembly — done in 3 hours while I was at work",
    body: `Ordered the full PAX wardrobe system. Opened the boxes on Saturday. Counted the pieces. Closed the boxes.

Found Handy & Friend, they came Sunday morning. I left for a coffee run and came back to a fully assembled, wall-anchored wardrobe with all the interior fittings installed correctly.

They handle any flat-pack — IKEA, Amazon, Pottery Barn, West Elm. $150 service call — 2 hours included. PAX systems quoted on-site.

No more furniture in boxes stressing me out.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_yi4kulyi4kulyi4k.png"
  },
  {
    title: "Painted an old dresser instead of buying new — turned out incredible",
    body: `My bedroom dresser was dark walnut, scratched up, completely outdated. Was about to throw it out and buy something new.

A friend suggested furniture painting. I was skeptical.

Handy & Friend picked it up, stripped and sprayed it sage green with new gold hardware. It came back looking like a $500 boutique piece. I paid $170 — paint and hardware included.

All furniture painting is quoted after photos. Send photos for a written estimate.

This is genuinely underrated. Recommend.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_gtjfzjgtjfzjgtjf.png"
  },
  {
    title: "Bathroom faucet was dripping and rusting — replaced same day for $150",
    body: `Bathroom faucet had been slowly dripping for months. Rust rings in the sink, loose handle, embarrassing to show guests.

Called Handy & Friend on a Thursday morning. They came that afternoon. New brushed nickel Moen faucet, new supply lines, new drain cover. Drip gone. Sink looks clean.

Flat rate pricing:
— Faucet: $150
— Toilet: $150
— Shower head: $150
— Re-caulk: $150

No hourly billing, no surprises. They told me the price before starting.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_hm9f0bhm9f0bhm9f.png"
  },
  {
    title: "Swapped out an old chandelier — dining room feels completely different now",
    body: `We had a brass chandelier from 1994 with fake crystals and two dead bulbs. It made the whole dining room feel stuck in time.

Had a new sputnik chandelier sitting in a box for 6 months because I was nervous about the electrical.

Handy & Friend took care of it in under an hour. Old one out, new one in, all wiring done safely. Now I actually like being in that room.

$150 service call — light fixtures, outlets, switches, smart locks/dimmers.

Same-day available.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_fhqaf8fhqaf8fhqa.png"
  },
  {
    title: "Interior door replaced — quote after photos, looks like it was always there",
    body: `Bedroom door had a hole in it. I'm not proud of how it got there. Had a sheet hanging in the doorway for 3 months.

Handy & Friend came, removed the old door and frame, installed a solid-core pre-hung door with new hinges and a lever handle. Perfect fit — even gap all the way around, closes with a satisfying click.

Door installation is a quote-only service — send photos for a written estimate. (213) 361-1700

Honestly should have done it sooner instead of looking at that sheet every day.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_bwzpisbwzpisbwzp.png"
  },
  {
    title: "Bathroom went from embarrassing to beautiful — new vanity installed",
    body: `Our second bathroom had a cracked pedestal sink with exposed pipes, green corrosion, and a cracked mirror tilted on the wall. We stopped showing it to guests.

Handy & Friend replaced everything in one day:
— Old sink and pipes removed
— 48" floating vanity with shaker doors installed
— Quartz countertop with undermount sink
— New brushed gold faucet
— LED backlit mirror hung perfectly level

I bought the vanity from Home Depot. They handled the full install. Now it's genuinely the nicest room in the house.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_dpivbadpivbadpiv.png"
  },
  {
    title: "Kitchen backsplash done — $12/sq ft, and it completely changed the space",
    body: `No backsplash behind our stove — just grease-stained drywall. It was gross and I knew it.

Finally pulled the trigger. Handy & Friend installed white subway tile — 18 sq ft behind the stove and counters. Perfect brick pattern, clean grout lines, new outlet cover flush with the tile.

Tile backsplash: $20/sq ft
Peel & stick option: $12/sq ft

My 18 sq ft = $360. The kitchen looks like it was professionally designed now. Wish I'd done it years ago.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_ffru5dffru5dffru.png"
  },
  {
    title: "Gallery wall finally up — mirror + 4 frames, all level, took them 45 min",
    body: `I had a large round mirror and 4 framed prints sitting on the floor for literally 4 months. Every time I tried to hang them myself something was crooked or off-center or I put a hole in the wrong spot.

Booked Handy & Friend for the job. They brought a laser level, measured everything out, and had the whole gallery wall done in 45 minutes. Every piece is perfect — same height, equal spacing, not a single wrong hole in the wall.

Up to 5 pieces: $150. Curtain rods: $150 for the first window, $50 each additional.

Sometimes it's just worth paying someone who does this every day.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_orrv6porrv6porrv.png"
  }
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function postOne(page, post, index) {
  console.log(`\n=== POST ${index + 1}/13: ${post.title.substring(0, 55)}...`);

  // Go to news feed
  await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'commit', timeout: 60000 });
  await sleep(3000);

  const url = page.url();
  if (url.includes('login') || url.includes('signin')) {
    throw new Error('NOT LOGGED IN - cookies expired');
  }

  try { await page.screenshot({ path: `/tmp/nd_${index+1}_a_feed.png`, timeout: 10000 }); } catch(e) {}

  // Click the "Share" / post creation area
  // Try multiple selectors for the create post box
  const shareSelectors = [
    '[data-testid="share-box-placeholder"]',
    '[data-testid="post-box"]',
    'button:has-text("Share")',
    '[aria-label="Share"]',
    '[placeholder*="share"]',
    '[placeholder*="Share"]',
    '[placeholder*="What"]',
    '[class*="ShareBox"]',
    '[class*="PostBox"]',
    '[class*="CreatePost"]',
    'textarea[placeholder]',
    '[contenteditable="true"]',
  ];

  let opened = false;
  for (const sel of shareSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click();
        console.log(`  Clicked share area: ${sel}`);
        opened = true;
        break;
      }
    } catch(e) {}
  }

  if (!opened) {
    // Try clicking any visible input area at top of page
    try {
      await page.click('main [role="textbox"], main textarea, main [contenteditable]', { timeout: 3000 });
      opened = true;
      console.log('  Clicked main input area');
    } catch(e) {}
  }

  await sleep(2000);
  try { await page.screenshot({ path: `/tmp/nd_${index+1}_b_clicked.png`, timeout: 10000 }); } catch(e) {}

  // Look for "Recommendation" post type button
  try {
    const recBtns = await page.$$('button, [role="button"], [role="tab"]');
    for (const btn of recBtns) {
      const text = await btn.textContent().catch(() => '');
      if (text && (text.includes('Recommendation') || text.includes('Рекомендация'))) {
        await btn.click();
        console.log('  Selected Recommendation type');
        await sleep(1000);
        break;
      }
    }
  } catch(e) {}

  // Fill title if there's a title field
  const titleSelectors = [
    'input[placeholder*="itle"]',
    'input[name="title"]',
    'input[aria-label*="itle"]',
    'input[placeholder*="Title"]',
    'input[placeholder*="subject"]',
  ];
  for (const sel of titleSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.fill(post.title);
        console.log('  Filled title');
        break;
      }
    } catch(e) {}
  }

  await sleep(500);

  // Fill body text
  const bodySelectors = [
    '[contenteditable="true"]',
    'textarea[placeholder*="hare"]',
    'textarea[placeholder*="What"]',
    'textarea[placeholder*="what"]',
    'textarea',
    '[role="textbox"]',
  ];
  let bodyFilled = false;
  for (const sel of bodySelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.click();
        await el.fill(post.body);
        console.log(`  Filled body with ${post.body.length} chars`);
        bodyFilled = true;
        break;
      }
    } catch(e) {}
  }

  if (!bodyFilled) {
    // Try using keyboard to type
    try {
      await page.keyboard.press('Tab');
      await page.keyboard.type(post.body, { delay: 5 });
      console.log('  Body typed via keyboard');
    } catch(e) {}
  }

  await sleep(500);

  // Upload photo - check if image exists
  if (fs.existsSync(post.image)) {
    // First click photo button to reveal file input (if needed)
    try {
      const photoBtns = await page.$$('button, [role="button"]');
      for (const btn of photoBtns) {
        const text = await btn.textContent().catch(() => '');
        const label = await btn.getAttribute('aria-label').catch(() => '');
        if ((text && (text.includes('Photo') || text.includes('photo') || text.includes('Фото'))) ||
            (label && (label.includes('Photo') || label.includes('photo')))) {
          await btn.click();
          console.log('  Clicked photo button');
          await sleep(1000);
          break;
        }
      }
    } catch(e) {}

    // Now set the file
    try {
      const fileInputs = await page.$$('input[type="file"]');
      for (const fi of fileInputs) {
        await fi.setInputFiles(post.image);
        console.log(`  Uploaded: ${path.basename(post.image)}`);
        await sleep(4000); // wait for upload
        break;
      }
    } catch(e) {
      console.log('  Photo upload error:', e.message);
    }
  } else {
    console.log(`  ⚠️ Image not found: ${post.image}`);
  }

  try { await page.screenshot({ path: `/tmp/nd_${index+1}_c_filled.png`, timeout: 10000 }); } catch(e) {}

  // Submit post
  const submitSelectors = [
    'button:has-text("Post")',
    'button:has-text("Share")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    '[data-testid*="submit"]',
    '[data-testid*="post-button"]',
  ];

  let submitted = false;
  for (const sel of submitSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible()) {
        const isEnabled = await btn.isEnabled();
        if (isEnabled) {
          await btn.click();
          console.log(`  ✅ POSTED! (via ${sel})`);
          submitted = true;
          await sleep(5000);
          break;
        } else {
          console.log(`  ⚠️ Submit button disabled: ${sel}`);
        }
      }
    } catch(e) {}
  }

  if (!submitted) {
    console.log('  ❌ Could not find submit button');
  }

  try { await page.screenshot({ path: `/tmp/nd_${index+1}_d_done.png`, timeout: 10000 }); } catch(e) {}
  return submitted;
}

async function main() {
  console.log('📋 Getting Chrome cookies...');
  const pythonScript = `
from pycookiecheat import chrome_cookies
import json
cookies = chrome_cookies("https://nextdoor.com/")
print(json.dumps(cookies))
`;
  const cookieResult = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, { timeout: 15000 });
  const rawCookies = JSON.parse(cookieResult.toString());

  console.log(`✅ Got ${Object.keys(rawCookies).length} cookies`);

  // Convert to Playwright cookie format
  const playwrightCookies = Object.entries(rawCookies).map(([name, value]) => ({
    name,
    value: String(value),
    domain: '.nextdoor.com',
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
  }));

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  context.setDefaultTimeout(60000);

  // Add cookies
  await context.addCookies(playwrightCookies);

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // Check if logged in
  console.log('🔍 Checking Nextdoor session...');
  await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'commit', timeout: 60000 });
  await sleep(5000);

  const url = page.url();
  const title = await page.title();
  console.log(`Page: ${title} | ${url}`);

  // Quick screenshot (skip font wait)
  try {
    await page.screenshot({ path: '/tmp/nd_initial.png', timeout: 15000 });
  } catch(e) { console.log('Screenshot skipped'); }

  if (url.includes('login') || url.includes('signin')) {
    console.log('❌ NOT LOGGED IN - cookie session invalid');
    await browser.close();
    return;
  }

  console.log('✅ Logged in! Starting to post all 13...\n');

  let successCount = 0;
  const results = [];

  for (let i = 0; i < posts.length; i++) {
    try {
      const ok = await postOne(page, posts[i], i);
      results.push({ index: i+1, title: posts[i].title.substring(0, 50), ok });
      if (ok) successCount++;
      // Delay between posts to avoid spam detection
      if (i < posts.length - 1) {
        console.log(`  ⏳ Waiting 8 seconds before next post...`);
        await sleep(8000);
      }
    } catch(e) {
      console.log(`  ❌ ERROR on post ${i+1}: ${e.message}`);
      results.push({ index: i+1, title: posts[i].title.substring(0, 50), ok: false, error: e.message });
    }
  }

  console.log('\n========== RESULTS ==========');
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} Post ${r.index}: ${r.title}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  }
  console.log(`\n✅ ${successCount}/${posts.length} posts published`);
  console.log('Screenshots in /tmp/nd_*.png');

  await sleep(3000);
  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
