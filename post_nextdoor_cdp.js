const { chromium } = require('playwright');

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
    title: "Kitchen cabinets painted — $70/door, looks like a full remodel",
    body: `Okay I have to share this because the transformation is unreal.

I was quoted $18,000 for new kitchen cabinets. Instead I paid $840 to have mine painted. Look at the before/after photo — it's the same kitchen.

Handy & Friend took all the doors off, sprayed them (both sides), installed new hardware, rehung everything in 2 days. Zero brush marks because it's spray finish.

If your kitchen looks dated — seriously consider this before spending $15k+ on a remodel.

📞 (213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_umf52cumf52cumf5.png"
  },
  {
    title: "Replaced cracked tile with LVP flooring — $3/sq ft labor, done in 2 days",
    body: `Old tile floors were cracked and impossible to clean. Had been putting this off for 2 years.

Finally called Handy & Friend. Ripped out old tile, leveled subfloor, installed LVP planks with trim. 280 sq ft total. 2 days. $840 labor.

Looks 10x better. No squeaks, no gaps, professional finish.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_s18md2s18md2s18m.png"
  },
  {
    title: "Big drywall hole — fixed in 3 hours, you cannot tell it was ever there",
    body: `Moving furniture + not paying attention = a fist-sized hole in my bedroom wall. Tried the Home Depot patch kit. It looked worse than the hole.

Called Handy & Friend on Tuesday. Came Wednesday morning. 3 hours later — completely seamless. Matching texture, paint touched up, not a single sign anything happened.

Price: $180 for a larger hole. Small patches from $120. Paint touch-up included.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_k34gwsk34gwsk34g.png"
  },
  {
    title: "TV mounted + cables hidden in wall — $185, same day, took 45 min",
    body: `65" TV on a wobbly stand with cables everywhere. Finally fixed it.

Handy & Friend came same day with stud finder, drill bits, in-wall cable kit. 45 minutes — TV centered, perfectly level, all cables hidden. Looks like it was built that way.

Standard mount: $150. Hidden wire package: $185. Zero regrets.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_5acz715acz715acz.png"
  },
  {
    title: "IKEA PAX wardrobe assembled same day — saved my weekend",
    body: `Ordered the full PAX wardrobe system. Opened the boxes. Immediately regretted it — 47 pieces, 300 screws.

Called Handy & Friend. Done in 3 hours. Fully assembled, wall-anchored, all interior fittings correct.

They handle any flat-pack — IKEA, Amazon, Pottery Barn, West Elm. From $150.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_yi4kulyi4kulyi4k.png"
  },
  {
    title: "Old dresser painted instead of buying new — turned out incredible",
    body: `Dark walnut dresser, scratched, completely outdated. Was about to throw it out.

Handy & Friend painted it sage green — professional spray finish, new gold hardware. Looks like a $500 boutique piece now. Cost $170 — paint and hardware included.

Chairs $40, nightstands $65, dressers $170, dining tables $130.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_gtjfzjgtjfzjgtjf.png"
  },
  {
    title: "Bathroom faucet replaced same day — no more rust stains",
    body: `Faucet dripping for months. Rust rings in sink, loose handle, embarrassing for guests.

Called Handy & Friend Thursday morning. Came that afternoon. New brushed nickel Moen faucet, new supply lines, new drain cover. Drip gone. Sink looks clean.

Faucet $150, Toilet $165, Shower $150. Flat rate, no surprises.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_hm9f0bhm9f0bhm9f.png"
  },
  {
    title: "Swapped out an ugly old chandelier — dining room completely transformed",
    body: `Brass chandelier from 1994 with fake crystals and two dead bulbs. Had a new sputnik chandelier in a box for 6 months — nervous about electrical.

Handy & Friend took care of it in under an hour. Old one out, new one in, all wiring done safely.

Light fixture: $150. Outlets/switches: $150. Smart devices: $195. Same-day available.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_fhqaf8fhqaf8fhqa.png"
  },
  {
    title: "New interior door installed — $140, looks like it was always there",
    body: `Bedroom door had a hole in it. Sheet hanging in doorway for 3 months.

Handy & Friend removed old door and frame, installed solid-core pre-hung door with new hinges and lever handle. Perfect fit, closes with a satisfying click.

Interior pre-hung: $140. Slab only: $120. Exterior: from $250.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_bwzpisbwzpisbwzp.png"
  },
  {
    title: "Bathroom vanity replaced — looks like a luxury hotel now",
    body: `Cracked pedestal sink with exposed green pipes and cracked mirror. Stopped showing guests this bathroom.

Handy & Friend replaced everything in one day. 48" floating vanity, quartz top, gold faucet, LED mirror. Bought vanity from Home Depot, they installed everything for $195.

Now it's genuinely the nicest room in the house.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_dpivbadpivbadpiv.png"
  },
  {
    title: "Kitchen backsplash installed — completely changed the space",
    body: `No backsplash behind stove — just grease-stained drywall. Finally fixed it.

Handy & Friend installed white subway tile — 18 sq ft, perfect brick pattern, clean grout, new outlet cover flush with tile.

Tile: $20/sq ft. Peel & stick: $12/sq ft. My 18 sq ft = $360.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_ffru5dffru5dffru.png"
  },
  {
    title: "Gallery wall finally done — mirror + frames hung perfectly in 45 min",
    body: `Large round mirror and 4 framed prints sitting on the floor for 4 months. Every time I tried to hang them myself something was crooked.

Handy & Friend brought a laser level, done in 45 minutes. Every piece perfect — same height, equal spacing, zero wrong holes.

Up to 5 pieces: $150. Curtain rods: $150 first window, $50 each additional.

(213) 361-1700 | handyandfriend.com`,
    image: "/Users/sergiikuropiatnyk/Downloads/Gemini_Generated_Image_orrv6porrv6porrv.png"
  }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function postOne(page, post, index) {
  console.log(`\n=== POST ${index + 1}/13: ${post.title.substring(0, 60)}...`);

  await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);

  await page.screenshot({ path: `/tmp/nd_${index+1}_a_feed.png` });

  // Click Share/post area
  const shareBtn = await page.$('[data-testid="share-button"], button:has-text("Share"), [placeholder*="share"], [placeholder*="What"]');
  if (shareBtn) {
    await shareBtn.click();
    console.log('Clicked share button');
  } else {
    // Try clicking the post box
    const postBox = await page.$('.post-box, [class*="PostBox"], [class*="CreatePost"], [class*="newsfeed-create"]');
    if (postBox) {
      await postBox.click();
      console.log('Clicked post box');
    }
  }
  await sleep(2000);
  await page.screenshot({ path: `/tmp/nd_${index+1}_b_aftershare.png` });

  // Select Recommendation type if available
  try {
    const recBtn = await page.$('button:has-text("Recommendation"), [data-testid*="recommendation"], [class*="recommendation"]');
    if (recBtn) { await recBtn.click(); await sleep(1000); console.log('Selected Recommendation'); }
  } catch(e) {}

  // Fill title
  try {
    const titleField = await page.$('input[placeholder*="itle"], input[name="title"], input[aria-label*="itle"]');
    if (titleField) { await titleField.fill(post.title); console.log('Title filled'); }
  } catch(e) { console.log('No title field'); }

  await sleep(500);

  // Fill body
  try {
    const bodyField = await page.$('textarea, [contenteditable="true"]');
    if (bodyField) { await bodyField.fill(post.body); console.log('Body filled'); }
  } catch(e) { console.log('No body field'); }

  await sleep(500);
  await page.screenshot({ path: `/tmp/nd_${index+1}_c_filled.png` });

  // Upload photo
  try {
    // Look for photo button first
    const photoBtn = await page.$('button:has-text("Photo"), button:has-text("photo"), [aria-label*="hoto"], [data-testid*="photo"]');
    if (photoBtn) {
      await photoBtn.click();
      await sleep(1000);
    }
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(post.image);
      console.log('Photo uploaded');
      await sleep(4000);
    }
  } catch(e) { console.log('Photo upload error:', e.message); }

  await page.screenshot({ path: `/tmp/nd_${index+1}_d_withphoto.png` });

  // Submit
  try {
    const submitBtn = await page.$('button:has-text("Post"), button[type="submit"], button:has-text("Share now")');
    if (submitBtn) {
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        console.log('✅ POSTED!');
        await sleep(5000);
      } else {
        console.log('Submit button disabled');
      }
    } else {
      console.log('No submit button found');
    }
  } catch(e) { console.log('Submit error:', e.message); }

  await page.screenshot({ path: `/tmp/nd_${index+1}_e_done.png` });
  console.log(`Screenshots: /tmp/nd_${index+1}_*.png`);
}

async function main() {
  console.log('Connecting to OpenClaw browser via CDP on port 18800...');

  const browser = await chromium.connectOverCDP('http://localhost:18800');
  console.log('Connected!');

  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();

  console.log('Available pages:');
  for (const p of pages) {
    console.log(' -', p.url());
  }

  // Always create a fresh page
  const page = await context.newPage();
  console.log('Created new page');

  await page.goto('https://nextdoor.com/news_feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  const title = await page.title();
  const url = page.url();
  console.log('Current page:', title, '|', url);

  await page.screenshot({ path: '/tmp/nd_initial.png' });

  if (url.includes('login') || url.includes('signin') || !url.includes('nextdoor.com')) {
    console.log('❌ NOT LOGGED IN');
    await browser.close();
    return;
  }

  console.log('✅ Logged in! Starting posts...');

  // Post first one as test
  await postOne(page, posts[0], 0);

  console.log('\n✅ Test complete. Check /tmp/nd_1_*.png for results');

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
