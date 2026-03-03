/* ═══════════════════════════════════════════════
   PRICES (numbers only — labels in T{})
   Official Price List 2026 — Handy & Friend LA
═══════════════════════════════════════════════ */
const P={
  base:{call:150,callHr2:150,hrAfter:75,visitEval:75},

  /* CATEGORY 1: KITCHEN CABINET PAINTING */
  kitchen:{
    doorRoller:45,door1side:95,door2side:125,doorFull:155,
    drawerSmall:65,drawerLarge:75,endPanel:125,island:460,
    interiorBox:75,degreasing:20,oakFill:45,twoTone:300,
    topCoat:20,glassMasking:20,hwHoles:20,deepRepair:25,
    caulking:3.50,removeContactPaper:75
  },

  /* CATEGORY 2: FURNITURE PAINTING */
  furnPaint:{
    chair:95,nightstand:145,dresser:450,diningTable:395,builtIn:125
  },

  /* CATEGORY 3: INTERIOR PAINTING */
  paint:{
    wall1coat:3.00,wall2coat:4.00,ceiling:4.00,ceilingTexture:4.50,
    baseboard:4.50,baseboardInstall:3.50,crown:5.00,doorCasing:45,doorSlab:95,
    prep:0.80,wallpaper:1.60,mold:2.00
  },

  /* CATEGORY 4: FLOORING */
  floor:{
    laminateLabor:3.50,lvpLabor:3.75,demo:2.25,underlayment:0.75,
    spotLevel:65,transition:55,doorUndercut:55,baseboardReinstall:3.50
  },

  /* CATEGORY 5: MOUNTING & INSTALLATION */
  install:{
    tvStandard:165,tvHiddenWire:250,artMirror:175,curtainFirst:165,
    curtainEach:50
  },

  /* CATEGORY 6: FURNITURE ASSEMBLY */
  assembly:{
    small:150,dresser:200,bed:275,paxHourly:70
  },

  /* CATEGORY 7: PLUMBING */
  plumbing:{
    faucet:225,showerHead:150,toiletRepair:165,recaulk:250
  },

  /* CATEGORY 8: ELECTRICAL */
  electrical:{
    lightFixture:185,outletSwitch:150,outletEach:45,smartDevice:195
  },

  /* CATEGORY 9: LINEAR/TRIM SERVICES */
  linear:{
    baseboard:4.50,baseboardInstall:3.50,baseboardRemove:3.50,
    crown:5.00,doorCasing:45,caulking:3.50,builtIn:125
  }
};

/* ═══════════════════════════════════════════════
   PHOTOS
═══════════════════════════════════════════════ */
const SVC_IMG={
  kitch:'assets/img/kitch.webp',
  furnp:'assets/img/furnp.webp',
  paint:'assets/img/painting.webp',
  floor:'assets/img/flooring.webp',
  tv:   'assets/img/tv-mounting.webp',
  fur:  'assets/img/furniture.webp',
  art:  'assets/img/art.webp',
  plumb:'assets/img/plumbing.webp',
  elec: 'assets/img/electrical.webp'
};

/* ═══════════════════════════════════════════════
   TV SVG — premium wall-mounted TV illustration
═══════════════════════════════════════════════ */
const TV_SVG = `<svg viewBox="0 0 300 96" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F0E8D5"/>
    <stop offset="70%" stop-color="#E8DECA"/>
    <stop offset="100%" stop-color="#DED4BC"/>
  </linearGradient>
  <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0C1422"/>
    <stop offset="100%" stop-color="#060910"/>
  </linearGradient>
  <radialGradient id="sg" cx="50%" cy="42%" r="55%">
    <stop offset="0%" stop-color="#B8892C" stop-opacity="0.28"/>
    <stop offset="60%" stop-color="#4466AA" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#060910" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gw" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#C9A84C" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>
  </radialGradient>
  <filter id="tvs" x="-15%" y="-25%" width="130%" height="175%">
    <feDropShadow dx="0" dy="7" stdDeviation="9" flood-color="#1A0E05" flood-opacity="0.50"/>
  </filter>
  <filter id="gls" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="3"/>
  </filter>
</defs>

<!-- WALL -->
<rect width="300" height="96" fill="url(#wg)"/>
<!-- Subtle plaster seam lines -->
<line x1="0" y1="32" x2="300" y2="32" stroke="rgba(110,90,60,0.06)" stroke-width="1"/>
<line x1="0" y1="64" x2="300" y2="64" stroke="rgba(110,90,60,0.06)" stroke-width="1"/>
<!-- Baseboard bottom -->
<rect x="0" y="89" width="300" height="7" fill="#E0D7C2"/>
<rect x="0" y="87.5" width="300" height="1.5" fill="rgba(100,80,50,0.18)"/>

<!-- Wall mount bracket plate -->
<rect x="134" y="8" width="32" height="5" rx="2" fill="#A09890"/>
<rect x="135" y="9" width="30" height="3" rx="1" fill="#B8B0A8"/>
<!-- Bracket screws -->
<circle cx="139" cy="10.5" r="1.2" fill="#888078"/>
<circle cx="161" cy="10.5" r="1.2" fill="#888078"/>
<!-- Bracket arm (vertical) -->
<rect x="146" y="13" width="8" height="14" rx="1.5" fill="#989088"/>
<!-- Pivot -->
<ellipse cx="150" cy="25.5" rx="5" ry="4" fill="#848078"/>
<ellipse cx="150" cy="25.5" rx="3" ry="2.2" fill="#A8A098"/>
<circle cx="150" cy="25.5" r="1.2" fill="#787068"/>

<!-- AMBIENT GLOW on wall behind TV -->
<ellipse cx="150" cy="52" rx="95" ry="38" fill="url(#gw)" filter="url(#gls)"/>

<!-- TV BODY -->
<g filter="url(#tvs)">
  <!-- Back panel depth (dark edge around sides/top) -->
  <rect x="38" y="28" width="224" height="58" rx="5" fill="#0E0C0A"/>
  <!-- Bezel frame (very slim, like OLED) -->
  <rect x="40" y="29" width="220" height="56" rx="4" fill="#1C1814"/>
  <!-- SCREEN -->
  <rect x="43" y="32" width="214" height="46" rx="2.5" fill="url(#scr)"/>
  <!-- Screen gradient glow -->
  <rect x="43" y="32" width="214" height="46" rx="2.5" fill="url(#sg)"/>
  <!-- Screen reflection top edge -->
  <rect x="44" y="32.5" width="212" height="3" rx="1.5" fill="rgba(255,255,255,0.04)"/>
  <!-- Bottom chin (slightly thicker) -->
  <rect x="40" y="73" width="220" height="12" rx="0 0 4 4" fill="#181410"/>
  <!-- Speaker grille dots on chin -->
  <circle cx="150" cy="79" r="1" fill="rgba(255,255,255,0.06)"/>
  <circle cx="155" cy="79" r="1" fill="rgba(255,255,255,0.06)"/>
  <circle cx="145" cy="79" r="1" fill="rgba(255,255,255,0.06)"/>
  <circle cx="160" cy="79" r="1" fill="rgba(255,255,255,0.06)"/>
  <circle cx="140" cy="79" r="1" fill="rgba(255,255,255,0.06)"/>
</g>

<!-- SCREEN CONTENT: Handy & Friend branding -->
<text x="150" y="53" text-anchor="middle"
  font-family="Georgia,'Times New Roman',serif"
  font-size="11.5" font-weight="700" letter-spacing="0.8"
  fill="rgba(255,255,255,0.93)">Handy &amp; Friend</text>
<!-- Tagline -->
<text x="150" y="62" text-anchor="middle"
  font-family="'Arial',sans-serif"
  font-size="5.5" font-weight="400" letter-spacing="1.8"
  fill="rgba(255,255,255,0.38)" text-decoration="none">LOS ANGELES</text>
<!-- Gold accent line -->
<line x1="130" y1="65" x2="170" y2="65" stroke="#C9A84C" stroke-width="0.8" opacity="0.7"/>
<!-- Gold dot mark -->
<circle cx="150" cy="69" r="2.2" fill="#C9A84C"/>
<circle cx="150" cy="69" r="5" fill="#C9A84C" opacity="0.12"/>

<!-- Power LED -->
<circle cx="252" cy="79" r="1.5" fill="#C9A84C" opacity="0.95"/>
<circle cx="252" cy="79" r="3.5" fill="#C9A84C" opacity="0.12"/>

<!-- Cable management: slim cable down center to baseboard -->
<path d="M150 85 Q151 87 150.5 89" stroke="#555" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.5"/>

<!-- Wall outlet bottom right (detail) -->
<rect x="264" y="79" width="16" height="11" rx="2" fill="rgba(255,255,255,0.55)" stroke="rgba(130,110,80,0.22)" stroke-width="0.8"/>
<rect x="266.5" y="81" width="4" height="2.8" rx="0.8" fill="rgba(130,110,80,0.38)"/>
<rect x="272" y="81" width="4" height="2.8" rx="0.8" fill="rgba(130,110,80,0.38)"/>
<circle cx="272" cy="87" r="1.3" fill="rgba(130,110,80,0.32)"/>
</svg>`;

/* ═══════════════════════════════════════════════
   i18n — ALL text including drawer content
═══════════════════════════════════════════════ */
const T={
  en:{
    lang:"EN",
    heroEyebrow:"Handyman Services in Los Angeles",
    heroH:"Professional Handyman\nAvailable Today",
    heroAccent:"Instant Help",
    heroSub:"Describe your project and get AI-powered guidance on pricing, timeline, and next steps—instantly.",
    aiPowered:"AI Powered",
    heroOfferTitle:"Professional Cabinet Painting From $155 Per Door",
    heroOfferSubHtml:'<span class="hero-included-accent">Premium paint, primer, degreasing, and prep are included in the price</span><br>A smooth spray finish that costs less than replacement',
    aiSearchPlaceholder:"Ask AI: price my project",
    aiBadge:"Smart",
    aiSubmit:"Get Estimate",
    aiHelperText:"AI assistant — answers questions and calculates prices instantly",
    chipPricing:"Pricing",
    chipCabinet:"Cabinet Paint",
    chipRepairs:"Repairs",
    chipKitchen:"Kitchen Update",
    trustInstant:"Instant Response",
    trustAccurate:"Accurate Estimates",
    trustSteps:"Clear Next Steps",
    secondaryCta:"Prefer to speak directly?",
    callNow:"Call Now",
    whatsApp:"WhatsApp",
    viewPricing:"View Pricing",
    gridLbl:"",
    base:[],
    svcs:[
      {id:"kitch",name:"Kitchen Cabinet Painting",from:"$45/door"},
      {id:"furnp",name:"Furniture Painting",      from:"$95/piece"},
      {id:"paint",name:"Interior Painting",       from:"$3.00/sf"},
      {id:"floor",name:"Floor Covering",          from:"$3.50/sf"},
      {id:"tv",   name:"TV Mounting",             from:"$165"},
      {id:"fur",  name:"Furniture Assembly",       from:"$150"},
      {id:"art",  name:"Art, Mirrors & Décor",    from:"$175"},
      {id:"plumb",name:"Plumbing",                from:"$150"},
      {id:"elec", name:"Electrical",              from:"$150"}
    ],
    calcTitle:"Quick Estimate",
    calcSub:"Enter room size → instant price",
    lSvc:"Service",lLen:"Length (ft)",lWid:"Width (ft)",
    lBase:"Baseboards (lin ft)",lTrans:"Transitions (qty)",lDoorU:"Door undercuts (qty)",
    lHrs:"Estimated hours",anchorBtn:"Get Free Instant Quote",
    lModeRoom:"Room (L×W)",lModeTotal:"Total sq ft",lSfTotal:"Total sq ft",
    lCustomPrice:"Price per sq ft ($)",lCustomLen:"Length (ft)",lCustomWid:"Width (ft)",lCustomSf:"Total sq ft",
    calcSubCustom:"Custom price per square foot",
    hrBadgeHint:"Enter estimated hours above",
    hrBadgeIncl:"Included in service call",
    hrBadgeFmt:(extra,tot)=>`$150 call + ${extra}h × $75 = <strong>$${tot}</strong>`,
    areaTotalHint:"Enter total sq ft",
    areaTotalFmt:(sf)=>`Total area = <strong>${sf} sq ft</strong>`,
    waGreet:"Hi Handy & Friend! 👋",
    waEstLabel:"Estimate",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Hours: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Room: ${len}ft × ${wid}ft = ${sf} sq ft`,
    waConfirm:"Please confirm availability.",
    opts:[
      {v:"kitch",l:"🍳 Kitchen Cabinet Painting"},
      {v:"furnp",l:"🎨 Furniture Painting"},
      {v:"p1",l:"🖌️ Interior Painting — 1 coat ($3.00/sf)"},
      {v:"p2",l:"🖌️ Interior Painting — 2 coats ($4.00/sf)"},
      {v:"fl",l:"🏠 Flooring — Laminate ($3.50/sf)"},
      {v:"fv",l:"🏠 Flooring — LVP ($3.75/sf)"},
      {v:"custom",l:"💰 Custom Price per Sq Ft"},
      {v:"trim",l:"📏 Trim & Moldings (per linear ft)"},
      {v:"tv",l:"📺 TV Mounting"},
      {v:"art",l:"🖼️ Art & Mirrors"},
      {v:"fur",l:"🛋️ Furniture Assembly"},
      {v:"plumb",l:"🚰 Plumbing"},
      {v:"elec",l:"⚡ Electrical"}
    ],
    ap:[
      {id:"prep", l:"+ Sanding / prep",       p:"+$0.80/sf"},
      {id:"wallp",l:"+ Wallpaper removal",     p:"+$1.60/sf"},
      {id:"mold", l:"+ Mold treatment",        p:"+$2.00/sf"},
      {id:"strip",l:"+ Paint stripping",       p:"+$1.20/sf"}
    ],
    af:[
      {id:"demo", l:"+ Demo existing floor",   p:"+$2.25/sf"},
      {id:"under",l:"+ Underlayment",          p:"+$0.75/sf"}
    ],
    /* Calculator mode labels */
    calcSubKitchen:"Select door finish & count",
    calcSubFurn:"Select piece type & quantity",
    calcSubFixed:"Select your service option",
    lDoorType:"Door Finish",lDoorQty:"Number of Doors",
    lDrawerS:"Small Drawers",lDrawerL:"Large Drawers",lEndPanels:"End Panels",
    lPieceType:"Piece Type",lPieceQty:"Quantity",
    kitchenDoorOpts:[
      {v:"doorRoller",l:"Roller Finish — $45/door",p:45},
      {v:"door1side",l:"1-Side Spray — $95/door",p:95},
      {v:"door2side",l:"2-Side Spray — $125/door",p:125},
      {v:"doorFull",l:"Full Spray + Box — $155/door",p:155}
    ],
    kitchenAddons:[
      {id:"degreasing",l:"Heavy Degreasing",p:"+$20/door"},
      {id:"oakFill",l:"Oak Grain Fill",p:"+$45/door"},
      {id:"twoTone",l:"Two-Tone Color",p:"+$300 flat"}
    ],
    kecDivider:"Also calculate by area",
    kecSqftTitle:"Price per Sq Ft",
    kecLinearTitle:"Price per Linear Ft",
    furnPieceOpts:[
      {v:"chair",l:"Dining Chair — $95/pc",p:95},
      {v:"nightstand",l:"Nightstand — $145/pc",p:145},
      {v:"builtIn",l:"Built-in Unit — $125/lin ft",p:125,unit:"lf"},
      {v:"diningTable",l:"Dining Table — $395/pc",p:395},
      {v:"dresser",l:"Dresser — $450/pc",p:450}
    ],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Standard Mount (up to 65\")",p:165},
        {id:"tvHide",l:"Concealed Wires (in-wall)",p:250}
      ],
      art:[
        {id:"artHang",l:"Art / Mirror Hanging (up to 5 pcs)",p:175},
        {id:"curtain1",l:"Curtain Rods — first window",p:165},
        {id:"curtainX",l:"Each additional window",p:50,addon:true}
      ],
      fur:[
        {id:"furSmall",l:"Small Items (shelf, desk)",p:150},
        {id:"furDresser",l:"Dresser / Chest",p:200},
        {id:"furBed",l:"Bed Frame",p:275},
        {id:"furPax",l:"PAX / Large Closet (min 4h)",p:280}
      ],
      plumb:[
        {id:"plFaucet",l:"Faucet Install",p:225},
        {id:"plShower",l:"Shower Head Replace",p:150},
        {id:"plToilet",l:"Toilet Tank Repair",p:165},
        {id:"plCaulk",l:"Re-Caulk Tub / Shower",p:250}
      ],
      elec:[
        {id:"elLight",l:"Light Fixture Replace",p:185},
        {id:"elOutlet",l:"Outlets / Switches (first 3)",p:150,extra:{l:"Additional outlets",ep:45}},
        {id:"elSmart",l:"Smart Doorbell / Lock Install",p:195}
      ]
    },
    calcSubLinear:"Select trim type & enter length (ft)",
    lLinearService:"Service Type",lLinearLength:"Length",lLinearUnit:"Unit",
    linearOpts:[
      {v:"baseboard",l:"Baseboard Paint — $4.50/lin ft",p:4.50},
      {v:"baseboardInstall",l:"Baseboard Install (new) — $3.50/lin ft",p:3.50},
      {v:"baseboardRemove",l:"Baseboard Remove & Reinstall — $3.50/lin ft",p:3.50},
      {v:"crown",l:"Crown Molding Paint — $5.00/lin ft",p:5.00},
      {v:"doorCasing",l:"Door Casing / Trim — $45/side",p:45},
      {v:"caulking",l:"Caulking / Sealing — $3.50/lin ft",p:3.50},
      {v:"builtIn",l:"Built-in Cabinetry — $125/lin ft",p:125}
    ],
    calcBtn:"Calculate",
    resLbl:"Estimated labor cost",
    resSub:"Estimate only · Final price after photos or site visit",
    waBtn:"Send via WhatsApp",copyBtn:"Copy estimate",
    areaHint:(l,w,sf)=>l&&w?`${l} ft × ${w} ft = <strong>${sf} sq ft</strong>`:"Enter room length & width",
    sF1:"Main surfaces",sF2:"Prep add-ons",sF3:"Trim & millwork (per lin ft)",
    sG1:"Installation",sG2:"Add-ons & extras",
    /* DRAWER ROWS — all 7 services */
    dr:{
      prov:"You provide",
      tvScope:"Fixed price",tvDesc:"Surface cable mgmt included. $150 service call applies.",
      tv:[
        ["TV Mount — Standard (up to 65\")","$165/unit","1–1.5h"],
        ["TV Mount — Hidden Wire (concealed in-wall)","$250/unit","2–3h"]
      ],
      tvProv:"TV bracket / arm",
      tvN:"Bracket not included. Concealed-wire option requires no fire blocks in wall. All holes patched & painted.",
      furScope:"Fixed price · Labor only",furDesc:"$150 service call applies. Complex systems hourly.",
      fur:[
        ["Small Furniture Item (shelf, small desk, table)","$150/piece","1–1.5h"],
        ["Dresser / Chest of Drawers","$200/piece","2–3h"],
        ["Bed Frame Assembly","$275/piece","2.5–3h"],
        ["PAX / Large Closet System (IKEA, Elfa)","$70/hour","min 4h ($280)"]
      ],
      furProv:"All parts, hardware & original instructions",
      furN:"Excess complexity or missing parts billed at $70/hr after included time. $150 service call applies.",
      artScope:"Fixed price",artDesc:"Up to 5 pieces. Level guarantee included.",
      art:[
        ["Art / Mirror Hanging — up to 5 pieces","$175/package","1–2h"],
        ["Curtains / Rods — first window","$165/window","1.5–2.5h"],
        ["Curtains / Rods — each additional window","$50/window","~30 min"]
      ],
      artProv:"Hardware, anchors, brackets",
      artN:"Gallery walls >5 pieces billed at $75/hr after 2h. Standard drywall / stud walls only.",
      kitchScope:"Per door / per unit",kitchDesc:"Professional spray finish. Full package includes degreasing & prep.",
      kitch:[
        ["Cabinet Door Spray — 2 sides + box + prep (MOST POPULAR)","$155/door"],
        ["Cabinet Door Spray — 2 sides only","$125/door"],
        ["Cabinet Door Spray — 1 side only","$95/door"],
        ["Cabinet Door — Roller Finish (budget)","$45/door"],
        ["Drawer Front — small (up to 6\")","$65/ea"],
        ["Drawer Front — large (over 6\")","$75/ea"],
        ["End Panel / Fridge Panel","$125/ea"],
        ["Kitchen Island Accent (full refinish)","$460/island"],
        ["Interior Cabinet Box","$75/section"],
        ["Heavy Degreasing (soiled kitchen)","$20/door"],
        ["Oak Grain Filling","$45/door"],
        ["Two-Tone Color Surcharge","$300/project"],
        ["Glass Door Masking","$20/door"],
        ["Hardware Holes Fill","$20/door"],
        ["Top Coat Upgrade (extra durability)","$20/door"],
        ["Deep Damage Repair","$25/spot"],
        ["Caulking / Sealing","$3.50/lf"],
        ["Remove Contact Paper","$75/hour"]
      ],
      kitchProv:"Premium paint, primer, degreasing, and prep are included in the price",
      kitchN:"Standard LA kitchen: 20 doors × $155 = $3,100 + 8 drawer fronts × $65 = $520 + 1 island = $460. Smooth spray finish included.",
      furnpScope:"Per piece · Professional refinish",furnpDesc:"Full preparation, sanding, primer & paint included.",
      furnp:[
        ["Dining Chair","$95/piece"],
        ["Nightstand / Side Table","$145/piece"],
        ["Dresser / Large Cabinet","$450/piece"],
        ["Dining Table","$395/piece"],
        ["Built-in Cabinetry","$125/linear foot"]
      ],
      furnpProv:"Paint, stain, primer & sanding materials",
      furnpN:"Includes full surface prep (cleaning, sanding, filling). Materials quoted separately. Turnaround 5-7 days.",
      plumbScope:"Minor / Handyman-level · No permits",plumbDesc:"Cosmetic fixes only. No new lines or rough plumbing.",
      plumb:[
        ["Faucet Install (kitchen or bathroom)","$225/unit","1.5–2h"],
        ["Shower Head Replace","$150/unit","< 1h"],
        ["Toilet Tank Repair (flapper, fill valve)","$165/unit","~1h"],
        ["Re-Caulk Tub / Shower (old caulk removal included)","$250/unit","2–3h"]
      ],
      plumbProv:"Fixture or parts (client provides)",
      plumbN:"Shutoff valves must be functional. Heavy mold = extra charge. Beyond cosmetic scope → licensed C-36 plumber referral.",
      elecScope:"Like-for-like · No permits",elecDesc:"Replacement in existing boxes only. No new circuits.",
      elec:[
        ["Light Fixture Replace (existing box)","$185/unit","1–2h"],
        ["Outlets / Switches — first 1–2 units","$150/set","1–2h"],
        ["Outlets / Switches — each additional","$45/unit","~15 min"],
        ["Smart Doorbell / Smart Lock Install","$195/unit","1.5–2h"]
      ],
      elecProv:"Fixture, device, or switch (client provides)",
      elecN:"Ceiling fans with new support box → licensed C-10 electrician. No panel work, no new runs.",
      paintScope:"Per sq ft · Labor only",paintDesc:"SF = painted surface area (walls/ceiling/trim), not floor area.",
      pF1:[
        ["Walls — 1 coat (refresh/same color)","$3.00/sf"],
        ["Walls — 2 coats (color change)","$4.00/sf"],
        ["Ceiling — smooth (2 coats)","$4.00/sf"],
        ["Ceiling — textured (2 coats)","$4.50/sf"],
        ["Interior Door Slab","$95/door"],
        ["Baseboard Paint","$4.50/lf"],
        ["Baseboard Install (new)","$3.50/lf"],
        ["Crown Molding Paint","$5.00/lf"],
        ["Door Casing / Trim","$45/side"]
      ],
      pF2:[
        ["+ Surface Prep — sanding/patching","+$0.80/sf"],
        ["+ Wallpaper Removal","+$1.60/sf"],
        ["+ Mold Surface Treatment","+$2.00/sf"]
      ],
      pF3:[],
      paintProv:"All paint, primer & tools",
      paintN:"Materials (paint, supplies) quoted separately. Estimate visit $75 → credited at job start.",
      flScope:"Per sq ft · Labor only",flDesc:"Output: 120–250 sq ft/day.",
      flG1:[
        ["Laminate Click-Lock — labor only","$3.50/sf"],
        ["LVP / Vinyl Click — labor only","$3.75/sf"],
        ["Demo Old Floor","+$2.25/sf"],
        ["Underlayment Install","+$0.75/sf"],
        ["Transition Strip","$55/piece"],
        ["Door Undercut","$55/door"],
        ["Baseboard Remove & Reinstall","$3.50/lf"],
        ["Spot Leveling (per bag)","$65/bag"]
      ],
      flG2:[],
      flProv:"Flooring material is separate. We provide labor only.",
      flN:"Flooring material, underlayment & transitions quoted separately. Leveling compound quoted on-site."
    },

    /* PROOF CHIPS & CTA HIERARCHY */
    proofChip1:"Reply in 10–30 min (8am–8pm)",
    proofChip2:"Transparent pricing (labor only, no hidden)",
    proofChip3:"Clean-up included",

    /* HERO CTA */
    ctaPrimaryHero:"Get a Quote in 2 Minutes",
    ctaSubtitle:"No spam. Only about your request.",

    /* SERVICE CARD ADDITIONS */
    cardTimeLabel:"Typical time:",
    kitchTime:"Varies by area",furnpTime:"2–4h per piece",
    tvTime:"1–2h",furTime:"1.5–4h",artTime:"1–2.5h",
    paintTime:"Varies by area",floorTime:"Varies by area",
    plumbTime:"1–3h",elecTime:"1–2.5h",

    kitchBenefit:"Professional cabinet finish. Durable coating.",
    furnpBenefit:"Custom colors. Refinished look.",
    tvBenefit:"No mess. Wall-safe mounting.",
    furBenefit:"All parts included. Fully assembled.",
    artBenefit:"Level guarantee. Properly secured.",
    paintBenefit:"Professional finish. No spillage.",
    floorBenefit:"Clean installation. Debris removed.",
    plumbBenefit:"No leaks. Quality fixtures.",
    elecBenefit:"Safe wiring. Code-compliant.",

    tvBadge:"Most popular",paintBadge:"Same-day possible",

    comboTitle:"Pick 2 Services — Save 20%",
    comboSub:"Book any combo, get instant discount",

    /* SMS CAPTURE */
    smsCaptureTitle:"Get This Estimate via SMS",
    smsPhonePlaceholder:"Your phone number",
    smsConsent:"I agree to receive SMS about my estimate & special offers",
    smsSendBtn:"Text me this estimate",
    smsSuccess:"Estimate texted!",
    smsSuccessMsg:"Check your SMS in moments.",

    /* FORM UPDATES */
    formBtnNew:"Get Your Quote in 2 Min",
    formSubNew:"No spam. We only contact you to confirm the job."
  },

  es:{
    lang:"ES",
    heroEyebrow:"Servicios de Handyman en Los Ángeles",
    heroH:"Handyman Premium\nLos Ángeles",
    heroAccent:"Ayuda al Instante",
    heroSub:"Solo mano de obra · Sin margen en materiales · Misma semana",
    aiPowered:"Con IA",
    heroOfferTitle:"Pintura profesional de gabinetes desde $155 por puerta",
    heroOfferSubHtml:'<span class="hero-included-accent">Pintura premium, primer, desengrasado y preparacion estan incluidos en el precio</span><br>Acabado en spray liso que cuesta menos que reemplazar',
    aiSearchPlaceholder:"Pregunta a IA: cotiza mi proyecto",
    aiBadge:"Inteligente",
    aiSubmit:"Obtener Estimado",
    aiHelperText:"Asistente IA — responde preguntas y calcula precios al instante",
    chipPricing:"Precios",
    chipCabinet:"Pintura de Gabinetes",
    chipRepairs:"Reparaciones",
    chipKitchen:"Cocina",
    trustInstant:"Respuesta Instantánea",
    trustAccurate:"Estimados Precisos",
    trustSteps:"Pasos Claros",
    secondaryCta:"¿Prefieres hablar directamente?",
    callNow:"Llama Ahora",
    whatsApp:"WhatsApp",
    viewPricing:"Ver Precios",
    heroFullPricing:"💲 Precios Completos",
    gridLbl:"",
    base:[],
    svcs:[
      {id:"kitch",name:"Pintura de Cocinas",       from:"$45/puerta"},
      {id:"furnp",name:"Pintura de Muebles",       from:"$95/pieza"},
      {id:"paint",name:"Pintura Interior",         from:"$3.00/ft²"},
      {id:"floor",name:"Revestimiento de Pisos",   from:"$3.50/ft²"},
      {id:"tv",   name:"Montaje de TV",            from:"$165"},
      {id:"fur",  name:"Ensamblaje de Muebles",    from:"$150"},
      {id:"art",  name:"Arte, Espejos & Decoración",from:"$175"},
      {id:"plumb",name:"Plomería",                 from:"$150"},
      {id:"elec", name:"Eléctrico",                from:"$150"}
    ],
    calcTitle:"Calculadora de precio",
    calcSub:"Dimensiones del cuarto → precio",
    lSvc:"Servicio",lLen:"Largo (pies)",lWid:"Ancho (pies)",
    lBase:"Zócalos (pie lineal)",lTrans:"Transiciones (cant.)",lDoorU:"Recortes de puerta (cant.)",
    lHrs:"Horas estimadas",anchorBtn:"Obtener estimado",
    lModeRoom:"Habitación (L×A)",lModeTotal:"Total ft²",lSfTotal:"Total ft²",
    lCustomPrice:"Precio por ft² ($)",lCustomLen:"Largo (pies)",lCustomWid:"Ancho (pies)",lCustomSf:"Total ft²",
    calcSubCustom:"Precio personalizado por pie cuadrado",
    hrBadgeHint:"Ingresa las horas estimadas arriba",
    hrBadgeIncl:"Incluido en la llamada de servicio",
    hrBadgeFmt:(extra,tot)=>`$150 llamada + ${extra}h × $75 = <strong>$${tot}</strong>`,
    areaTotalHint:"Ingresa el total de ft²",
    areaTotalFmt:(sf)=>`Área total = <strong>${sf} ft²</strong>`,
    waGreet:"¡Hola Handy & Friend! 👋",
    waEstLabel:"Cotización",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Horas: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Habitación: ${len}ft × ${wid}ft = ${sf} ft²`,
    waConfirm:"Por favor confirme disponibilidad.",
    opts:[
      {v:"kitch",l:"🍳 Pintura de Gabinetes"},
      {v:"furnp",l:"🎨 Pintura de Muebles"},
      {v:"p1",l:"🖌️ Pintura Interior — 1 capa ($3.00/ft²)"},
      {v:"p2",l:"🖌️ Pintura Interior — 2 capas ($4.00/ft²)"},
      {v:"fl",l:"🏠 Pisos — Laminado ($3.50/ft²)"},
      {v:"fv",l:"🏠 Pisos — LVP ($3.75/ft²)"},
      {v:"custom",l:"💰 Precio personalizado por ft²"},
      {v:"trim",l:"📏 Molduras y Cenefas (por pie lineal)"},
      {v:"tv",l:"📺 Montaje de TV"},
      {v:"art",l:"🖼️ Cuadros & Espejos"},
      {v:"fur",l:"🛋️ Ensamblaje de muebles"},
      {v:"plumb",l:"🚰 Plomería"},
      {v:"elec",l:"⚡ Eléctrico"}
    ],
    ap:[
      {id:"prep", l:"+ Preparación / lijado",    p:"+$0.80/ft²"},
      {id:"wallp",l:"+ Retirar tapiz",           p:"+$1.60/ft²"},
      {id:"mold", l:"+ Tratamiento de moho",     p:"+$2.00/ft²"},
      {id:"strip",l:"+ Quitar pintura vieja",    p:"+$1.20/ft²"}
    ],
    af:[
      {id:"demo", l:"+ Demo piso existente",     p:"+$2.25/ft²"},
      {id:"under",l:"+ Underlayment / base",     p:"+$0.75/ft²"}
    ],
    calcSubKitchen:"Elige acabado y cantidad",
    calcSubFurn:"Elige tipo de pieza y cantidad",
    calcSubFixed:"Selecciona tu opción de servicio",
    calcSubLinear:"Elige tipo de moldura e ingresa longitud (pies)",
    lLinearService:"Tipo de servicio",lLinearLength:"Longitud",lLinearUnit:"Unidad",
    linearOpts:[
      {v:"baseboard",l:"Pintura de zócalo — $4.50/pie lin",p:4.50},
      {v:"baseboardInstall",l:"Instalación zócalo (nuevo) — $3.50/pie lin",p:3.50},
      {v:"baseboardRemove",l:"Remover & reinstalar zócalo — $3.50/pie lin",p:3.50},
      {v:"crown",l:"Pintura moldura corona — $5.00/pie lin",p:5.00},
      {v:"doorCasing",l:"Marco / moldura puerta — $45/lado",p:45},
      {v:"caulking",l:"Sellado / caulk — $3.50/pie lin",p:3.50},
      {v:"builtIn",l:"Gabinete empotrado — $125/pie lin",p:125}
    ],
    lDoorType:"Acabado de puerta",lDoorQty:"Cantidad de puertas",
    lDrawerS:"Cajones pequeños",lDrawerL:"Cajones grandes",lEndPanels:"Paneles laterales",
    lPieceType:"Tipo de pieza",lPieceQty:"Cantidad",
    kitchenDoorOpts:[
      {v:"doorRoller",l:"Rodillo — $45/puerta",p:45},
      {v:"door1side",l:"Spray 1 cara — $95/puerta",p:95},
      {v:"door2side",l:"Spray 2 caras — $125/puerta",p:125},
      {v:"doorFull",l:"Spray completo — $155/puerta",p:155}
    ],
    kitchenAddons:[
      {id:"degreasing",l:"Desengrasado profundo",p:"+$20/puerta"},
      {id:"oakFill",l:"Relleno grano de roble",p:"+$45/puerta"},
      {id:"twoTone",l:"Dos tonos",p:"+$300 fijo"}
    ],
    kecDivider:"También calcular por área",
    kecSqftTitle:"Precio por pie²",
    kecLinearTitle:"Precio por pie lineal",
    furnPieceOpts:[
      {v:"chair",l:"Silla — $95/pieza",p:95},
      {v:"nightstand",l:"Mesita de noche — $145/pieza",p:145},
      {v:"builtIn",l:"Mueble empotrado — $125/pie lin",p:125,unit:"lf"},
      {v:"diningTable",l:"Mesa de comedor — $395/pieza",p:395},
      {v:"dresser",l:"Cómoda — $450/pieza",p:450}
    ],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Montaje estándar (hasta 65\")",p:165},
        {id:"tvHide",l:"Cables ocultos (en pared)",p:250}
      ],
      art:[
        {id:"artHang",l:"Cuadros / Espejos (hasta 5 pcs)",p:175},
        {id:"curtain1",l:"Cortinas — primera ventana",p:165},
        {id:"curtainX",l:"Cada ventana adicional",p:50,addon:true}
      ],
      fur:[
        {id:"furSmall",l:"Artículos pequeños",p:150},
        {id:"furDresser",l:"Cómoda",p:200},
        {id:"furBed",l:"Marco de cama",p:275},
        {id:"furPax",l:"PAX / Closet grande (mín 4h)",p:280}
      ],
      plumb:[
        {id:"plFaucet",l:"Instalación de grifo",p:225},
        {id:"plShower",l:"Reemplazo de regadera",p:150},
        {id:"plToilet",l:"Reparación tanque",p:165},
        {id:"plCaulk",l:"Re-sellar bañera / ducha",p:250}
      ],
      elec:[
        {id:"elLight",l:"Reemplazo de luminaria",p:185},
        {id:"elOutlet",l:"Enchufes / interruptores (primeros 3)",p:150,extra:{l:"Enchufes adicionales",ep:45}},
        {id:"elSmart",l:"Timbre / cerradura inteligente",p:195}
      ]
    },
    calcBtn:"Calcular",
    resLbl:"Costo estimado de mano de obra",
    resSub:"Solo estimado · Precio final tras fotos o visita en sitio",
    waBtn:"Enviar por WhatsApp",copyBtn:"Copiar estimado",
    areaHint:(l,w,sf)=>l&&w?`${l} pies × ${w} pies = <strong>${sf} ft²</strong>`:"Ingresa largo × ancho del cuarto",
    sF1:"Superficies principales",sF2:"Preparación (adicional)",sF3:"Molduras (por pie lineal)",
    sG1:"Instalación",sG2:"Servicios adicionales",
    dr:{
      prov:"Usted provee",
      kitchScope:"Por puerta / por unidad",kitchDesc:"Acabado profesional con spray. Paquete completo incluye desengrasado y preparación.",
      kitch:[
        ["Puerta — spray 2 lados + caja + prep (MÁS POPULAR)","$155/puerta"],
        ["Puerta — spray 2 lados","$125/puerta"],
        ["Puerta — spray 1 lado","$95/puerta"],
        ["Puerta — Rodillo (económico)","$45/puerta"],
        ["Frente de cajón — pequeño (hasta 6\")","$65/ea"],
        ["Frente de cajón — grande (más de 6\")","$75/ea"],
        ["Panel lateral / Panel refrigerador","$125/ea"],
        ["Isla de cocina (restauración completa)","$460/isla"],
        ["Interior de gabinete","$75/sección"],
        ["Desengrasado profundo","$20/puerta"],
        ["Relleno de veta de roble","$45/puerta"],
        ["Cargo por dos tonos","$300/proyecto"],
        ["Enmascarado de puerta de vidrio","$20/puerta"],
        ["Relleno de huecos de herraje","$20/puerta"],
        ["Mejora de capa protectora (durabilidad extra)","$20/puerta"],
        ["Reparación de daño profundo","$25/punto"],
        ["Sellado / Calafateo","$3.50/lf"],
        ["Retiro de papel adhesivo","$75/hora"]
      ],
      kitchProv:"La pintura premium, imprimacion, desengrasado y preparacion estan incluidos en el precio",
      kitchN:"Cocina estandar de LA: 20 puertas × $155 = $3,100 + 8 frentes × $65 = $520 + 1 isla = $460. Acabado liso en spray incluido.",
      furnpScope:"Por pieza · Restauración profesional",furnpDesc:"Preparación completa, lijado, imprimación y pintura incluidos.",
      furnp:[
        ["Silla de comedor","$95/pieza"],
        ["Mesita de noche / Mesa auxiliar","$145/pieza"],
        ["Cómoda / Gabinete grande","$450/pieza"],
        ["Mesa de comedor","$395/pieza"],
        ["Gabinete empotrado","$125/pie lineal"]
      ],
      furnpProv:"Pintura, tinte, imprimación y materiales de lijado",
      furnpN:"Incluye preparación completa (limpieza, lijado, relleno). Materiales cotizados por separado. Entrega 5-7 días.",
      tvScope:"Precio fijo",tvDesc:"Manejo de cables superficiales incluido. Min $150 aplicado.",
      tv:[
        ["Montaje de TV — Estándar (hasta 65\")","$165/unidad","1–1.5h"],
        ["Montaje de TV — Cables ocultos (en pared)","$250/unidad","2–3h"]
      ],
      tvProv:"Soporte / bracket del TV",
      tvN:"Soporte no incluido. Opción oculta requiere sin bloques de fuego. Hoyos reparados y pintados.",
      furScope:"Precio fijo",furDesc:"Min $150 para artículos pequeños. Por hora para PAX.",
      fur:[
        ["Artículos pequeños (2–3 pcs) — mesita / silla / estante","$150","1–1.5h"],
        ["Cómoda (3–6 cajones)","$200","2–3h"],
        ["Marco de cama (cajones/mecanismo elevador = +$70/hr)","$275","2.5–4h"],
        ["PAX / sistema de closet grande","$70/hr · mín 4h ($280)","≥4h"]
      ],
      furProv:"Todas las piezas, tornillería e instrucciones",
      furN:"Complejidad excesiva o piezas faltantes se cobran a $70/hr después del tiempo incluido.",
      artScope:"Precio fijo",artDesc:"Hasta 5 piezas. Garantía de nivel incluida.",
      art:[
        ["Arte / Espejos — hasta 5 piezas","$175/paquete","1–2h"],
        ["Cortineros / Barras — 1ra ventana","$165/ventana","1.5–2.5h"],
        ["Cada ventana adicional","+$50/ventana","~30 min"]
      ],
      artProv:"Herraje, anclajes y soportes",
      artN:"Galerías >5 piezas se cobran a $75/hr después de 2h. Solo paredes estándar de drywall / vigas.",
      plumbScope:"Solo cosmético · Sin permisos",plumbDesc:"Válvulas existentes deben funcionar. Sin líneas nuevas.",
      plumb:[
        ["Instalación de grifo — cocina o baño","$225","1.5–2.5h"],
        ["Reemplazo de cabeza de ducha","$150","< 1h"],
        ["Reparación de tanque / válvula de llenado","$165","~1h"],
        ["Re-sellado de bañera / ducha","$250","2–3h"]
      ],
      plumbProv:"Grifo, accesorio o piezas de repuesto",
      plumbN:"Válvulas de cierre deben funcionar. Moho severo = cargo extra. Cualquier cosa fuera del alcance cosmético → plomero C-36.",
      elecScope:"Solo equivalente · Sin permisos",elecDesc:"Solo reemplazo en cajas existentes. Sin circuitos nuevos.",
      elec:[
        ["Cambio de luminaria — 1 (caja existente)","$185","1–2h"],
        ["Enchufes / interruptores — primeros 1–2","$150","1–2h"],
        ["Cada enchufe o interruptor adicional","+$45/ea","~15 min"],
        ["Timbre smart / Cerradura smart + configuración app","$195","1.5–2.5h"]
      ],
      elecProv:"Luminaria, dispositivo o interruptor",
      elecN:"Ventiladores con nueva caja de soporte → electricista C-10. Sin trabajo de panel ni nuevas líneas.",
      paintScope:"Por pie² · Solo mano de obra",paintDesc:"ft² = superficie pintada (paredes/techo), NO área del piso.",
      pF1:[
        ["Paredes — 1 capa (mismo color)","$3.00/ft²"],
        ["Paredes — 2 capas (cambio de color)","$4.00/ft²"],
        ["Techo — liso (2 capas)","$4.00/ft²"],
        ["Techo — texturizado (2 capas)","$4.50/ft²"],
        ["Puerta interior / hoja","$95/puerta"],
        ["Zócalo — pintura","$4.50/lf"],
        ["Zócalo — instalación (nuevo)","$3.50/lf"],
        ["Moldura corona","$5.00/lf"],
        ["Marco de puerta / moldura","$45/lado"]
      ],
      pF2:[
        ["+ Lijado / capa de imprimación","+$0.80/ft²"],
        ["+ Retiro de tapiz","+$1.60/ft²"],
        ["+ Raspado de pintura vieja (puntual)","+$1.20/ft²"],
        ["+ Tratamiento de moho superficial","+$2.00/ft²"]
      ],
      pF3:[],
      paintProv:"Toda la pintura, imprimación y herramientas",
      paintN:"Visita de estimado $75 → se acredita al inicio. Materiales por cliente, sin margen.",
      flScope:"Por pie² · Solo mano de obra",flDesc:"Rendimiento: 120–250 ft² por día según el producto.",
      flG1:[
        ["Laminado click-lock","$3.50/ft²"],
        ["LVP / Vinilo de lujo click","$3.75/ft²"],
        ["Demo piso existente","+$2.25/ft²"],
        ["Instalación de underlayment","+$0.75/ft²"],
        ["Tira de transición","$55/pieza"],
        ["Recorte inferior de puerta","$55/puerta"],
        ["Zócalo: retirar + instalar","$3.50/lf"],
        ["Nivelación puntual (por saco)","$65/saco"]
      ],
      flG2:[],
      flProv:"Material de piso por separado. Solo mano de obra.",
      flN:"Material de piso, underlayment y transiciones cotizados por separado. Nivelación — evaluación en sitio."
    },

    /* PROOF CHIPS & CTA HIERARCHY */
    proofChip1:"Respondemos en 10–30 min (8am–8pm)",
    proofChip2:"Precios transparentes (solo mano de obra, sin ocultos)",
    proofChip3:"Limpieza incluida",

    /* HERO CTA */
    ctaPrimaryHero:"Obtén tu estimado en 2 minutos",
    ctaSubtitle:"Sin spam. Solo acerca de tu solicitud.",

    /* SERVICE CARD ADDITIONS */
    cardTimeLabel:"Tiempo típico:",
    kitchTime:"Varía según el área",furnpTime:"2–4h por pieza",
    tvTime:"1–2h",furTime:"1.5–4h",artTime:"1–2.5h",
    paintTime:"Varía según el área",floorTime:"Varía según el área",
    plumbTime:"1–3h",elecTime:"1–2.5h",

    kitchBenefit:"Acabado profesional de gabinete. Recubrimiento duradero.",
    furnpBenefit:"Colores personalizados. Aspecto restaurado.",
    tvBenefit:"Sin desorden. Montaje seguro en pared.",
    furBenefit:"Todas las piezas incluidas. Completamente ensamblado.",
    artBenefit:"Garantía de nivel. Bien asegurado.",
    paintBenefit:"Acabado profesional. Sin derrames.",
    floorBenefit:"Instalación limpia. Escombros retirados.",
    plumbBenefit:"Sin fugas. Accesorios de calidad.",
    elecBenefit:"Cableado seguro. Conforme a códigos.",

    tvBadge:"Más popular",paintBadge:"Posible mismo día",

    comboTitle:"Elige 2 Servicios — Ahorra 20%",
    comboSub:"Reserva cualquier combo, obtén descuento instantáneo",

    /* SMS CAPTURE */
    smsCaptureTitle:"Recibe este estimado por SMS",
    smsPhonePlaceholder:"Tu número de teléfono",
    smsConsent:"Acepto recibir SMS sobre mi estimado y ofertas especiales",
    smsSendBtn:"Envíame este estimado",
    smsSuccess:"¡Estimado enviado!",
    smsSuccessMsg:"Revisa tu SMS en un momento.",

    /* FORM UPDATES */
    formBtnNew:"Obtén tu estimado en 2 min",
    formSubNew:"Sin spam. Solo para confirmar tu trabajo."
  },

  ru:{
    lang:"RU",
    heroEyebrow:"Услуги мастера в Лос-Анджелесе",
    heroH:"Профессиональный мастер\nДоступен сегодня",
    heroAccent:"мгновенную помощь",
    heroSub:"Опишите свой проект и получите помощь ИИ по ценам, срокам и следующим шагам — мгновенно.",
    aiPowered:"Работает ИИ",
    heroOfferTitle:"Профессиональная покраска шкафов от $155 за дверцу",
    heroOfferSubHtml:'<span class="hero-included-accent">Премиальная краска, грунт, обезжиривание и подготовка уже включены в стоимость</span><br>Гладкий распылительный финиш стоит дешевле полной замены',
    aiSearchPlaceholder:"ИИ: оцените мой проект",
    aiBadge:"Умный",
    aiSubmit:"Считать смету",
    aiHelperText:"ИИ-помощник — отвечает на вопросы и рассчитывает стоимость",
    chipPricing:"Цены",
    chipCabinet:"Покраска шкафов",
    chipRepairs:"Ремонт",
    chipKitchen:"Обновление кухни",
    trustInstant:"Мгновенный ответ",
    trustAccurate:"Точные сметы",
    trustSteps:"Ясные шаги",
    secondaryCta:"Предпочитаете прямой контакт?",
    callNow:"Позвонить",
    whatsApp:"WhatsApp",
    viewPricing:"Прайс",
    gridLbl:"",
    base:[],
    svcs:[
      {id:"kitch",name:"Покраска кухонь и фасадов",from:"$45/дверь"},
      {id:"furnp",name:"Покраска мебели",          from:"$95/шт"},
      {id:"paint",name:"Интерьерная покраска",     from:"$3.00/кф"},
      {id:"floor",name:"Напольное покрытие",       from:"$3.50/кф"},
      {id:"tv",   name:"Монтаж ТВ",               from:"$165"},
      {id:"fur",  name:"Сборка мебели",            from:"$150"},
      {id:"art",  name:"Картины, зеркала и декор", from:"$175"},
      {id:"plumb",name:"Сантехника",               from:"$150"},
      {id:"elec", name:"Электрика",                from:"$150"}
    ],
    calcTitle:"Калькулятор площади",
    calcSub:"Введите размеры комнаты → получите цену",
    lSvc:"Услуга",lLen:"Длина (футов)",lWid:"Ширина (футов)",
    lBase:"Плинтуса (пог.фут)",lTrans:"Порожки (шт.)",lDoorU:"Подрезка дверей (шт.)",
    lHrs:"Ориентировочное кол-во часов",anchorBtn:"Рассчитать стоимость",
    lModeRoom:"Комната (Д×Ш)",lModeTotal:"Общая площадь",lSfTotal:"Кв.футов всего",
    lCustomPrice:"Цена за кв.фут ($)",lCustomLen:"Длина (фут)",lCustomWid:"Ширина (фут)",lCustomSf:"Общая площадь",
    calcSubCustom:"Пользовательская цена за квадратный фут",
    hrBadgeHint:"Введите кол-во часов выше",
    hrBadgeIncl:"Входит в стоимость вызова",
    hrBadgeFmt:(extra,tot)=>`Вызов $150 + ${extra}ч × $75 = <strong>$${tot}</strong>`,
    areaTotalHint:"Введите кв.футов",
    areaTotalFmt:(sf)=>`Общая площадь = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привет, Handy & Friend! 👋",
    waEstLabel:"Смета",waTotalLabel:"Итого",
    waHoursDetail:(h)=>`Часов: ~${h}ч`,
    waRoomDetail:(len,wid,sf)=>`Комната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Пожалуйста, подтвердите наличие.",
    opts:[
      {v:"kitch",l:"🍳 Покраска кухонных фасадов"},
      {v:"furnp",l:"🎨 Покраска мебели"},
      {v:"p1",l:"🖌️ Интерьер — 1 слой ($3.00/кф)"},
      {v:"p2",l:"🖌️ Интерьер — 2 слоя ($4.00/кф)"},
      {v:"fl",l:"🏠 Ламинат ($3.50/кф)"},
      {v:"fv",l:"🏠 LVP ($3.75/кф)"},
      {v:"custom",l:"💰 Своя цена за кв.фут"},
      {v:"trim",l:"📏 Отделка и Молдинги (за линейный фут)"},
      {v:"tv",l:"📺 Монтаж ТВ"},
      {v:"art",l:"🖼️ Картины & Зеркала"},
      {v:"fur",l:"🛋️ Сборка мебели"},
      {v:"plumb",l:"🚰 Сантехника"},
      {v:"elec",l:"⚡ Электрика"}
    ],
    ap:[
      {id:"prep", l:"+ Подготовка / шлифовка",  p:"+$0.80/кф"},
      {id:"wallp",l:"+ Снятие обоев",            p:"+$1.60/кф"},
      {id:"mold", l:"+ Обработка плесени",       p:"+$2.00/кф"},
      {id:"strip",l:"+ Снятие старой краски",    p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покрытия",       p:"+$2.25/кф"},
      {id:"under",l:"+ Укладка подложки",        p:"+$0.75/кф"}
    ],
    calcSubKitchen:"Выберите покрытие и количество дверей",
    calcSubFurn:"Выберите тип предмета и количество",
    calcSubFixed:"Выберите вариант услуги",
    calcSubLinear:"Выберите тип отделки и введите длину (фут)",
    lLinearService:"Тип отделки",lLinearLength:"Длина",lLinearUnit:"Единица",
    linearOpts:[
      {v:"baseboard",l:"Покраска плинтуса — $4.50/пог.фут",p:4.50},
      {v:"baseboardInstall",l:"Установка плинтуса (новый) — $3.50/пог.фут",p:3.50},
      {v:"baseboardRemove",l:"Снять & переустановить плинтус — $3.50/пог.фут",p:3.50},
      {v:"crown",l:"Покраска молдинга — $5.00/пог.фут",p:5.00},
      {v:"doorCasing",l:"Отделка дверного проёма — $45/сторона",p:45},
      {v:"caulking",l:"Герметизация / герметик — $3.50/пог.фут",p:3.50},
      {v:"builtIn",l:"Встроенная мебель — $125/пог.фут",p:125}
    ],
    lDoorType:"Покрытие двери",lDoorQty:"Кол-во дверей",
    lDrawerS:"Маленькие ящики",lDrawerL:"Большие ящики",lEndPanels:"Торцевые панели",
    lPieceType:"Тип предмета",lPieceQty:"Количество",
    kitchenDoorOpts:[
      {v:"doorRoller",l:"Валик — $45/дверь",p:45},
      {v:"door1side",l:"Спрей 1 сторона — $95/дверь",p:95},
      {v:"door2side",l:"Спрей 2 стороны — $125/дверь",p:125},
      {v:"doorFull",l:"Полный спрей — $155/дверь",p:155}
    ],
    kitchenAddons:[
      {id:"degreasing",l:"Глубокое обезжиривание",p:"+$20/дверь"},
      {id:"oakFill",l:"Заполнение текстуры дуба",p:"+$45/дверь"},
      {id:"twoTone",l:"Двухцветная покраска",p:"+$300 фикс"}
    ],
    kecDivider:"Также рассчитать по площади",
    kecSqftTitle:"Цена за кв.фут",
    kecLinearTitle:"Цена за пог.фут",
    furnPieceOpts:[
      {v:"chair",l:"Стул — $95/шт",p:95},
      {v:"nightstand",l:"Тумба — $145/шт",p:145},
      {v:"builtIn",l:"Встроенный модуль — $125/п.ф",p:125,unit:"lf"},
      {v:"diningTable",l:"Обеденный стол — $395/шт",p:395},
      {v:"dresser",l:"Комод — $450/шт",p:450}
    ],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Стандартный монтаж (до 65\")",p:165},
        {id:"tvHide",l:"Скрытые провода (в стене)",p:250}
      ],
      art:[
        {id:"artHang",l:"Картины / Зеркала (до 5 шт.)",p:175},
        {id:"curtain1",l:"Карнизы — первое окно",p:165},
        {id:"curtainX",l:"Каждое доп. окно",p:50,addon:true}
      ],
      fur:[
        {id:"furSmall",l:"Мелкие предметы (полка, стол)",p:150},
        {id:"furDresser",l:"Комод",p:200},
        {id:"furBed",l:"Кровать",p:275},
        {id:"furPax",l:"PAX / Большой шкаф (мин 4ч)",p:280}
      ],
      plumb:[
        {id:"plFaucet",l:"Установка смесителя",p:225},
        {id:"plShower",l:"Замена душевой лейки",p:150},
        {id:"plToilet",l:"Ремонт бачка унитаза",p:165},
        {id:"plCaulk",l:"Перегерметизация ванны",p:250}
      ],
      elec:[
        {id:"elLight",l:"Замена светильника",p:185},
        {id:"elOutlet",l:"Розетки / выключатели (первые 3)",p:150,extra:{l:"Доп. розетки",ep:45}},
        {id:"elSmart",l:"Умный звонок / замок",p:195}
      ]
    },
    calcBtn:"Рассчитать",
    resLbl:"Стоимость работ (ориентировочно)",
    resSub:"Примерная цена · Точная — после фото или выезда на объект",
    waBtn:"Отправить в WhatsApp",copyBtn:"Скопировать расчёт",
    areaHint:(l,w,sf)=>l&&w?`${l} фут × ${w} фут = <strong>${sf} кв.фут</strong>`:"Введите длину и ширину комнаты",
    sF1:"Основные поверхности",sF2:"Подготовка (доп.)",sF3:"Молдинги / отделка (пог.фут)",
    sG1:"Укладка",sG2:"Дополнительные работы",
    dr:{
      prov:"Вы обеспечиваете",
      kitchScope:"За дверь / за единицу",kitchDesc:"Профессиональная покраска пульверизатором. Полный пакет: обезжиривание и подготовка.",
      kitch:[
        ["Дверь — спрей 2 стороны + короб + подготовка (ПОПУЛЯРНОЕ)","$155/дверь"],
        ["Дверь — спрей 2 стороны","$125/дверь"],
        ["Дверь — спрей 1 сторона","$95/дверь"],
        ["Дверь — валик (бюджет)","$45/дверь"],
        ["Фасад ящика — малый (до 6\")","$65/шт"],
        ["Фасад ящика — большой (более 6\")","$75/шт"],
        ["Боковая панель / панель холодильника","$125/шт"],
        ["Кухонный остров (полная реставрация)","$460/остров"],
        ["Внутренний короб шкафа","$75/секция"],
        ["Глубокое обезжиривание","$20/дверь"],
        ["Заполнение текстуры дуба","$45/дверь"],
        ["Доплата за два тона","$300/проект"],
        ["Маскировка стеклянных дверей","$20/дверь"],
        ["Заполнение отверстий от фурнитуры","$20/дверь"],
        ["Улучшенное защитное покрытие (доп. прочность)","$20/дверь"],
        ["Ремонт глубоких повреждений","$25/точка"],
        ["Герметизация / конопатка","$3.50/пф"],
        ["Удаление контактной плёнки","$75/час"]
      ],
      kitchProv:"Премиальная краска, грунт, обезжиривание и подготовка уже включены в стоимость",
      kitchN:"Стандартная кухня LA: 20 дверей × $155 = $3,100 + 8 фасадов × $65 = $520 + 1 остров = $460. Гладкое распылительное покрытие включено.",
      furnpScope:"За единицу · Профессиональная реставрация",furnpDesc:"Полная подготовка, шлифовка, грунт и покраска включены.",
      furnp:[
        ["Обеденный стул","$95/шт"],
        ["Тумбочка / Приставной столик","$145/шт"],
        ["Комод / Большой шкаф","$450/шт"],
        ["Обеденный стол","$395/шт"],
        ["Встроенная мебель","$125/пог.фут"]
      ],
      furnpProv:"Краска, морилка, грунт и материалы для шлифовки",
      furnpN:"Включает полную подготовку (чистка, шлифовка, заполнение). Материалы — отдельно. Срок 5–7 дней.",
      tvScope:"Фиксированная цена",tvDesc:"Укладка кабелей по поверхности включена. Минимальный выезд $150.",
      tv:[
        ["Монтаж ТВ — Стандартный (до 65\")","$165/ед.","1–1.5ч"],
        ["Монтаж ТВ — Скрытая проводка (в стене)","$250/ед.","2–3ч"]
      ],
      tvProv:"Кронштейн / держатель",
      tvN:"Кронштейн не входит. Скрытая проводка — только если нет противопожарных блоков. Отверстия зашпаклёваны и покрашены.",
      furScope:"Фиксированная цена",furDesc:"Минимальный выезд $150 для мелких предметов. Почасовая для PAX.",
      fur:[
        ["Мелкие предметы (2–3 шт.) — тумбочка / стул / полка","$150","1–1.5ч"],
        ["Комод (3–6 ящиков)","$200","2–3ч"],
        ["Каркас кровати (хранение/подъёмный механизм = +$70/ч)","$275","2.5–4ч"],
        ["PAX / система большого гардероба","$70/ч · мин 4ч ($280)","≥4ч"]
      ],
      furProv:"Все детали, крепёж и инструкции",
      furN:"Повышенная сложность или недостающие детали — доплата $70/ч сверх включённого времени.",
      artScope:"Фиксированная цена",artDesc:"До 5 предметов. Гарантия горизонтали включена.",
      art:[
        ["Картины / Зеркала — до 5 штук","$175/пакет","1–2ч"],
        ["Карнизы / Штанги — 1-е окно","$165/окно","1.5–2.5ч"],
        ["Каждое дополнительное окно","+$50/окно","~30 мин"]
      ],
      artProv:"Крепёж, анкеры, кронштейны",
      artN:"Галерея >5 предметов — $75/ч после 2ч. Только стандартные стены (гипсокартон/балки).",
      plumbScope:"Только косметика · Без разрешений",plumbDesc:"Запорные клапаны должны работать. Без новых линий.",
      plumb:[
        ["Установка крана — кухня или ванная","$225","1.5–2.5ч"],
        ["Замена душевой лейки","$150","< 1ч"],
        ["Ремонт бачка / наполнительного клапана","$165","~1ч"],
        ["Повторная герметизация ванны / душа","$250","2–3ч"]
      ],
      plumbProv:"Кран, смеситель или запчасти",
      plumbN:"Запорные клапаны должны работать. Сильная плесень — доплата. Всё сверх косметики → направление C-36.",
      elecScope:"Только замена аналогом · Без разрешений",elecDesc:"Только замена в существующих коробках. Без новых линий.",
      elec:[
        ["Замена светильника — 1 шт. (существующая коробка)","$185","1–2ч"],
        ["Розетки / выключатели — первые 1–2 шт.","$150","1–2ч"],
        ["Каждая дополнительная розетка или выключатель","+$45/шт.","~15 мин"],
        ["Умный звонок / Умный замок + настройка приложения","$195","1.5–2.5ч"]
      ],
      elecProv:"Светильник, устройство или выключатель",
      elecN:"Вентиляторы с новой опорной коробкой → лицензированный C-10. Без работ на щитке, без новых цепей.",
      paintScope:"За кв.фут · Только работа",paintDesc:"кф = площадь окрашиваемой поверхности (стены/потолок), НЕ площадь пола.",
      pF1:[
        ["Стены — 1 слой (обновление цвета)","$3.00/кф"],
        ["Стены — 2 слоя (смена цвета)","$4.00/кф"],
        ["Потолок — гладкий (2 слоя)","$4.00/кф"],
        ["Потолок — текстурный (2 слоя)","$4.50/кф"],
        ["Межкомнатная дверь / полотно","$95/дверь"],
        ["Плинтус — покраска","$4.50/пф"],
        ["Плинтус — установка (новый)","$3.50/пф"],
        ["Молдинг корона","$5.00/пф"],
        ["Дверная коробка / наличник","$45/сторона"]
      ],
      pF2:[
        ["+ Шлифовка / грунтовочный слой","+$0.80/кф"],
        ["+ Снятие обоев","+$1.60/кф"],
        ["+ Снятие старой краски (точечно)","+$1.20/кф"],
        ["+ Обработка поверхности от плесени","+$2.00/кф"]
      ],
      pF3:[],
      paintProv:"Вся краска, грунт и инструменты",
      paintN:"Выезд для оценки $75 → засчитывается в стоимость работ. Материалы — клиент, без наценки.",
      flScope:"За кв.фут · Только работа",flDesc:"Выработка: 120–250 кв.фут в день в зависимости от продукта.",
      flG1:[
        ["Ламинат замковый (click-lock)","$3.50/кф"],
        ["LVP / Роскошный виниловый ламинат","$3.75/кф"],
        ["Демонтаж старого пола","+$2.25/кф"],
        ["Укладка подложки","+$0.75/кф"],
        ["Порожек перехода","$55/шт."],
        ["Подрезка двери","$55/дверь"],
        ["Плинтус: снять + установить","$3.50/пф"],
        ["Точечное выравнивание (за мешок)","$65/мешок"]
      ],
      flG2:[],
      flProv:"Материал покрытия — отдельно. Только работа.",
      flN:"Материал покрытия, подложка и порожки — отдельно. Выравнивание — оценка на месте."
    },

    /* PROOF CHIPS & CTA HIERARCHY */
    proofChip1:"Ответим в 10–30 мин (8am–8pm)",
    proofChip2:"Прозрачные цены (только работа, без скрытых)",
    proofChip3:"Уборка включена",

    /* HERO CTA */
    ctaPrimaryHero:"Получить смету за 2 минуты",
    ctaSubtitle:"Без спама. Только о вашей заявке.",

    /* SERVICE CARD ADDITIONS */
    cardTimeLabel:"Типичное время:",
    kitchTime:"Зависит от площади",furnpTime:"2–4ч за единицу",
    tvTime:"1–2ч",furTime:"1.5–4ч",artTime:"1–2.5ч",
    paintTime:"Зависит от площади",floorTime:"Зависит от площади",
    plumbTime:"1–3ч",elecTime:"1–2.5ч",

    kitchBenefit:"Профессиональная покраска фасадов. Стойкое покрытие.",
    furnpBenefit:"Любые цвета. Обновлённый вид.",
    tvBenefit:"Без беспорядка. Безопасное крепление на стену.",
    furBenefit:"Все части включены. Полная сборка.",
    artBenefit:"Гарантия уровня. Надежное крепление.",
    paintBenefit:"Профессиональная отделка. Без пролива.",
    floorBenefit:"Чистая установка. Мусор вывезен.",
    plumbBenefit:"Без протечек. Качественная фурнитура.",
    elecBenefit:"Безопасная проводка. По кодексу.",

    tvBadge:"Самый популярный",paintBadge:"Возможно в тот же день",

    comboTitle:"Выбери 2 услуги — сэкономь 20%",
    comboSub:"Закажи комбо — скидка сразу",

    /* SMS CAPTURE */
    smsCaptureTitle:"Получить смету по СМС",
    smsPhonePlaceholder:"Ваш номер телефона",
    smsConsent:"Я согласен получать СМС о моей смете и специальных предложениях",
    smsSendBtn:"Отправить мне эту смету",
    smsSuccess:"Смета отправлена!",
    smsSuccessMsg:"Проверьте СМС через минуту.",

    /* FORM UPDATES */
    formBtnNew:"Получить смету за 2 мин",
    formSubNew:"Без спама. Мы свяжемся только для подтверждения работы."
  },

  ua:{
    lang:"UA",
    heroEyebrow:"Послуги майстра у Лос-Анджелесі",
    heroH:"Професійний майстер\nДоступний сьогодні",
    heroAccent:"миттєву допомогу",
    heroSub:"Опишіть свій проект і отримайте допомогу ШІ щодо цін, термінів та наступних кроків — миттєво.",
    aiPowered:"Працює ШІ",
    heroOfferTitle:"Професійне фарбування шаф від $155 за дверцята",
    heroOfferSubHtml:'<span class="hero-included-accent">Преміальна фарба, ґрунт, знежирення та підготовка вже входять у вартість</span><br>Гладке розпилювальне покриття коштує дешевше за повну заміну',
    aiSearchPlaceholder:"ШІ: оцініть мій проект",
    aiBadge:"Розумна",
    aiSubmit:"Розрахувати",
    aiHelperText:"ШІ-помічник — відповідає на питання та розраховує вартість",
    chipPricing:"Ціни",
    chipCabinet:"Фарбування шаф",
    chipRepairs:"Ремонт",
    chipKitchen:"Оновлення кухні",
    trustInstant:"Миттєва відповідь",
    trustAccurate:"Точні кошториси",
    trustSteps:"Чіткі кроки",
    secondaryCta:"Бажаєте прямого контакту?",
    callNow:"Позвонити",
    whatsApp:"WhatsApp",
    viewPricing:"Прайс",
    gridLbl:"",
    base:[],
    svcs:[
      {id:"kitch",name:"Фарбування кухонь та фасадів",from:"$45/дверця"},
      {id:"furnp",name:"Фарбування меблів",           from:"$95/шт"},
      {id:"paint",name:"Інтер'єрне фарбування",       from:"$3.00/кф"},
      {id:"floor",name:"Підлогове покриття",           from:"$3.50/кф"},
      {id:"tv",   name:"Монтаж ТВ",                   from:"$165"},
      {id:"fur",  name:"Збирання меблів",              from:"$150"},
      {id:"art",  name:"Картини, дзеркала та декор",   from:"$175"},
      {id:"plumb",name:"Сантехніка",                   from:"$150"},
      {id:"elec", name:"Електрика",                    from:"$150"}
    ],
    calcTitle:"Калькулятор площі",
    calcSub:"Введіть розміри кімнати → отримайте ціну",
    lSvc:"Послуга",lLen:"Довжина (фут)",lWid:"Ширина (фут)",
    lBase:"Плінтуси (пог.фут)",lTrans:"Поріжки (шт.)",lDoorU:"Підрізання дверей (шт.)",
    lHrs:"Орієнтовна кількість годин",anchorBtn:"Розрахувати вартість",
    lModeRoom:"Кімната (Д×Ш)",lModeTotal:"Загальна площа",lSfTotal:"Кв.фут загалом",
    lCustomPrice:"Ціна за кв.фут ($)",lCustomLen:"Довжина (фут)",lCustomWid:"Ширина (фут)",lCustomSf:"Загальна площа",
    calcSubCustom:"Користувацька ціна за квадратний фут",
    hrBadgeHint:"Введіть кількість годин вище",
    hrBadgeIncl:"Входить у вартість виклику",
    hrBadgeFmt:(extra,tot)=>`Виклик $150 + ${extra}год × $75 = <strong>$${tot}</strong>`,
    areaTotalHint:"Введіть кв.фут",
    areaTotalFmt:(sf)=>`Загальна площа = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привіт, Handy & Friend! 👋",
    waEstLabel:"Кошторис",waTotalLabel:"Всього",
    waHoursDetail:(h)=>`Годин: ~${h}год`,
    waRoomDetail:(len,wid,sf)=>`Кімната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Просимо підтвердити наявність.",
    opts:[
      {v:"kitch",l:"🍳 Фарбування кухонних фасадів"},
      {v:"furnp",l:"🎨 Фарбування меблів"},
      {v:"p1",l:"🖌️ Інтер'єр — 1 шар ($3.00/кф)"},
      {v:"p2",l:"🖌️ Інтер'єр — 2 шари ($4.00/кф)"},
      {v:"fl",l:"🏠 Ламінат ($3.50/кф)"},
      {v:"fv",l:"🏠 LVP ($3.75/кф)"},
      {v:"custom",l:"💰 Своя ціна за кв.фут"},
      {v:"trim",l:"📏 Обладнання та Молдинги (за лінійний фут)"},
      {v:"tv",l:"📺 Монтаж ТВ"},
      {v:"art",l:"🖼️ Картини & Дзеркала"},
      {v:"fur",l:"🛋️ Збирання меблів"},
      {v:"plumb",l:"🚰 Сантехніка"},
      {v:"elec",l:"⚡ Електрика"}
    ],
    ap:[
      {id:"prep", l:"+ Підготовка / шліфування",  p:"+$0.80/кф"},
      {id:"wallp",l:"+ Зняття шпалер",            p:"+$1.60/кф"},
      {id:"mold", l:"+ Обробка плісняви",         p:"+$2.00/кф"},
      {id:"strip",l:"+ Зняття старої фарби",      p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покриття",        p:"+$2.25/кф"},
      {id:"under",l:"+ Укладання підкладки",      p:"+$0.75/кф"}
    ],
    calcSubKitchen:"Оберіть покриття та кількість дверей",
    calcSubFurn:"Оберіть тип предмета та кількість",
    calcSubFixed:"Оберіть варіант послуги",
    calcSubLinear:"Оберіть тип молдингу та введіть довжину (фут)",
    lLinearService:"Тип роботи",lLinearLength:"Довжина",lLinearUnit:"Одиниця",
    linearOpts:[
      {v:"baseboard",l:"Фарбування плінтуса — $4.50/пог.фут",p:4.50},
      {v:"baseboardInstall",l:"Установка плінтуса (новий) — $3.50/пог.фут",p:3.50},
      {v:"baseboardRemove",l:"Зняти & переустановити плінтус — $3.50/пог.фут",p:3.50},
      {v:"crown",l:"Фарбування молдингу — $5.00/пог.фут",p:5.00},
      {v:"doorCasing",l:"Обрамлення дверей — $45/сторона",p:45},
      {v:"caulking",l:"Герметизація / герметик — $3.50/пог.фут",p:3.50},
      {v:"builtIn",l:"Вбудована меблі — $125/пог.фут",p:125}
    ],
    lDoorType:"Покриття дверей",lDoorQty:"Кількість дверей",
    lDrawerS:"Маленькі ящики",lDrawerL:"Великі ящики",lEndPanels:"Торцеві панелі",
    lPieceType:"Тип предмета",lPieceQty:"Кількість",
    kitchenDoorOpts:[
      {v:"doorRoller",l:"Валик — $45/двері",p:45},
      {v:"door1side",l:"Спрей 1 сторона — $95/двері",p:95},
      {v:"door2side",l:"Спрей 2 сторони — $125/двері",p:125},
      {v:"doorFull",l:"Повний спрей — $155/двері",p:155}
    ],
    kitchenAddons:[
      {id:"degreasing",l:"Глибоке знежирення",p:"+$20/двері"},
      {id:"oakFill",l:"Заповнення текстури дуба",p:"+$45/двері"},
      {id:"twoTone",l:"Двоколірне фарбування",p:"+$300 фікс"}
    ],
    kecDivider:"Також розрахувати за площею",
    kecSqftTitle:"Ціна за кв.фут",
    kecLinearTitle:"Ціна за пог.фут",
    furnPieceOpts:[
      {v:"chair",l:"Стілець — $95/шт",p:95},
      {v:"nightstand",l:"Тумба — $145/шт",p:145},
      {v:"builtIn",l:"Вбудований модуль — $125/п.ф",p:125,unit:"lf"},
      {v:"diningTable",l:"Обідній стіл — $395/шт",p:395},
      {v:"dresser",l:"Комод — $450/шт",p:450}
    ],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Стандартний монтаж (до 65\")",p:165},
        {id:"tvHide",l:"Приховані дроти (в стіні)",p:250}
      ],
      art:[
        {id:"artHang",l:"Картини / Дзеркала (до 5 шт.)",p:175},
        {id:"curtain1",l:"Карнизи — перше вікно",p:165},
        {id:"curtainX",l:"Кожне додаткове вікно",p:50,addon:true}
      ],
      fur:[
        {id:"furSmall",l:"Дрібні предмети (полиця, стіл)",p:150},
        {id:"furDresser",l:"Комод",p:200},
        {id:"furBed",l:"Ліжко",p:275},
        {id:"furPax",l:"PAX / Велика шафа (мін 4год)",p:280}
      ],
      plumb:[
        {id:"plFaucet",l:"Встановлення змішувача",p:225},
        {id:"plShower",l:"Заміна душової лійки",p:150},
        {id:"plToilet",l:"Ремонт бачка унітазу",p:165},
        {id:"plCaulk",l:"Перегерметизація ванни",p:250}
      ],
      elec:[
        {id:"elLight",l:"Заміна світильника",p:185},
        {id:"elOutlet",l:"Розетки / вимикачі (перші 3)",p:150,extra:{l:"Додаткові розетки",ep:45}},
        {id:"elSmart",l:"Розумний дзвінок / замок",p:195}
      ]
    },
    calcBtn:"Розрахувати",
    resLbl:"Вартість робіт (орієнтовно)",
    resSub:"Приблизна ціна · Точна — після фото або виїзду на об'єкт",
    waBtn:"Надіслати у WhatsApp",copyBtn:"Скопіювати розрахунок",
    areaHint:(l,w,sf)=>l&&w?`${l} фут × ${w} фут = <strong>${sf} кв.фут</strong>`:"Введіть довжину та ширину кімнати",
    sF1:"Основні поверхні",sF2:"Підготовка (додатково)",sF3:"Молдинги / оздоблення (пог.фут)",
    sG1:"Укладання",sG2:"Додаткові роботи",
    dr:{
      prov:"Ви забезпечуєте",
      kitchScope:"За дверцю / за одиницю",kitchDesc:"Професійне фарбування пульверизатором. Повний пакет: знежирення та підготовка.",
      kitch:[
        ["Дверця — спрей 2 сторони + короб + підготовка (ПОПУЛЯРНЕ)","$155/дверця"],
        ["Дверця — спрей 2 сторони","$125/дверця"],
        ["Дверця — спрей 1 сторона","$95/дверця"],
        ["Дверця — валик (бюджет)","$45/дверця"],
        ["Фасад шухляди — малий (до 6\")","$65/шт"],
        ["Фасад шухляди — великий (понад 6\")","$75/шт"],
        ["Бічна панель / панель холодильника","$125/шт"],
        ["Кухонний острів (повна реставрація)","$460/острів"],
        ["Внутрішній короб шафи","$75/секція"],
        ["Глибоке знежирення","$20/дверця"],
        ["Заповнення текстури дуба","$45/дверця"],
        ["Доплата за два тони","$300/проект"],
        ["Маскування скляних дверцят","$20/дверця"],
        ["Заповнення отворів від фурнітури","$20/дверця"],
        ["Покращене захисне покриття (додаткова міцність)","$20/дверця"],
        ["Ремонт глибоких пошкоджень","$25/точка"],
        ["Герметизація / конопатка","$3.50/пф"],
        ["Видалення контактної плівки","$75/год"]
      ],
      kitchProv:"Преміальна фарба, ґрунт, знежирення та підготовка вже входять у вартість",
      kitchN:"Стандартна кухня LA: 20 дверцят × $155 = $3,100 + 8 фасадів × $65 = $520 + 1 острів = $460. Гладке розпилювальне покриття включено.",
      furnpScope:"За одиницю · Професійна реставрація",furnpDesc:"Повна підготовка, шліфування, ґрунт та фарбування включені.",
      furnp:[
        ["Обідній стілець","$95/шт"],
        ["Тумбочка / Приставний столик","$145/шт"],
        ["Комод / Велика шафа","$450/шт"],
        ["Обідній стіл","$395/шт"],
        ["Вбудовані меблі","$125/пог.фут"]
      ],
      furnpProv:"Фарба, морилка, ґрунт та матеріали для шліфування",
      furnpN:"Включає повну підготовку (чистка, шліфування, заповнення). Матеріали — окремо. Термін 5–7 днів.",
      tvScope:"Фіксована ціна",tvDesc:"Укладання кабелів по поверхні включено. Мінімальний виїзд $150.",
      tv:[
        ["Монтаж ТВ — Стандартний (до 65\")","$165/од.","1–1.5год"],
        ["Монтаж ТВ — Прихована проводка (в стіні)","$250/од.","2–3год"]
      ],
      tvProv:"Кронштейн / тримач для ТВ",
      tvN:"Кронштейн не входить. Прихована проводка — тільки якщо немає протипожежних блоків. Отвори зашпакльовані та пофарбовані.",
      furScope:"Фіксована ціна",furDesc:"Мінімальний виїзд $150 для дрібних предметів. Погодинна для PAX.",
      fur:[
        ["Дрібні предмети (2–3 шт.) — тумбочка / стілець / полиця","$150","1–1.5год"],
        ["Комод (3–6 шухляд)","$200","2–3год"],
        ["Каркас ліжка (зберігання/підйомний механізм = +$70/год)","$275","2.5–4год"],
        ["PAX / система великої гардеробної","$70/год · мін 4год ($280)","≥4год"]
      ],
      furProv:"Всі деталі, кріплення та інструкції",
      furN:"Підвищена складність або відсутні деталі — доплата $70/год понад включений час.",
      artScope:"Фіксована ціна",artDesc:"До 5 предметів. Гарантія горизонталі включена.",
      art:[
        ["Картини / Дзеркала — до 5 штук","$175/пакет","1–2год"],
        ["Карнизи / Штанги — 1-е вікно","$165/вікно","1.5–2.5год"],
        ["Кожне додаткове вікно","+$50/вікно","~30 хв"]
      ],
      artProv:"Кріплення, анкери, кронштейни",
      artN:"Галерея >5 предметів — $75/год після 2год. Тільки стандартні стіни (гіпсокартон/балки).",
      plumbScope:"Тільки косметика · Без дозволів",plumbDesc:"Запірні клапани мають працювати. Без нових ліній.",
      plumb:[
        ["Встановлення крана — кухня або ванна","$225","1.5–2.5год"],
        ["Заміна душової лійки","$150","< 1год"],
        ["Ремонт бачка / наповнювального клапана","$165","~1год"],
        ["Повторне герметизування ванни / душу","$250","2–3год"]
      ],
      plumbProv:"Кран, змішувач або запчастини",
      plumbN:"Запірні клапани мають працювати. Сильна пліснява — доплата. Все що виходить за косметику → направлення C-36.",
      elecScope:"Тільки заміна аналогом · Без дозволів",elecDesc:"Тільки заміна в існуючих коробках. Без нових ліній.",
      elec:[
        ["Заміна світильника — 1 шт. (існуюча коробка)","$185","1–2год"],
        ["Розетки / вимикачі — перші 1–2 шт.","$150","1–2год"],
        ["Кожна додаткова розетка або вимикач","+$45/шт.","~15 хв"],
        ["Розумний дзвінок / Розумний замок + налаштування додатку","$195","1.5–2.5год"]
      ],
      elecProv:"Світильник, пристрій або вимикач",
      elecN:"Стельові вентилятори з новою опорною коробкою → ліцензований C-10. Без робіт на щитку, без нових цепів.",
      paintScope:"За кв.фут · Тільки робота",paintDesc:"кф = площа поверхні фарбування (стіни/стеля), НЕ площа підлоги.",
      pF1:[
        ["Стіни — 1 шар (оновлення кольору)","$3.00/кф"],
        ["Стіни — 2 шари (зміна кольору)","$4.00/кф"],
        ["Стеля — гладка (2 шари)","$4.00/кф"],
        ["Стеля — текстурна (2 шари)","$4.50/кф"],
        ["Міжкімнатні двері / полотно","$95/двері"],
        ["Плінтус — фарбування","$4.50/пф"],
        ["Плінтус — встановлення (новий)","$3.50/пф"],
        ["Молдинг корона","$5.00/пф"],
        ["Дверна коробка / лиштва","$45/сторона"]
      ],
      pF2:[
        ["+ Шліфування / ґрунтувальний шар","+$0.80/кф"],
        ["+ Зняття шпалер","+$1.60/кф"],
        ["+ Зняття старої фарби (точково)","+$1.20/кф"],
        ["+ Обробка поверхні від плісняви","+$2.00/кф"]
      ],
      pF3:[],
      paintProv:"Вся фарба, ґрунт та інструменти",
      paintN:"Виїзд для оцінки $75 → зараховується у вартість робіт. Матеріали — клієнт, без націнки.",
      flScope:"За кв.фут · Тільки робота",flDesc:"Виробіток: 120–250 кв.фут на день залежно від продукту.",
      flG1:[
        ["Ламінат замковий (click-lock)","$3.50/кф"],
        ["LVP / Розкішний вініловий ламінат","$3.75/кф"],
        ["Демонтаж старої підлоги","+$2.25/кф"],
        ["Укладання підкладки","+$0.75/кф"],
        ["Поріжок переходу","$55/шт."],
        ["Підрізання дверей","$55/двері"],
        ["Плінтус: зняти + встановити","$3.50/пф"],
        ["Точкове вирівнювання (за мішок)","$65/мішок"]
      ],
      flG2:[],
      flProv:"Матеріал покриття — окремо. Тільки робота.",
      flN:"Матеріал покриття, підкладка та поріжки — окремо. Вирівнювання — оцінка на місці."
    },

    /* PROOF CHIPS & CTA HIERARCHY */
    proofChip1:"Відповімо за 10–30 хв (8am–8pm)",
    proofChip2:"Прозорі ціни (тільки робота, без прихованих)",
    proofChip3:"Прибирання включено",

    /* HERO CTA */
    ctaPrimaryHero:"Отримати смету за 2 хвилини",
    ctaSubtitle:"Без спаму. Тільки про вашу заявку.",

    /* SERVICE CARD ADDITIONS */
    cardTimeLabel:"Типовий час:",
    kitchTime:"Залежить від площі",furnpTime:"2–4год за одиницю",
    tvTime:"1–2год",furTime:"1.5–4год",artTime:"1–2.5год",
    paintTime:"Залежить від площі",floorTime:"Залежить від площі",
    plumbTime:"1–3год",elecTime:"1–2.5год",

    kitchBenefit:"Професійне фарбування фасадів. Стійке покриття.",
    furnpBenefit:"Будь-які кольори. Оновлений вигляд.",
    tvBenefit:"Без безладу. Безпечне кріплення на стіну.",
    furBenefit:"Усі деталі включені. Повне збирання.",
    artBenefit:"Гарантія рівня. Надійне кріплення.",
    paintBenefit:"Професійна обробка. Без розливів.",
    floorBenefit:"Чисте встановлення. Сміття вивезено.",
    plumbBenefit:"Без протіканння. Якісна фурнітура.",
    elecBenefit:"Безпечна проводка. За кодексом.",

    tvBadge:"Найпопулярніший",paintBadge:"Можна в той же день",

    comboTitle:"Обери 2 послуги — зекономь 20%",
    comboSub:"Замов комбо — знижка одразу",

    /* SMS CAPTURE */
    smsCaptureTitle:"Отримати смету по СМС",
    smsPhonePlaceholder:"Ваш номер телефону",
    smsConsent:"Я згоден отримувати СМС про мою смету та спеціальні пропозиції",
    smsSendBtn:"Надішліть мені цю смету",
    smsSuccess:"Смета надіслана!",
    smsSuccessMsg:"Перевірте СМС через хвилину.",

    /* FORM UPDATES */
    formBtnNew:"Отримати смету за 2 хв",
    formSubNew:"Без спаму. Ми зв'яжемось тільки для підтвердження роботи."
  }
};

/* ═══════════════════════════════════════════════
   Static page i18n (sections outside calculator cards)
═══════════════════════════════════════════════ */
const UI_I18N={
  en:{
    seoTitle:'Handy & Friend | Los Angeles Handyman',
    seoDescription:'Handy & Friend — handyman services and home repair in Los Angeles. TV mounting, furniture assembly, painting, flooring, plumbing and electrical.',
    seoOgTitle:'Handy & Friend | Los Angeles Handyman',
    seoOgDescription:'Premium labor-only handyman. Same-week availability. Call or WhatsApp for a quote.',
    seoLocale:'en_US',
    langBtnTitle:'Change language',
    heroCallNow:'Call Now',
    heroWhatsApp:'WhatsApp',
    heroFullPricing:'💲 Full Pricing',
    barCall:'Call',
    barMessage:'Message',
    heroResponseNote:'⏰ We respond within 1 hour during business hours (8am-7pm PT)',
    urgencyChip:'⚡ Trusted by homeowners across Los Angeles',
    urgencyTitle:'🎯 Book Your Service Today',
    urgencySub:'100% Satisfaction Guarantee • Money-Back Guarantee if Not Happy • Insured • Same-Day Response',
    urgencyBtn:'✅ Book Your Service Now',
    whyTitle:'Why Choose Handy & Friend?',
    painLabel:'❌ Pain Point',
    promiseLabel:'✅ Our Promise',
    pain1Title:"Contractors don't show up",
    pain1Sub:"You're left hanging. Wasted time.",
    promise1Title:'100% Reliability',
    promise1Sub:'We show up on time. Guaranteed.',
    pain2Title:'Hidden fees surprise you',
    pain2Sub:'Final bill is 2x the quote.',
    promise2Title:'Upfront Transparent Pricing',
    promise2Sub:'No surprises. What you see is what you pay.',
    pain3Title:'Poor quality finish',
    pain3Sub:'Work looks sloppy. Frustrating.',
    promise3Title:'Professional Quality',
    promise3Sub:'Insured. Satisfaction guaranteed.',
    servicesTitle:'Services',
    serviceTv:'TV Mounting',
    serviceFurniture:'Furniture Assembly',
    serviceArt:'Art & Mirrors',
    servicePainting:'Painting',
    serviceFlooring:'Flooring',
    servicePlumbing:'Plumbing',
    serviceElectrical:'Electrical',
    stickyCall:'Call 213-361-1700',
    testimonialsTitle:'Trusted by LA Families',
    testimonialsSub:'Trusted by local customers across Los Angeles',
    review1:'"Amazing service! Fixed my TV mounting in 1 hour. Professional and quick. Highly recommend!"',
    review2:'"Best handyman in LA. Upfront pricing and clear scope from start to finish."',
    review3:'"Perfect furniture assembly! Professional, insured, and super reliable. Will call again!"',
    leadTitle:'Ready to Book Your Service?',
    leadSub:'Phone and chat quotes are free. On-site estimates: $75, credited toward your project when you book.',
    leadNamePlaceholder:'Your Name',
    leadEmailPlaceholder:'Your Email',
    leadPhonePlaceholder:'Phone Number (213-361-1700)',
    leadServiceDefault:'Select Service Needed',
    leadServiceTv:'📺 TV Mounting',
    leadServiceFurniture:'🛋️ Furniture Assembly',
    leadServicePainting:'🎨 Painting & Walls',
    leadServiceFlooring:'🏠 Flooring',
    leadServicePlumbing:'🚰 Plumbing',
    leadServiceElectrical:'⚡ Electrical',
    leadServiceMirrors:'🪞 Mirrors & Art Hanging',
    leadServiceOther:'✋ Other Service',
    leadProjectPlaceholder:'Brief description of your project...',
    leadFormBtn:'Get Your Quote in 2 Min',
    leadFormNote:'No spam. We only contact you to confirm the job.',
    formSuccessTitle:'Quote Request Received!',
    formSuccessSub:'We respond within 1 hour during business hours (8am-7pm PT).',
    formSuccessReviewBtn:'⭐ Leave a Google Review',
    formSuccessFbBtn:'👍 Recommend on Facebook',
    formSuccessReviewHint:'If everything looks great, a quick review helps us grow.',
    formSuccessEmail:'Check your email for confirmation details.',
    reviewCtaBtn:'⭐ Leave a Google Review',
    reviewCtaFbBtn:'👍 Recommend on Facebook',
    reviewCtaHint:'Your honest feedback helps local families choose trusted help faster.',
    faqTitle:'Common Questions',
    faqSub:'Everything you need to know',
    faqQ1:'How quickly can you respond to my service request?',
    faqA1:'We respond within 1 hour during business hours (8am-7pm PT). For urgent same-day service, call 213-361-1700 directly.',
    faqQ2:'Do you charge for estimates/quotes?',
    faqA2:'Phone and chat quotes are free. On-site estimates: $75, credited toward your project when you book.',
    faqQ3:'Are you insured?',
    faqA3:'We carry General Liability Insurance. Work terms and service limits are explained before booking.',
    faqQ4:"What if I'm not satisfied with the work?",
    faqA4:"100% satisfaction guarantee. If you're unhappy, we'll redo the work for free within 7 days. Your satisfaction is our priority.",
    faqQ5:'Do you offer weekend or after-hours service?',
    faqA5:'Yes! We offer flexible scheduling. Call 213-361-1700 to arrange weekend or evening appointments.',
    faqQ6:'What payment methods do you accept?',
    faqA6:'We accept cash, Venmo, PayPal, and all major credit cards. Payment is due upon completion of work.',
    finalCtaTitle:"Don't Wait-Book Your Handyman Today",
    finalCtaSub:'Professional service across Los Angeles with clear, upfront scope.',
    finalCtaWhatsApp:'💬 Message on WhatsApp',
    finalCtaCall:'📞 Call Now',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> provides home repair services up to $1,000 (labor only). Services include TV mounting, furniture assembly, painting, flooring, plumbing, electrical, and art hanging. For work exceeding $1,000, structural modifications, permits, or licensed requirements, consult a licensed contractor. We carry General Liability Insurance. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Call 213-361-1700</a></strong> for details.',
    copyDone:'✓ Copied!',
    smsPhoneRequired:'Please provide your phone number',
    smsConsentRequired:'Please agree to receive SMS',
    smsSendError:'Error sending SMS. Please try again.',
    smsNetworkError:'Network error. Please try again.',
    leadSubmitError:'Error submitting form. Please call 213-361-1700 directly.'
  },
  es:{
    seoTitle:'Handy & Friend | Handyman en Los Angeles',
    seoDescription:'Handy & Friend — servicios de handyman y reparaciones en Los Angeles. Montaje de TV, muebles, pintura, pisos, plomeria y electrico.',
    seoOgTitle:'Handy & Friend | Handyman en Los Angeles',
    seoOgDescription:'Servicio premium solo mano de obra. Disponibilidad esta semana. Llama o escribe por WhatsApp.',
    seoLocale:'es_ES',
    langBtnTitle:'Cambiar idioma',
    heroCallNow:'Llamar ahora',
    heroWhatsApp:'WhatsApp',
    heroFullPricing:'💲 Precios completos',
    barCall:'Llamar',
    barMessage:'Mensaje',
    heroResponseNote:'⏰ Respondemos en 1 hora durante horario laboral (8am-7pm PT)',
    urgencyChip:'⚡ Con la confianza de hogares en Los Angeles',
    urgencyTitle:'🎯 Reserva tu servicio hoy',
    urgencySub:'Garantia de satisfaccion 100% • Reembolso si no quedas conforme • Asegurado • Respuesta el mismo dia',
    urgencyBtn:'✅ Reserva tu lugar ahora',
    whyTitle:'Por que elegir Handy & Friend?',
    painLabel:'❌ Problema',
    promiseLabel:'✅ Nuestra promesa',
    pain1Title:'Los contratistas no llegan',
    pain1Sub:'Te dejan esperando. Tiempo perdido.',
    promise1Title:'100% confiabilidad',
    promise1Sub:'Llegamos a tiempo. Garantizado.',
    pain2Title:'Cargos ocultos sorpresa',
    pain2Sub:'La factura final sale al doble.',
    promise2Title:'Precios transparentes desde el inicio',
    promise2Sub:'Sin sorpresas. Pagas lo que ves.',
    pain3Title:'Acabado de mala calidad',
    pain3Sub:'Trabajo descuidado y frustrante.',
    promise3Title:'Calidad profesional',
    promise3Sub:'Asegurado. Satisfaccion garantizada.',
    servicesTitle:'Servicios',
    serviceTv:'Montaje de TV',
    serviceFurniture:'Ensamblaje de muebles',
    serviceArt:'Arte y espejos',
    servicePainting:'Pintura',
    serviceFlooring:'Pisos',
    servicePlumbing:'Plomeria',
    serviceElectrical:'Electrico',
    stickyCall:'Llamar 213-361-1700',
    testimonialsTitle:'Con la confianza de familias de LA',
    testimonialsSub:'Con la confianza de clientes locales en Los Angeles',
    review1:'"Servicio increible. Montaron mi TV en 1 hora. Profesional y rapido. Super recomendado."',
    review2:'"El mejor handyman en LA. Precio claro y sin sorpresas. Me devolvieron la llamada en 10 minutos."',
    review3:'"Armado de muebles perfecto. Profesional, asegurado y muy confiable. Llamare de nuevo."',
    leadTitle:'Listo para reservar tu servicio?',
    leadSub:'Las cotizaciones por telefono y chat son gratis. Estimado en sitio: $75, acreditado al contratar.',
    leadNamePlaceholder:'Tu nombre',
    leadEmailPlaceholder:'Tu correo',
    leadPhonePlaceholder:'Numero de telefono (213-361-1700)',
    leadServiceDefault:'Selecciona el servicio',
    leadServiceTv:'📺 Montaje de TV',
    leadServiceFurniture:'🛋️ Ensamblaje de muebles',
    leadServicePainting:'🎨 Pintura y paredes',
    leadServiceFlooring:'🏠 Pisos',
    leadServicePlumbing:'🚰 Plomeria',
    leadServiceElectrical:'⚡ Electrico',
    leadServiceMirrors:'🪞 Espejos y cuadros',
    leadServiceOther:'✋ Otro servicio',
    leadProjectPlaceholder:'Breve descripcion de tu proyecto...',
    leadFormBtn:'Obtén tu cotizacion en 2 min',
    leadFormNote:'Sin spam. Solo te contactamos para confirmar el trabajo.',
    formSuccessTitle:'Solicitud de cotizacion recibida',
    formSuccessSub:'Respondemos en 1 hora durante horario laboral (8am-7pm PT).',
    formSuccessReviewBtn:'⭐ Dejar reseña en Google',
    formSuccessFbBtn:'👍 Recomendar en Facebook',
    formSuccessReviewHint:'Si todo salio bien, una reseña rapida nos ayuda a crecer.',
    formSuccessEmail:'Revisa tu correo para los detalles de confirmacion.',
    reviewCtaBtn:'⭐ Dejar reseña en Google',
    reviewCtaFbBtn:'👍 Recomendar en Facebook',
    reviewCtaHint:'Tu opinion honesta ayuda a otras familias de LA a elegir un servicio confiable.',
    faqTitle:'Preguntas frecuentes',
    faqSub:'Todo lo que necesitas saber',
    faqQ1:'Que tan rapido responden a mi solicitud?',
    faqA1:'Respondemos en 1 hora durante horario laboral (8am-7pm PT). Para servicio urgente el mismo dia, llama al 213-361-1700.',
    faqQ2:'Cobran por estimados o cotizaciones?',
    faqA2:'Las cotizaciones por telefono y chat son gratis. Estimado en sitio: $75, acreditado al contratar.',
    faqQ3:'Estan asegurados?',
    faqA3:'Si. Tenemos Seguro de Responsabilidad General. Todo trabajo esta garantizado.',
    faqQ4:'Que pasa si no quedo satisfecho?',
    faqA4:'Garantia de satisfaccion 100%. Si no quedas conforme, rehacemos el trabajo gratis dentro de 7 dias.',
    faqQ5:'Ofrecen servicio en fin de semana o fuera de horario?',
    faqA5:'Si. Ofrecemos horarios flexibles. Llama al 213-361-1700 para coordinar.',
    faqQ6:'Que metodos de pago aceptan?',
    faqA6:'Aceptamos efectivo, Venmo, PayPal y tarjetas principales. El pago se realiza al finalizar.',
    finalCtaTitle:'No esperes-Reserva tu handyman hoy',
    finalCtaSub:'Servicio profesional en Los Angeles con alcance y precio claros.',
    finalCtaWhatsApp:'💬 Escribir por WhatsApp',
    finalCtaCall:'📞 Llamar ahora',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> ofrece servicios de reparacion del hogar hasta $1,000 (solo mano de obra). Incluye montaje de TV, ensamblaje de muebles, pintura, pisos, plomeria, electrico y colgado de arte. Para trabajos mayores a $1,000, modificaciones estructurales, permisos o requisitos de licencia, consulta a un contratista con licencia. Tenemos seguro de responsabilidad civil. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Llama al 213-361-1700</a></strong> para mas detalles.',
    copyDone:'✓ Copiado',
    smsPhoneRequired:'Ingresa tu numero de telefono',
    smsConsentRequired:'Debes aceptar recibir SMS',
    smsSendError:'Error al enviar SMS. Intentalo de nuevo.',
    smsNetworkError:'Error de red. Intentalo de nuevo.',
    leadSubmitError:'Error al enviar el formulario. Llama al 213-361-1700.'
  },
  ru:{
    seoTitle:'Handy & Friend | Мастер в Лос-Анджелесе',
    seoDescription:'Handy & Friend — услуги мастера и ремонт дома в Лос-Анджелесе. Монтаж ТВ, сборка мебели, покраска, полы, сантехника и электрика.',
    seoOgTitle:'Handy & Friend | Мастер в Лос-Анджелесе',
    seoOgDescription:'Премиальный сервис только за работу. Доступно на этой неделе. Позвоните или напишите в WhatsApp.',
    seoLocale:'ru_RU',
    langBtnTitle:'Сменить язык',
    heroCallNow:'Позвонить',
    heroWhatsApp:'WhatsApp',
    heroFullPricing:'💲 Полный прайс',
    barCall:'Звонок',
    barMessage:'Сообщение',
    heroResponseNote:'⏰ Отвечаем в течение 1 часа в рабочие часы (8am-7pm PT)',
    urgencyChip:'⚡ Нам доверяют клиенты по всему Лос-Анджелесу',
    urgencyTitle:'🎯 Забронируйте услугу сегодня',
    urgencySub:'100% гарантия удовлетворенности • Вернем деньги, если не довольны • Застрахованы • Ответ в тот же день',
    urgencyBtn:'✅ Забронировать сейчас',
    whyTitle:'Почему выбирают Handy & Friend?',
    painLabel:'❌ Проблема',
    promiseLabel:'✅ Наше обещание',
    pain1Title:'Подрядчики не приезжают',
    pain1Sub:'Вы теряете время в ожидании.',
    promise1Title:'100% надежность',
    promise1Sub:'Приезжаем вовремя. Гарантированно.',
    pain2Title:'Скрытые доплаты',
    pain2Sub:'Итоговый счет в 2 раза выше.',
    promise2Title:'Прозрачная цена заранее',
    promise2Sub:'Без сюрпризов. Платите то, что видите.',
    pain3Title:'Плохое качество',
    pain3Sub:'Небрежная работа и разочарование.',
    promise3Title:'Профессиональное качество',
    promise3Sub:'Страховка, гарантия результата.',
    servicesTitle:'Услуги',
    serviceTv:'Монтаж ТВ',
    serviceFurniture:'Сборка мебели',
    serviceArt:'Картины и зеркала',
    servicePainting:'Покраска',
    serviceFlooring:'Полы',
    servicePlumbing:'Сантехника',
    serviceElectrical:'Электрика',
    stickyCall:'Позвонить 213-361-1700',
    testimonialsTitle:'Нам доверяют семьи Лос-Анджелеса',
    testimonialsSub:'Нам доверяют местные клиенты в Лос-Анджелесе',
    review1:'"Отличный сервис! Смонтировали ТВ за 1 час. Профессионально и быстро."',
    review2:'"Лучший мастер в ЛА. Прозрачные цены без сюрпризов. Перезвонили за 10 минут."',
    review3:'"Идеальная сборка мебели! Профессионально, застрахованы, очень надежно. Обращусь снова."',
    leadTitle:'Готовы забронировать услугу?',
    leadSub:'Оценка по телефону и в чате бесплатна. Выездная смета: $75, сумма засчитывается при заказе.',
    leadNamePlaceholder:'Ваше имя',
    leadEmailPlaceholder:'Ваш email',
    leadPhonePlaceholder:'Телефон (213-361-1700)',
    leadServiceDefault:'Выберите нужную услугу',
    leadServiceTv:'📺 Монтаж ТВ',
    leadServiceFurniture:'🛋️ Сборка мебели',
    leadServicePainting:'🎨 Покраска и стены',
    leadServiceFlooring:'🏠 Полы',
    leadServicePlumbing:'🚰 Сантехника',
    leadServiceElectrical:'⚡ Электрика',
    leadServiceMirrors:'🪞 Зеркала и картины',
    leadServiceOther:'✋ Другая услуга',
    leadProjectPlaceholder:'Кратко опишите ваш проект...',
    leadFormBtn:'Получить смету за 2 мин',
    leadFormNote:'Без спама. Свяжемся только для подтверждения заказа.',
    formSuccessTitle:'Заявка на смету получена',
    formSuccessSub:'Отвечаем в течение 1 часа в рабочие часы (8am-7pm PT).',
    formSuccessReviewBtn:'⭐ Оставить отзыв в Google',
    formSuccessFbBtn:'👍 Рекомендовать в Facebook',
    formSuccessReviewHint:'Если всё понравилось, короткий отзыв очень поможет нам расти.',
    formSuccessEmail:'Проверьте email для деталей подтверждения.',
    reviewCtaBtn:'⭐ Оставить отзыв в Google',
    reviewCtaFbBtn:'👍 Рекомендовать в Facebook',
    reviewCtaHint:'Ваш честный отзыв помогает другим семьям в LA выбрать надёжного мастера.',
    faqTitle:'Частые вопросы',
    faqSub:'Все, что важно знать',
    faqQ1:'Как быстро вы отвечаете на запрос?',
    faqA1:'Отвечаем в течение 1 часа в рабочие часы (8am-7pm PT). Для срочных задач звоните 213-361-1700.',
    faqQ2:'Вы берете плату за смету?',
    faqA2:'Нет. Все сметы бесплатные. Прозрачные цены без скрытых платежей.',
    faqQ3:'У вас есть страховка?',
    faqA3:'Да. У нас есть страхование общей ответственности. На все работы действует гарантия.',
    faqQ4:'Что если я недоволен работой?',
    faqA4:'100% гарантия удовлетворенности. Если не устроит, переделаем бесплатно в течение 7 дней.',
    faqQ5:'Работаете по выходным и вечером?',
    faqA5:'Да. Предлагаем гибкий график. Позвоните по номеру 213-361-1700.',
    faqQ6:'Какие способы оплаты принимаете?',
    faqA6:'Принимаем наличные, Venmo, PayPal и основные банковские карты.',
    finalCtaTitle:'Не откладывайте-забронируйте мастера сегодня',
    finalCtaSub:'Профессиональный сервис по Лос-Анджелесу с понятным объёмом работ и ценой.',
    finalCtaWhatsApp:'💬 Написать в WhatsApp',
    finalCtaCall:'📞 Позвонить',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> выполняет домашние ремонты до $1,000 (только работа). Включая монтаж ТВ, сборку мебели, покраску, полы, сантехнику, электрику и навес картин. Для работ свыше $1,000, конструктивных изменений, разрешений или лицензируемых задач обратитесь к лицензированному подрядчику. У нас есть страхование ответственности. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Позвоните 213-361-1700</a></strong> для деталей.',
    copyDone:'✓ Скопировано',
    smsPhoneRequired:'Введите номер телефона',
    smsConsentRequired:'Нужно согласиться на получение SMS',
    smsSendError:'Ошибка отправки SMS. Попробуйте снова.',
    smsNetworkError:'Сетевая ошибка. Попробуйте снова.',
    leadSubmitError:'Ошибка отправки формы. Позвоните 213-361-1700.'
  },
  ua:{
    seoTitle:'Handy & Friend | Майстер у Лос-Анджелесі',
    seoDescription:'Handy & Friend — послуги майстра та домашній ремонт у Лос-Анджелесі. Монтаж ТВ, збирання меблів, фарбування, підлога, сантехніка та електрика.',
    seoOgTitle:'Handy & Friend | Майстер у Лос-Анджелесі',
    seoOgDescription:'Преміальний сервіс лише за роботу. Доступно цього тижня. Телефонуйте або пишіть у WhatsApp.',
    seoLocale:'uk_UA',
    langBtnTitle:'Змінити мову',
    heroCallNow:'Подзвонити',
    heroWhatsApp:'WhatsApp',
    heroFullPricing:'💲 Повний прайс',
    barCall:'Дзвінок',
    barMessage:'Повідомлення',
    heroResponseNote:'⏰ Відповідаємо протягом 1 години в робочий час (8am-7pm PT)',
    urgencyChip:'⚡ Нам довіряють клієнти по всьому Лос-Анджелесу',
    urgencyTitle:'🎯 Забронюйте послугу сьогодні',
    urgencySub:'100% гарантія задоволення • Повернення коштів, якщо не задоволені • Застраховані • Відповідь того ж дня',
    urgencyBtn:'✅ Забронювати зараз',
    whyTitle:'Чому обирають Handy & Friend?',
    painLabel:'❌ Проблема',
    promiseLabel:'✅ Наша обіцянка',
    pain1Title:'Підрядники не приїжджають',
    pain1Sub:'Ви марнуєте час в очікуванні.',
    promise1Title:'100% надійність',
    promise1Sub:'Приїжджаємо вчасно. Гарантовано.',
    pain2Title:'Приховані доплати',
    pain2Sub:'Фінальний рахунок у 2 рази вищий.',
    promise2Title:'Прозора ціна наперед',
    promise2Sub:'Без сюрпризів. Ви платите те, що бачите.',
    pain3Title:'Низька якість',
    pain3Sub:'Неакуратна робота і розчарування.',
    promise3Title:'Професійна якість',
    promise3Sub:'Страховка та гарантія результату.',
    servicesTitle:'Послуги',
    serviceTv:'Монтаж ТВ',
    serviceFurniture:'Збирання меблів',
    serviceArt:'Картини та дзеркала',
    servicePainting:'Фарбування',
    serviceFlooring:'Підлога',
    servicePlumbing:'Сантехніка',
    serviceElectrical:'Електрика',
    stickyCall:'Подзвонити 213-361-1700',
    testimonialsTitle:'Нам довіряють родини Лос-Анджелеса',
    testimonialsSub:'Нам довіряють місцеві клієнти в Лос-Анджелесі',
    review1:'"Чудовий сервіс! ТВ змонтували за 1 годину. Професійно і швидко."',
    review2:'"Найкращий handyman у ЛА. Прозора ціна без сюрпризів. Передзвонили за 10 хвилин."',
    review3:'"Ідеальне збирання меблів! Професійно, застраховані, дуже надійно. Звернусь ще."',
    leadTitle:'Готові забронювати послугу?',
    leadSub:'Оцінка телефоном і в чаті безкоштовна. Виїзний кошторис: $75, зараховується при замовленні.',
    leadNamePlaceholder:'Ваше ім’я',
    leadEmailPlaceholder:'Ваш email',
    leadPhonePlaceholder:'Телефон (213-361-1700)',
    leadServiceDefault:'Оберіть потрібну послугу',
    leadServiceTv:'📺 Монтаж ТВ',
    leadServiceFurniture:'🛋️ Збирання меблів',
    leadServicePainting:'🎨 Фарбування і стіни',
    leadServiceFlooring:'🏠 Підлога',
    leadServicePlumbing:'🚰 Сантехніка',
    leadServiceElectrical:'⚡ Електрика',
    leadServiceMirrors:'🪞 Дзеркала та картини',
    leadServiceOther:'✋ Інша послуга',
    leadProjectPlaceholder:'Коротко опишіть ваш проєкт...',
    leadFormBtn:'Отримати кошторис за 2 хв',
    leadFormNote:'Без спаму. Зв’яжемось лише для підтвердження замовлення.',
    formSuccessTitle:'Запит на кошторис отримано',
    formSuccessSub:'Відповідаємо протягом 1 години в робочий час (8am-7pm PT).',
    formSuccessReviewBtn:'⭐ Залишити відгук у Google',
    formSuccessFbBtn:'👍 Рекомендувати у Facebook',
    formSuccessReviewHint:'Якщо все сподобалось, короткий відгук дуже допоможе нам зростати.',
    formSuccessEmail:'Перевірте email для деталей підтвердження.',
    reviewCtaBtn:'⭐ Залишити відгук у Google',
    reviewCtaFbBtn:'👍 Рекомендувати у Facebook',
    reviewCtaHint:'Ваш чесний відгук допомагає іншим сім’ям у LA швидше обрати надійного майстра.',
    faqTitle:'Поширені запитання',
    faqSub:'Усе, що потрібно знати',
    faqQ1:'Як швидко ви відповідаєте на запит?',
    faqA1:'Відповідаємо протягом 1 години в робочий час (8am-7pm PT). Для термінових робіт телефонуйте 213-361-1700.',
    faqQ2:'Чи берете оплату за кошторис?',
    faqA2:'Ні. Усі кошториси безкоштовні. Прозорі ціни без прихованих платежів.',
    faqQ3:'Чи маєте страховку?',
    faqA3:'Так. Ми маємо страхування загальної відповідальності. На всі роботи діє гарантія.',
    faqQ4:'Що як я не задоволений роботою?',
    faqA4:'100% гарантія задоволення. Якщо не влаштує, переробимо безкоштовно протягом 7 днів.',
    faqQ5:'Чи працюєте у вихідні та ввечері?',
    faqA5:'Так. Пропонуємо гнучкий графік. Телефонуйте 213-361-1700.',
    faqQ6:'Які способи оплати приймаєте?',
    faqA6:'Приймаємо готівку, Venmo, PayPal і основні банківські картки.',
    finalCtaTitle:'Не зволікайте-бронюйте майстра сьогодні',
    finalCtaSub:'Професійний сервіс у Лос-Анджелесі з прозорим обсягом робіт і ціною.',
    finalCtaWhatsApp:'💬 Написати у WhatsApp',
    finalCtaCall:'📞 Подзвонити',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> виконує домашні ремонти до $1,000 (лише робота). Послуги включають монтаж ТВ, збирання меблів, фарбування, підлогу, сантехніку, електрику та навішування картин. Для робіт понад $1,000, конструктивних змін, дозволів або ліцензованих вимог звертайтесь до ліцензованого підрядника. Маємо страхування цивільної відповідальності. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Телефонуйте 213-361-1700</a></strong> для деталей.',
    copyDone:'✓ Скопійовано',
    smsPhoneRequired:'Вкажіть номер телефону',
    smsConsentRequired:'Потрібно погодитись на SMS',
    smsSendError:'Помилка надсилання SMS. Спробуйте ще раз.',
    smsNetworkError:'Мережева помилка. Спробуйте ще раз.',
    leadSubmitError:'Помилка відправки форми. Зателефонуйте 213-361-1700.'
  }
};

/* ═══════════════════════════════════════════════
   RUNTIME
═══════════════════════════════════════════════ */

/* ─── GA4 Universal Tracker ─── */
function track(name, params={}) {
  try { if(typeof gtag==='function') gtag('event', name, params); } catch(e){}
}
const LANG_ORDER=['en','es','ru','ua'];
const LANG_ALIASES={uk:'ua',ua:'ua',ru:'ru',es:'es',en:'en'};

function normalizeLang(raw){
  if(!raw)return 'en';
  const base=String(raw).toLowerCase().split(/[-_]/)[0];
  return LANG_ALIASES[base]||'en';
}

function browserPreferredLang(){
  const nav=[...(navigator.languages||[]),navigator.language].filter(Boolean);
  for(const item of nav){
    const n=normalizeLang(item);
    if(LANG_ORDER.includes(n))return n;
  }
  return 'en';
}

function readLangFromUrl(){
  try{
    const url=new URL(window.location.href);
    const q=url.searchParams.get('lang');
    return q?normalizeLang(q):'';
  }catch(e){
    return '';
  }
}

function bootstrapLang(){
  const urlLang=readLangFromUrl();
  if(urlLang){
    localStorage.setItem('hf_lang',urlLang);
    return urlLang;
  }
  // Always English unless user explicitly chose a language via URL
  return 'en';
}

let lang=bootstrapLang();
let calcMode='room';
function L(){return T[lang]||T.en}
function U(){return UI_I18N[lang]||UI_I18N.en}
window.HF_UI=()=>U();
let lastEst=null;

/* ─── SMS CAPTURE HANDLER ─── */
function handleSmsCapture(e) {
  if(e)e.preventDefault();

  const phone = document.getElementById('smsPhone').value;
  const consent = document.getElementById('smsMktConsent').checked;
  const l = L();
  const ui = U();

  if (!phone) {
    alert(ui.smsPhoneRequired);
    return;
  }

  if (!consent) {
    alert(ui.smsConsentRequired);
    return;
  }

  // Get current estimate from calculator
  const calcResAmt = document.getElementById('resAmt')?.innerText || 'N/A';

  // Send SMS via backend API
  fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phone,
      estimate: calcResAmt,
      timestamp: new Date().toISOString(),
      consent: true
    })
  })
  .then(response => {
    if (response.ok) {
      // Show success message
      const successHtml = `
        <div style="text-align:center;padding:20px;color:#3a3a3a">
          <div style="font-size:32px;margin-bottom:8px">✅</div>
          <p style="font-weight:700">${l.smsSuccess}</p>
          <p style="font-size:13px;color:#666">${l.smsSuccessMsg}</p>
        </div>
      `;
      document.getElementById('smsCaptureMini').innerHTML = successHtml;

      // Track in GA4
      if (typeof gtag !== 'undefined') {
        gtag('event', 'sms_lead_generated', {
          estimate: calcResAmt
        });
      }
    } else {
      alert(ui.smsSendError);
    }
  })
  .catch(err => {
    console.error('SMS error:', err);
    alert(ui.smsNetworkError);
  });
}

function applyStaticI18n(){
  const ui=U();
  const l=L();

  document.querySelectorAll('[data-i18n]').forEach((el)=>{
    const key=el.getAttribute('data-i18n');
    const val=ui[key]??l[key];
    if(typeof val==='string')el.textContent=val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el)=>{
    const key=el.getAttribute('data-i18n-placeholder');
    const val=ui[key]??l[key];
    if(typeof val==='string')el.setAttribute('placeholder',val);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el)=>{
    const key=el.getAttribute('data-i18n-title');
    const val=ui[key]??l[key];
    if(typeof val==='string')el.setAttribute('title',val);
  });

  const legal=document.getElementById('legalDisclaimerTxt');
  if(legal&&ui.legalDisclaimerHtml){
    legal.innerHTML=ui.legalDisclaimerHtml;
  }
}

function syncLangInUrl(){
  try{
    const url=new URL(window.location.href);
    url.searchParams.set('lang',lang);
    history.replaceState({},'',url.toString());
  }catch(e){}
}

function updatePricingLinks(){
  // Update pricing links to include language parameter
  const pricingLinks = document.querySelectorAll('a[href="/pricing"]');
  pricingLinks.forEach(link => {
    link.href = `/pricing?lang=${lang}`;
  });
}

function applySeoMetadata(){
  const ui=U();
  const title=ui.seoTitle||'Handy & Friend | Los Angeles Handyman';
  const desc=ui.seoDescription||'Premium handyman services in Los Angeles.';
  const ogTitle=ui.seoOgTitle||title;
  const ogDesc=ui.seoOgDescription||desc;
  const ogLocale=ui.seoLocale||'en_US';

  document.title=title;

  const metaDesc=document.getElementById('metaDesc')||document.querySelector('meta[name="description"]');
  if(metaDesc)metaDesc.setAttribute('content',desc);

  const ogTitleEl=document.getElementById('ogTitle')||document.querySelector('meta[property="og:title"]');
  if(ogTitleEl)ogTitleEl.setAttribute('content',ogTitle);

  const ogDescEl=document.getElementById('ogDesc')||document.querySelector('meta[property="og:description"]');
  if(ogDescEl)ogDescEl.setAttribute('content',ogDesc);

  const twTitleEl=document.getElementById('twTitle')||document.querySelector('meta[name="twitter:title"]');
  if(twTitleEl)twTitleEl.setAttribute('content',ogTitle);

  const twDescEl=document.getElementById('twDesc')||document.querySelector('meta[name="twitter:description"]');
  if(twDescEl)twDescEl.setAttribute('content',ogDesc);

  const ogLocaleEl=document.getElementById('ogLocale')||document.querySelector('meta[property="og:locale"]');
  if(ogLocaleEl)ogLocaleEl.setAttribute('content',ogLocale);
}

function applyLang(){
  localStorage.setItem('hf_lang',lang);
  document.documentElement.lang=lang==='ua'?'uk':lang; // SEO: update <html lang>
  const l=L();
  // Show current lang · show next lang hint
  const nextL=T[LANG_ORDER[(LANG_ORDER.indexOf(lang)+1)%LANG_ORDER.length]].lang;
  document.getElementById('langTxt').textContent=l.lang;
  document.getElementById('langNext').textContent=`→ ${nextL}`;
  const heroOfferTitleEl=document.getElementById('heroOfferTitle');
  if(heroOfferTitleEl) heroOfferTitleEl.textContent=l.heroOfferTitle||'Professional Cabinet Painting From $155 Per Door';
  const heroOfferSubEl=document.getElementById('heroOfferSub');
  if(heroOfferSubEl) {
    heroOfferSubEl.innerHTML=l.heroOfferSubHtml||'<span class="hero-included-accent">Premium paint, primer, degreasing, and prep are included in the price</span><br>A smooth spray finish that costs less than replacement';
  }
  const heroSubEl=document.getElementById('heroSub');
  if(heroSubEl)heroSubEl.textContent=l.heroSub;
  document.getElementById('gridLbl').textContent=l.gridLbl;
  document.getElementById('calcTitle').textContent=l.calcTitle;
  document.getElementById('calcSub').textContent=l.calcSub;
  document.getElementById('lSvc').textContent=l.lSvc;
  document.getElementById('lLen').textContent=l.lLen;
  document.getElementById('lWid').textContent=l.lWid;
  document.getElementById('lBase').textContent=l.lBase;
  document.getElementById('lHrs').textContent=l.lHrs;
  document.getElementById('modeRoom').textContent=l.lModeRoom;
  document.getElementById('modeTotal').textContent=l.lModeTotal;
  document.getElementById('lSf').textContent=l.lSfTotal;
  const bwaEl=document.querySelector('.bar .bwa');
  if(bwaEl)bwaEl.href='https://wa.me/12133611700?text='+encodeURIComponent(l.waGreet);
  const calcAnchorEl=document.getElementById('calcAnchorTxt');
  if(calcAnchorEl)calcAnchorEl.textContent=l.anchorBtn;
  document.getElementById('lTrans').textContent=l.lTrans;
  document.getElementById('lDoorU').textContent=l.lDoorU;
  document.getElementById('calcBtn').textContent=l.calcBtn;
  document.getElementById('resLbl').textContent=l.resLbl;
  document.getElementById('resSub').textContent=l.resSub;
  document.getElementById('resWaTxt').textContent=l.waBtn;
  document.getElementById('resCopyTxt').textContent=l.copyBtn;
  // update min badge if result visible
  if(lastEst&&document.getElementById('resMin').style.display!=='none'){
    document.getElementById('resMinTxt').textContent=
      l.minApplied+' (min $'+(lastEst.min||500)+')';
  }
  document.getElementById('baseBanner').innerHTML=
    l.base.map(s=>`<div class="bp"><strong>·</strong> ${s}</div>`).join('');
  const sel=document.getElementById('svcSel'),cv=sel.value;
  sel.innerHTML=l.opts.map(o=>`<option value="${o.v}">${o.l}</option>`).join('');
  if(cv)sel.value=cv;

  /* NEW: SMS Capture translations */
  const smsTitleEl=document.getElementById('smsCaptureTitle');
  if(smsTitleEl)smsTitleEl.textContent=l.smsCaptureTitle;
  const smsPhoneEl=document.getElementById('smsPhone');
  if(smsPhoneEl)smsPhoneEl.placeholder=l.smsPhonePlaceholder;
  const smsConsentEl=document.getElementById('smsConsent');
  if(smsConsentEl)smsConsentEl.textContent=l.smsConsent;
  const smsBtn=document.getElementById('smsSendBtn');
  if(smsBtn)smsBtn.textContent=l.smsSendBtn;

  syncLangInUrl();
  updatePricingLinks();
  applySeoMetadata();
  applyStaticI18n();
  renderGrid();
  renderCalculatorUI();
  updateArea();
}

/* ─── SERVICE CARD DETAILS MAPPING ─── */
const serviceDetails = {
  kitch: {
    time: 'kitchTime',
    benefit: 'kitchBenefit',
    badge: null
  },
  furnp: {
    time: 'furnpTime',
    benefit: 'furnpBenefit',
    badge: null
  },
  paint: {
    time: 'paintTime',
    benefit: 'paintBenefit',
    badge: 'paintBadge'
  },
  floor: {
    time: 'floorTime',
    benefit: 'floorBenefit',
    badge: null
  },
  fur: {
    time: 'furTime',
    benefit: 'furBenefit',
    badge: null
  },
  plumb: {
    time: 'plumbTime',
    benefit: 'plumbBenefit',
    badge: null
  },
  elec: {
    time: 'elecTime',
    benefit: 'elecBenefit',
    badge: null
  },
  tv: {
    time: 'tvTime',
    benefit: 'tvBenefit',
    badge: 'tvBadge'
  },
  art: {
    time: 'artTime',
    benefit: 'artBenefit',
    badge: null
  }
};

function renderGrid(){
  const g=document.getElementById('servGrid');
  // Detach calcBox before clearing so innerHTML='' doesn't destroy it
  const calcBox=document.getElementById('calcBox');
  if(calcBox&&calcBox.parentNode===g) g.before(calcBox);
  g.innerHTML='';
  const l = L();
  // Services with modal calculator
  const calcServices = ['kitch', 'furnp', 'paint', 'floor'];
  l.svcs.forEach(svc=>{
    const card=document.createElement('div');
    card.className='scard';
    card.dataset.id = svc.id;
    // Add calc modal trigger for specific services
    if(calcServices.includes(svc.id)){
      card.setAttribute('data-svc-calc', svc.id);
      card.style.cursor='pointer';
    }
    const phHTML=`<div class="sph"><img src="${SVC_IMG[svc.id]||''}" alt="${svc.name}" loading="lazy" width="320" height="190" decoding="async"></div>`;

    // Get service details (time, benefit, badge)
    const detail = serviceDetails[svc.id];
    const timeText = detail && detail.time ? l[detail.time] : '';
    const benefitText = detail && detail.benefit ? l[detail.benefit] : '';
    const badgeKey = detail && detail.badge ? detail.badge : null;
    const badgeText = badgeKey ? l[badgeKey] : '';

    // Build card content with strict hierarchy
    const chevSVG = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 3.5L4.5 6L7 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const timeRow = timeText
      ? `<div class="card-divider"></div><div class="card-time-row"><div class="card-time"><strong>${l.cardTimeLabel}</strong> ${timeText}</div><div class="schev">${chevSVG}</div></div>`
      : `<div class="schev schev-alone">${chevSVG}</div>`;

    const benefitRow = benefitText ? `<div class="card-benefit">${benefitText}</div>` : '';
    const badgeRow   = badgeText   ? `<div class="card-badge">${badgeText}</div>`    : '';

    card.innerHTML=`${phHTML}
      <div class="scb">
        <div class="scbd">
          <div class="scn">${svc.name}</div>
          <div class="scp"><b>${svc.from}</b></div>
          ${timeRow}
          ${benefitRow}
          ${badgeRow}
        </div>
      </div>
      <div class="drawer" id="dr_${svc.id}">
        <div class="dri" id="dri_${svc.id}"></div>
      </div>`;
    card.addEventListener('click',(e)=>{
      // prevent clicks inside the open drawer from re-triggering toggle
      if(e.target.closest('.drawer'))return;
      // prevent lightbox from opening on service card clicks
      if(e.target.closest('.sph')) e.stopPropagation();
      // Update calculator selection without scrolling
      const sel = document.getElementById('svcSel');
      if(sel){
        sel.value = svc.id;
        sel.dispatchEvent(new Event('change',{bubbles:true}));
      }
      toggle(svc.id);
    });
    g.appendChild(card);
    buildDrawer(svc.id);
  });

  // --- Combo promos ---
  document.querySelectorAll('.scard').forEach(card => {
    const id = card.dataset.id;
    if (!id || !COMBO_PAIRS[id]) return;
    const p = COMBO_PAIRS[id];
    const div = document.createElement('div');
    div.className = 'cpromo';
    div.innerHTML =
      '<span class="cpromo-tag">COMBO</span>' +
      '<span class="cpromo-pair">' + p.label + '</span>' +
      '<span class="cpromo-save">Save $' + p.save + '</span>';
    card.appendChild(div);
  });
  // Calculator card — 10th cell in the grid
  const calcBox2=document.getElementById('calcBox');
  if(calcBox2) g.appendChild(calcBox2);
}

function buildDrawer(id){
  const el=document.getElementById('dri_'+id);
  if(!el)return;
  const l=L(),d=l.dr;
  // ── Заголовки колонок ──
  const lmap={en:['Service','Price','Time'],es:['Servicio','Precio','Tiempo'],ru:['Услуга','Цена','Время'],ua:['Послуга','Ціна','Час']};
  const lh=lmap[lang]||lmap.en;
  // ── Row renderer: [label, price, time?] — разделяем name / subtitle по ' — ' ──
  const R=(arr,addon)=>arr.map(([a,b,t])=>{
    const di=a.indexOf(' — ');
    const nm=di>0?a.slice(0,di):a;
    const sb=di>0?a.slice(di+3):'';
    return `<div class="drow${addon?' addon':''}">
      <div class="dlw"><span class="dl">${nm}</span>${sb?`<span class="dlsub">${sb}</span>`:''}</div>
      <div class="drr"><span class="dr">${b}</span>${t?`<span class="dt">${t}</span>`:''}</div>
    </div>`;
  }).join('');
  // ── Секция-разделитель ──
  const S=t=>`<div class="dsect">${t}</div>`;
  // ── Заголовок колонок ──
  const TH=`<div class="dthead"><span>${lh[0]}</span><span>${lh[1]}</span><span>${lh[2]}</span></div>`;
  // ── Нотатка ──
  const N=t=>`<div class="dnote">ℹ️ ${t}</div>`;
  // ── Scope header ──
  const H=(scope,desc)=>`<div class="dhead"><span class="dscope">${scope}</span><span class="dclaim">${desc}</span></div>${TH}`;
  // ── Что предоставляет клиент ──
  const C=(label,items)=>`<div class="dprov">📦 <div><strong>${label}:</strong> ${items}</div></div>`;
  let h='';
  if(id==='kitch'){
    h=H(d.kitchScope,d.kitchDesc)+R(d.kitch)+C(d.prov,d.kitchProv)+N(d.kitchN);
  }
  if(id==='furnp'){
    h=H(d.furnpScope,d.furnpDesc)+R(d.furnp)+C(d.prov,d.furnpProv)+N(d.furnpN);
  }
  if(id==='tv'){
    h=H(d.tvScope,d.tvDesc)+R(d.tv)+C(d.prov,d.tvProv)+N(d.tvN);
  }
  if(id==='fur'){
    h=H(d.furScope,d.furDesc)+R(d.fur)+C(d.prov,d.furProv)+N(d.furN);
  }
  if(id==='art'){
    h=H(d.artScope,d.artDesc)+R(d.art)+C(d.prov,d.artProv)+N(d.artN);
  }
  if(id==='plumb'){
    h=H(d.plumbScope,d.plumbDesc)+R(d.plumb)+C(d.prov,d.plumbProv)+N(d.plumbN);
  }
  if(id==='elec'){
    h=H(d.elecScope,d.elecDesc)+R(d.elec)+C(d.prov,d.elecProv)+N(d.elecN);
  }
  if(id==='paint'){
    h=H(d.paintScope,d.paintDesc)
      +S(l.sF1)+R(d.pF1)
      +S(l.sF2)+R(d.pF2,true)
      +S(l.sF3)+R(d.pF3)
      +C(d.prov,d.paintProv)+N(d.paintN);
  }
  if(id==='floor'){
    h=H(d.flScope,d.flDesc)
      +S(l.sG1)+R(d.flG1)
      +S(l.sG2)+R(d.flG2,true)
      +C(d.prov,d.flProv)+N(d.flN);
  }
  el.innerHTML=h;
}

let _toggling=false;
function toggle(id){
  if(_toggling)return;
  _toggling=true;setTimeout(()=>{_toggling=false;},360);
  const dr=document.getElementById('dr_'+id);
  const open=dr.style.maxHeight&&dr.style.maxHeight!=='0px';
  document.querySelectorAll('.drawer').forEach(d=>{d.style.maxHeight='0px';});
  document.querySelectorAll('.scard').forEach(c=>c.classList.remove('open'));
  if(!open){
    dr.style.maxHeight=(dr.scrollHeight+32)+'px';
    const card=dr.closest('.scard');
    if(card){
      card.classList.add('open');
      /* Removed scrollIntoView — card expands in place without jumping */
    }
    track('service_open',{service_id:id});
  } else {
    track('service_close',{service_id:id});
  }
}

function updateArea(){
  const l=+document.getElementById('dimLen').value||0;
  const w=+document.getElementById('dimWid').value||0;
  const tsf=+document.getElementById('totalSF')?.value||0;
  const sf=(calcMode==='total'&&tsf)?Math.round(tsf):(l&&w?Math.round(l*w):0);
  if(calcMode==='total'){
    document.getElementById('areaBadge').innerHTML=sf?L().areaTotalFmt(sf):L().areaTotalHint;
  } else {
    document.getElementById('areaBadge').innerHTML=L().areaHint(l||'',w||'',sf);
  }
}

const SVC_MODE={
  kitch:'kitchen',furnp:'furniture',
  p1:'sqft',p2:'sqft',fl:'sqft',fv:'sqft',custom:'custom-sqft',
  trim:'linear',
  tv:'fixed',art:'fixed',fur:'fixed',plumb:'fixed',elec:'fixed'
};
function getMode(v){return SVC_MODE[v]||'sqft';}
function isHourly(v){return false;} /* deprecated — kept for safety */

function renderCalculatorUI(){
  const v=document.getElementById('svcSel').value;
  if(!v)return;
  const mode=getMode(v);
  const l=L();
  /* hide all mode containers */
  ['roomWrap','sfWrap','areaBadge','bpWrap','flWrap','hrWrap','hrBadge',
   'kitchenWrap','furnWrap','fixedWrap','linearWrap','customSqftWrap','customSqftBadge'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  document.querySelector('.mode').style.display='none';
  document.getElementById('addonGroup').innerHTML='';
  const sub=document.getElementById('calcSub');

  if(mode==='sqft'){
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    document.querySelector('.mode').style.display='flex';
    document.getElementById(calcMode==='room'?'roomWrap':'sfWrap').style.display=
      calcMode==='room'?'grid':'flex';
    document.getElementById('areaBadge').style.display='block';
    const list=ip?l.ap:ifl?l.af:[];
    document.getElementById('addonGroup').innerHTML=list.map(a=>
      `<label class="arow"><input type="checkbox" id="ao_${a.id}">`+
      `<span>${a.l}</span><span class="ap">${a.p}</span></label>`
    ).join('');
    if(ip) document.getElementById('bpWrap').style.display='flex';
    if(ifl) document.getElementById('flWrap').style.display='block';
    if(sub) sub.textContent=l.calcSub||'';
    updateArea();
  }
  else if(mode==='kitchen'){
    document.getElementById('kitchenWrap').style.display='block';
    if(sub) sub.textContent=l.calcSubKitchen||'';
    renderKitchenOpts();
  }
  else if(mode==='furniture'){
    document.getElementById('furnWrap').style.display='block';
    if(sub) sub.textContent=l.calcSubFurn||'';
    renderFurnOpts();
  }
  else if(mode==='fixed'){
    document.getElementById('fixedWrap').style.display='block';
    if(sub) sub.textContent=l.calcSubFixed||'';
    renderFixedOpts(v);
  }
  else if(mode==='linear'){
    document.getElementById('linearWrap').style.display='block';
    if(sub) sub.textContent=l.calcSubLinear||'';
    renderLinearOpts(v);
  }
  else if(mode==='custom-sqft'){
    document.getElementById('customSqftWrap').style.display='block';
    document.querySelector('#customModeGroup').style.display='flex';
    document.getElementById('customRoomWrap').style.display='grid';
    document.getElementById('customSfWrap').style.display='none';
    document.getElementById('customSqftBadge').style.display='block';
    if(sub) sub.textContent=l.calcSubCustom||'';
    initCustomSqftMode();
  }
}

function renderKitchenOpts(){
  const l=L();
  const sel=document.getElementById('doorTypeSel');
  sel.innerHTML=l.kitchenDoorOpts.map(o=>
    `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
  ).join('');
  document.getElementById('lDoorType').textContent=l.lDoorType;
  document.getElementById('lDoorQtyK').textContent=l.lDoorQty;
  document.getElementById('lDrawerS').textContent=l.lDrawerS;
  document.getElementById('lDrawerL').textContent=l.lDrawerL;
  document.getElementById('lEndPanels').textContent=l.lEndPanels;
  const ag=document.getElementById('kitchenAddonGroup');
  ag.innerHTML=(l.kitchenAddons||[]).map(a=>
    `<label class="arow"><input type="checkbox" id="ao_${a.id}">`+
    `<span>${a.l}</span><span class="ap">${a.p}</span></label>`
  ).join('');
  /* kitchen extra calcs labels */
  const kd=document.getElementById('kecDividerLabel');
  if(kd) kd.textContent=l.kecDivider||'Also calculate by area';
  const kst=document.getElementById('kecSqftTitle');
  if(kst) kst.textContent=l.kecSqftTitle||'Price per Sq Ft';
  const klt=document.getElementById('kecLinearTitle');
  if(klt) klt.textContent=l.kecLinearTitle||'Price per Linear Ft';
}

function renderFurnOpts(){
  const l=L();
  const sel=document.getElementById('pieceTypeSel');
  sel.innerHTML=l.furnPieceOpts.map(o=>
    `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
  ).join('');
  document.getElementById('lPieceType').textContent=l.lPieceType;
  document.getElementById('lPieceQty').textContent=l.lPieceQty;
}

function renderFixedOpts(svc){
  const l=L();
  const opts=l.fixedOpts[svc]||[];
  const wrap=document.getElementById('fixedCards');
  wrap.innerHTML=opts.map((o,i)=>{
    if(o.addon) return ''; /* addon items shown as extras, not radio cards */
    return `<label class="fcard"><input type="radio" name="fixedOpt" value="${o.id}" data-price="${o.p}" ${i===0?'checked':''}>`+
      `<div class="fcard-inner"><span class="fcard-name">${o.l}</span>`+
      `<span class="fcard-price">$${o.p}</span></div></label>`;
  }).join('');
  /* handle addon/extra qty */
  const extraWrap=document.getElementById('fixedExtraWrap');
  const addonOpt=opts.find(o=>o.addon);
  const extraOpt=opts.find(o=>o.extra);
  if(addonOpt){
    extraWrap.style.display='flex';
    document.getElementById('lFixedExtra').textContent=addonOpt.l+' ($'+addonOpt.p+'/ea)';
    document.getElementById('fixedExtraQty').value='';
    document.getElementById('fixedExtraQty').dataset.price=addonOpt.p;
  } else if(extraOpt){
    extraWrap.style.display='flex';
    document.getElementById('lFixedExtra').textContent=extraOpt.extra.l+' ($'+extraOpt.extra.ep+'/ea)';
    document.getElementById('fixedExtraQty').value='';
    document.getElementById('fixedExtraQty').dataset.price=extraOpt.extra.ep;
  } else {
    extraWrap.style.display='none';
  }
}

function renderLinearOpts(svc){
  const l=L();
  const sel=document.getElementById('linearServiceSel');
  sel.innerHTML=l.linearOpts.map(o=>
    `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
  ).join('');
  document.getElementById('lLinearService').textContent=l.lLinearService||'Service Type';
  document.getElementById('lLinearLength').textContent=l.lLinearLength||'Length';
  document.getElementById('lLinearUnit').textContent=l.lLinearUnit||'Unit';
  updateLinearLength();
}

function updateLinearLength(){
  const l=+document.getElementById('linearLength').value||0;
  const badge=document.getElementById('linearBadge');
  const sel=document.getElementById('linearServiceSel');
  const svcPrice=+sel.options[sel.selectedIndex].dataset.price||0;
  const unit=document.getElementById('linearUnitSel').value;
  const unitL=L().lLinearUnit||'Unit';
  if(!l){badge.innerHTML='Enter length';badge.style.display='block';return;}
  const convLength=unit==='m'?Math.round(l*3.28084*100)/100:l;
  const tot=Math.round(convLength*svcPrice*100)/100;
  badge.innerHTML=`${convLength} ft × $${svcPrice}/ft = <strong>$${tot}</strong>`;
  badge.style.display='block';
}

function updateHrBadge(){
  const h=+document.getElementById('hoursInput').value||0;
  const badge=document.getElementById('hrBadge');
  const l=L();
  if(!h){badge.innerHTML=l.hrBadgeHint;return;}
  const extra=Math.max(0,h-2);
  const tot=Math.round(150+extra*75);
  badge.innerHTML=extra>0
    ?l.hrBadgeFmt(extra,tot)
    :`$150 call<br><strong>${l.hrBadgeIncl}</strong>`;
}

function updateCustomSqft(){
  const price=+document.getElementById('customPricePerSqft').value||0;
  const badge=document.getElementById('customSqftBadge');
  const l=L();
  let sf=0;

  const customCalcMode=document.getElementById('customModeRoom').getAttribute('aria-pressed')==='true'?'room':'total';

  if(customCalcMode==='room'){
    const len=+document.getElementById('customDimLen').value||0;
    const wid=+document.getElementById('customDimWid').value||0;
    sf=Math.round(len*wid);
    if(!len||!wid){badge.innerHTML='Enter dimensions';badge.style.display='block';return;}
  }else{
    sf=+document.getElementById('customTotalSF').value||0;
    if(!sf){badge.innerHTML='Enter total area';badge.style.display='block';return;}
  }

  if(!price){badge.innerHTML='Enter price per sq ft';badge.style.display='block';return;}

  const tot=Math.round(sf*price*100)/100;
  const priceStr=price.toFixed(2);
  badge.innerHTML=`${sf} sq ft × $${priceStr}/sf = <strong>$${tot}</strong>`;
  badge.style.display='block';
}

function initCustomSqftMode(){
  const l=L();
  document.getElementById('lCustomPrice').textContent=l.lCustomPrice||'Price per sq ft';
  document.getElementById('lCustomLen').textContent=l.lCustomLen||'Length';
  document.getElementById('lCustomWid').textContent=l.lCustomWid||'Width';
  document.getElementById('lCustomSf').textContent=l.lCustomSf||'Total sq ft';

  document.getElementById('customModeRoom').textContent=l.lModeRoom||'Room';
  document.getElementById('customModeTotal').textContent=l.lModeTotal||'Total';

  updateCustomSqft();
}

document.getElementById('svcSel').addEventListener('change',renderCalculatorUI);
['dimLen','dimWid','totalSF'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',updateArea);});
document.getElementById('hoursInput').addEventListener('input',updateHrBadge);
['linearLength','linearServiceSel','linearUnitSel'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',updateLinearLength);el?.addEventListener('change',updateLinearLength);});

['customPricePerSqft','customDimLen','customDimWid','customTotalSF'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',updateCustomSqft);});

// Kitchen extra calcs (sqft + linear ft inside kitchen mode)
function updateKitchenExtraCalcs(){
  const sp=+document.getElementById('kecSqftPrice')?.value||0;
  const sa=+document.getElementById('kecSqftArea')?.value||0;
  const sr=document.getElementById('kecSqftResult');
  if(sr){
    if(sp&&sa){sr.innerHTML=sa+' sf × $'+sp.toFixed(2)+' = <strong>$'+Math.round(sa*sp*100)/100+'</strong>';}
    else{sr.textContent='—';}
  }
  const lp=+document.getElementById('kecLinearPrice')?.value||0;
  const ll=+document.getElementById('kecLinearLen')?.value||0;
  const lr=document.getElementById('kecLinearResult');
  if(lr){
    if(lp&&ll){lr.innerHTML=ll+' lf × $'+lp.toFixed(2)+' = <strong>$'+Math.round(ll*lp*100)/100+'</strong>';}
    else{lr.textContent='—';}
  }
}
['kecSqftPrice','kecSqftArea','kecLinearPrice','kecLinearLen'].forEach(id=>{
  const el=document.getElementById(id);if(el)el.addEventListener('input',updateKitchenExtraCalcs);
});

// Custom sqft mode toggle
(function(){
  const customModeRoom=document.getElementById('customModeRoom');
  const customModeTotal=document.getElementById('customModeTotal');
  const customRoomWrap=document.getElementById('customRoomWrap');
  const customSfWrap=document.getElementById('customSfWrap');
  if(!customModeRoom||!customModeTotal)return;
  function setCustomMode(m){
    customModeRoom.setAttribute('aria-pressed', m==='room'?'true':'false');
    customModeTotal.setAttribute('aria-pressed', m==='total'?'true':'false');
    if(customRoomWrap) customRoomWrap.style.display=(m==='room')?'grid':'none';
    if(customSfWrap) customSfWrap.style.display=(m==='total')?'flex':'none';
    updateCustomSqft();
  }
  customModeRoom.addEventListener('click',()=>setCustomMode('room'));
  customModeTotal.addEventListener('click',()=>setCustomMode('total'));
  setCustomMode('room');
})();

document.getElementById('calcBtn').addEventListener('click',()=>{
  const v=document.getElementById('svcSel').value;
  if(!v)return;
  const mode=getMode(v);
  const name=L().opts.find(o=>o.v===v)?.l||'';
  let tot=0,detail='';

  if(mode==='kitchen'){
    const sel=document.getElementById('doorTypeSel');
    const doorPrice=+sel.options[sel.selectedIndex].dataset.price||0;
    const doorQty=+document.getElementById('doorQtyK').value||0;
    if(!doorQty){document.getElementById('doorQtyK').focus();return;}
    const ds=+document.getElementById('drawerSmallQty').value||0;
    const dl=+document.getElementById('drawerLargeQty').value||0;
    const ep=+document.getElementById('endPanelQty').value||0;
    tot=doorQty*doorPrice + ds*P.kitchen.drawerSmall + dl*P.kitchen.drawerLarge + ep*P.kitchen.endPanel;
    if(document.getElementById('ao_degreasing')?.checked) tot+=doorQty*P.kitchen.degreasing;
    if(document.getElementById('ao_oakFill')?.checked) tot+=doorQty*P.kitchen.oakFill;
    if(document.getElementById('ao_twoTone')?.checked) tot+=P.kitchen.twoTone;
    detail=doorQty+' doors'+(ds+dl>0?' + '+(ds+dl)+' drawers':'')+(ep>0?' + '+ep+' panels':'');
  }
  else if(mode==='furniture'){
    const sel=document.getElementById('pieceTypeSel');
    const piecePrice=+sel.options[sel.selectedIndex].dataset.price||0;
    const qty=+document.getElementById('pieceQty').value||0;
    if(!qty){document.getElementById('pieceQty').focus();return;}
    tot=qty*piecePrice;
    detail=qty+' × '+sel.options[sel.selectedIndex].text.split('—')[0].trim();
  }
  else if(mode==='linear'){
    const sel=document.getElementById('linearServiceSel');
    const svcPrice=+sel.options[sel.selectedIndex].dataset.price||0;
    const len=+document.getElementById('linearLength').value||0;
    const unit=document.getElementById('linearUnitSel').value;
    if(!len){document.getElementById('linearLength').focus();return;}
    const convLen=unit==='m'?Math.round(len*3.28084*100)/100:len;
    tot=Math.round(convLen*svcPrice*100)/100;
    const svcName=sel.options[sel.selectedIndex].textContent||'';
    detail=Math.round(convLen*100)/100+' ft - '+svcName;
    lastEst={tot:Math.round(tot),name,len:convLen,detail,mode:'linear'};
  }
  else if(mode==='fixed'){
    const radio=document.querySelector('input[name="fixedOpt"]:checked');
    if(!radio)return;
    tot=+radio.dataset.price||0;
    const extraQty=+document.getElementById('fixedExtraQty')?.value||0;
    const extraPrice=+document.getElementById('fixedExtraQty')?.dataset.price||0;
    tot+=extraQty*extraPrice;
    const lbl=radio.closest('.fcard')?.querySelector('.fcard-name')?.textContent||'';
    detail=lbl+(extraQty>0?' + '+extraQty+' extra':'');
  }
  else if(mode==='custom-sqft'){
    const price=+document.getElementById('customPricePerSqft').value||0;
    const customMode=document.getElementById('customModeRoom').getAttribute('aria-pressed')==='true'?'room':'total';
    let sf=0;
    if(customMode==='room'){
      const len=+document.getElementById('customDimLen').value||0;
      const wid=+document.getElementById('customDimWid').value||0;
      if(!len||!wid){document.getElementById('customDimLen').focus();return;}
      sf=Math.round(len*wid);
    }else{
      sf=+document.getElementById('customTotalSF').value||0;
      if(!sf){document.getElementById('customTotalSF').focus();return;}
    }
    if(!price){document.getElementById('customPricePerSqft').focus();return;}
    tot=Math.round(sf*price*100)/100;
    detail=sf+' sq ft @ $'+price.toFixed(2)+'/sf';
    lastEst={tot:Math.round(tot),name,sf,detail,mode:'custom-sqft'};
  }
  else{ /* sqft mode */
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    const len=+document.getElementById('dimLen').value||0;
    const wid=+document.getElementById('dimWid').value||0;
    const tsf=+document.getElementById('totalSF')?.value||0;
    let sf;
    if(calcMode==='room'){
      if(!len||!wid){document.getElementById('dimLen').focus();return;}
      sf=len*wid;
    }else{
      if(!tsf){document.getElementById('totalSF').focus();return;}
      sf=tsf;
    }
    if(v==='p1') tot=sf*P.paint.wall1coat;
    if(v==='p2') tot=sf*P.paint.wall2coat;
    if(v==='fl') tot=sf*P.floor.laminateLabor;
    if(v==='fv') tot=sf*P.floor.lvpLabor;
    if(ip){
      if(document.getElementById('ao_prep')?.checked) tot+=sf*P.paint.prep;
      if(document.getElementById('ao_wallp')?.checked) tot+=sf*P.paint.wallpaper;
      if(document.getElementById('ao_mold')?.checked) tot+=sf*P.paint.mold;
      if(document.getElementById('ao_strip')?.checked) tot+=sf*1.20;
      tot+=(+document.getElementById('baseLF')?.value||0)*P.paint.baseboard;
    }
    if(ifl){
      if(document.getElementById('ao_demo')?.checked) tot+=sf*P.floor.demo;
      if(document.getElementById('ao_under')?.checked) tot+=sf*P.floor.underlayment;
      tot+=(+document.getElementById('transQty')?.value||0)*P.floor.transition;
      tot+=(+document.getElementById('doorQty')?.value||0)*P.floor.doorUndercut;
    }
    detail=Math.round(sf)+' sq ft';
    lastEst={tot:Math.round(tot),name,sf:Math.round(sf),len,wid,detail,mode:'sqft'};
  }

  tot=Math.round(tot);
  if(mode!=='sqft') lastEst={tot,name,detail,mode};

  /* show result */
  document.getElementById('resAmt').textContent='$'+tot.toLocaleString('en-US');
  document.getElementById('resMin').style.display='none';
  document.getElementById('calcRes').style.display='block';
  setTimeout(()=>document.getElementById('calcRes').classList.add('show'),10);
  document.getElementById('calcRes').scrollIntoView({behavior:'smooth',block:'nearest'});
  track('calc_calculate',{service:v,total:tot,mode,detail});
});

document.getElementById('resWa').addEventListener('click',()=>{
  if(!lastEst)return;
  const l=L();
  const detail=lastEst.hours
    ?l.waHoursDetail(lastEst.hours)
    :l.waRoomDetail(lastEst.len,lastEst.wid,lastEst.sf);
  const m=`${l.waGreet}\n${l.waEstLabel}: ${lastEst.name}\n${detail}\n${l.waTotalLabel}: $${lastEst.tot.toLocaleString()}\n${l.waConfirm}`;
  track('calc_share_whatsapp',{service:lastEst.name,area_sqft:lastEst.sf,total:lastEst.tot});
  window.open('https://wa.me/12133611700?text='+encodeURIComponent(m),'_blank','noopener');
});

document.getElementById('resCopy').addEventListener('click',async()=>{
  if(!lastEst)return;
  const detail=lastEst.hours?`~${lastEst.hours}h`:`${lastEst.sf} sq ft`;
  const txt=`${lastEst.name}: $${lastEst.tot.toLocaleString()} (${detail})\nHandy & Friend · (213) 361-1700`;
  const ui=U();
  try{await navigator.clipboard.writeText(txt);}catch(e){}
  const btn=document.getElementById('resCopy'),old=btn.textContent;
  btn.textContent=ui.copyDone;setTimeout(()=>{btn.textContent=old;},1800);
});

document.getElementById('langBtn').addEventListener('click',()=>{
  lang=LANG_ORDER[(LANG_ORDER.indexOf(lang)+1)%LANG_ORDER.length];
  track('language_change',{language:lang});
  applyLang();
});

/* ─── AI SEARCH BAR HANDLERS ─── */
(function(){
  const searchBar=document.getElementById('searchBarWrapper');
  const searchInput=document.getElementById('aiSearchInput');
  const submitBtn=document.getElementById('submitBtn');
  const photoBtn=document.getElementById('photoBtn');
  const photoInput=document.getElementById('photoInput');
  const photoPreviewRow=document.getElementById('photoPreviewRow');

  if(!searchInput||!submitBtn||!searchBar) return;

  // Collected photos as [{dataUrl, name}]
  let selectedPhotos=[];

  // Focus/blur/input states
  searchInput.addEventListener('focus',()=>{ searchBar.classList.add('active'); });
  searchInput.addEventListener('blur',()=>{ if(!searchInput.value&&!selectedPhotos.length) searchBar.classList.remove('active'); });
  searchInput.addEventListener('input',()=>{ searchBar.classList[searchInput.value?'add':'remove']('active'); });

  // ── Photo button → open file picker ──
  if(photoBtn&&photoInput){
    photoBtn.addEventListener('click',(e)=>{
      e.preventDefault();
      photoInput.click();
    });

    photoInput.addEventListener('change',()=>{
      const files=Array.from(photoInput.files||[]).slice(0,6);
      if(!files.length) return;
      searchBar.classList.add('active');
      files.forEach(file=>{
        if(selectedPhotos.length>=6) return;
        const reader=new FileReader();
        reader.onload=(ev)=>{
          const dataUrl=ev.target.result;
          const photoObj={dataUrl:dataUrl,name:file.name};
          selectedPhotos.push(photoObj);
          addThumb(photoObj);
          photoBtn.classList.add('has-photos');
        };
        reader.readAsDataURL(file);
      });
      photoInput.value=''; // reset so same file can be re-added
    });
  }

  function addThumb(photoObj){
    if(!photoPreviewRow) return;
    const wrap=document.createElement('div');
    wrap.className='photo-thumb';
    const img=document.createElement('img');
    img.src=photoObj.dataUrl;
    img.alt='';
    const rm=document.createElement('button');
    rm.className='photo-thumb-remove';
    rm.innerHTML='×';
    rm.title='Remove photo';
    rm.addEventListener('click',()=>{
      selectedPhotos=selectedPhotos.filter(p=>p!==photoObj);
      wrap.remove();
      if(!selectedPhotos.length) photoBtn.classList.remove('has-photos');
    });
    wrap.appendChild(img);
    wrap.appendChild(rm);
    photoPreviewRow.appendChild(wrap);
  }

  // ── AI Chat Integration: Send query + photos to /api/ai-chat ──
  let chatHistory=[];
  let chatSessionId=localStorage.getItem('ai_search_session_id')||'search_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  localStorage.setItem('ai_search_session_id',chatSessionId);

  async function handleSubmit(){
    const query=searchInput.value.trim();
    if(!query&&!selectedPhotos.length) return;

    // Visual feedback
    submitBtn.disabled=true;
    const origText=submitBtn.textContent;
    submitBtn.textContent='...';

    track('ai_chat_submit',{query:query,language:lang,photos:selectedPhotos.length});

    try{
      // Add user message (and optional photos) to history
      chatHistory.push({
        role:'user',
        content:query,
        photos:selectedPhotos.map((p,idx)=>({
          dataUrl:p.dataUrl,
          name:p.name||('chat_photo_'+(idx+1)+'.jpg')
        }))
      });

      // Build messages array for API
      const messages=chatHistory.map(m=>{
        const row={
          role:m.role,
          content:typeof m.content==='string'?m.content:m.content.text||''
        };
        if(Array.isArray(m.photos)&&m.photos.length){
          row.photos=m.photos.slice(0,6);
        }
        return row;
      });

      const resp=await fetch('/api/ai-chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:chatSessionId,
          messages:messages,
          lang:lang
        })
      });

      const data=await resp.json().catch(()=>({}));
      if(data.reply){
        // Add bot response to history
        chatHistory.push({role:'assistant',content:data.reply});

        // Show AI response in modal with conversation
        showAIChatModal(data.reply,data.leadCaptured);

        // Clear the search bar
        searchInput.value='';
        selectedPhotos=[];
        if(photoPreviewRow) photoPreviewRow.innerHTML='';
        if(photoBtn) photoBtn.classList.remove('has-photos');
        searchBar.classList.remove('active');
        submitBtn.textContent='✓';
        setTimeout(()=>{ submitBtn.textContent=origText; submitBtn.disabled=false; },1800);
      } else {
        submitBtn.textContent=origText;
        submitBtn.disabled=false;
      }
    }catch(err){
      console.error('[AI_CHAT]',err);
      submitBtn.textContent=origText;
      submitBtn.disabled=false;
    }
  }

  // Show AI Chat Response in modal (conversation-aware)
  function showAIChatModal(response,leadCaptured){
    const modal=document.createElement('div');
    modal.style.cssText=`position:fixed;inset:0;background:rgba(42,31,20,.55);z-index:999;
      display:flex;align-items:flex-end;justify-content:center;padding:20px;backdrop-filter:blur(4px)`;

    const card=document.createElement('div');
    card.style.cssText=`background:#fff;border-radius:20px;padding:28px;max-width:580px;
      width:100%;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(42,31,20,.30);
      animation:slideUp 300ms ease;font-family:var(--fb)`;

    let leadMsg='';
    if(leadCaptured){
      leadMsg=`<div style="background:rgba(184,137,44,.10);border:1px solid rgba(184,137,44,.30);
        padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:13px;color:#7a6010;font-weight:600">
        ✅ Your request has been saved! Our team will call you within 1 hour (Mon–Sat 8am–8pm PT).
      </div>`;
    }

    card.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:18px;font-weight:700;color:#1B2B4B;font-family:var(--fs);margin:0">
          💬 Alex — Your Personal Assistant
        </h3>
        <button style="background:rgba(42,31,20,.07);border:none;width:32px;height:32px;
          border-radius:50%;cursor:pointer;font-size:16px;color:#666" onclick="this.closest('[role=dialog]').remove()">✕</button>
      </div>
      ${leadMsg}
      <div style="font-size:15px;line-height:1.65;color:#2A1F14;white-space:pre-wrap;
        background:rgba(42,31,20,.02);padding:16px;border-radius:12px;margin-bottom:16px">
        ${escapeHtml(response)}
      </div>
      <div style="display:flex;gap:12px;flex-direction:column">
        <button style="width:100%;padding:14px;background:linear-gradient(135deg,#1B2B4B 0%,#2B4A8C 100%);
          color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:14px"
          onclick="this.closest('[role=dialog]').remove();document.getElementById('hf-chat-btn')?.click()">
          💬 Continue Chat with Alex
        </button>
        <button style="width:100%;padding:14px;background:rgba(184,137,44,.15);
          color:#B8892C;border:1px solid rgba(184,137,44,.30);border-radius:12px;
          font-weight:700;cursor:pointer;font-size:14px"
          onclick="this.closest('[role=dialog]').remove()">
          Close
        </button>
      </div>
    `;

    card.setAttribute('role','dialog');
    modal.appendChild(card);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click',(e)=>{
      if(e.target===modal) modal.remove();
    });

    // Add animation
    const style=document.createElement('style');
    style.textContent=`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`;
    if(!document.querySelector('style[data-ai-modal]')){
      style.setAttribute('data-ai-modal','');
      document.head.appendChild(style);
    }
  }

  function escapeHtml(str){
    const div=document.createElement('div');
    div.textContent=str;
    return div.innerHTML;
  }

  submitBtn.addEventListener('click',handleSubmit);
  searchInput.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      handleSubmit();
    }
  });

  // Promo chip interaction
  document.querySelectorAll('.promo-chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const value=chip.dataset.value||chip.textContent.trim();
      searchInput.value=`Tell me about ${chip.textContent.trim()}`;
      searchInput.focus();
      track('promo_chip_click',{chip:value,language:lang});
    });
  });
})();

// mode toggle
(function(){
  const bRoom=document.getElementById('modeRoom');
  const bTotal=document.getElementById('modeTotal');
  const roomWrap=document.getElementById('roomWrap');
  const sfWrap=document.getElementById('sfWrap');
  if(!bRoom||!bTotal) return;
  function setMode(m){
    calcMode=m;
    bRoom.setAttribute('aria-pressed', m==='room'?'true':'false');
    bTotal.setAttribute('aria-pressed', m==='total'?'true':'false');
    if(roomWrap) roomWrap.style.display=(m==='room')?'grid':'none';
    if(sfWrap) sfWrap.style.display=(m==='total')?'flex':'none';
    updateArea();
  }
  bRoom.addEventListener('click',()=>setMode('room'));
  bTotal.addEventListener('click',()=>setMode('total'));
  setMode('room');
})();

/* ─── INITIALIZE SMS CAPTURE ─── */
document.addEventListener('DOMContentLoaded',()=>{
  const smsSendBtn=document.getElementById('smsSendBtn');
  if(smsSendBtn){
    smsSendBtn.addEventListener('click',handleSmsCapture);
  }
});

// ─── CTA Click Tracking ───
document.querySelector('.bcall')?.addEventListener('click',()=>{
  track('click_call',{method:'tel',phone:'+12133611700'});
});
document.querySelector('.bwa')?.addEventListener('click',()=>{
  track('click_whatsapp',{method:'wa.me',phone:'+12133611700'});
});

/* ═══════════════════════════════════════════════
   COMBO PROMO — mini block under each service card
═══════════════════════════════════════════════ */
const COMBO_PAIRS = {
  kitch: { partner: 'furnp', label: 'Kitchen Cabinets + Furniture Painting', save: 143 },
  furnp: { partner: 'kitch', label: 'Furniture Painting + Kitchen Cabinets', save: 143 },
  paint: { partner: 'floor', label: 'Painting + Flooring',                   save: 275 },
  floor: { partner: 'paint', label: 'Flooring + Painting',                   save: 275 },
};

function buildComboPromo(svcId){
  const pair=COMBO_PAIRS[svcId];
  if(!pair)return '';
  const l=L();
  const withSvc=l.svcs.find(s=>s.id===pair.partner);
  if(!withSvc)return '';
  const save=pair.save;
  const waMsg=encodeURIComponent(
    `${l.waGreet}\nCombo: ${l.svcs.find(s=>s.id===svcId)?.name} + ${withSvc.name}\nSave $${save}\n${l.waConfirm}`
  );
  return `<a class="cpromo" href="https://wa.me/12133611700?text=${waMsg}" target="_blank" rel="noopener" onclick="event.stopPropagation();track('combo_promo_click',{from:'${svcId}',to:'${pair.partner}'})">
    <span class="cpromo-tag">COMBO</span>
    <span class="cpromo-pair">${pair.label}</span>
    <span class="cpromo-save">Save $${save}</span>
    <span class="cpromo-wa">WhatsApp →</span>
  </a>`;
}

// Inject combo promos after renderGrid (called in applyLang)
function injectComboPromos(){
  document.querySelectorAll('.scard').forEach(card=>{
    const drEl=card.querySelector('.drawer');
    if(!drEl)return;
    const id=drEl.id.replace('dr_','');
    // Remove stale promos first
    card.querySelectorAll('.cpromo').forEach(el=>el.remove());
    const promo=buildComboPromo(id);
    if(!promo)return;
    const scb=card.querySelector('.scb .scbd');
    if(scb) scb.insertAdjacentHTML('beforeend',promo);
  });
}

/* ═══════════════════════════════════════════════
   INTERACTIVE COMBO CALCULATOR
═══════════════════════════════════════════════ */
function initComboCalc() {
  const BASE = { tv:150, fur:150, art:150, paint:500, floor:500, plumb:150, elec:175 };
  const LABELS = { tv:'TV Mounting', fur:'Furniture Assembly', art:'Art Hanging',
                   paint:'Cabinet Painting', floor:'Flooring', plumb:'Plumbing', elec:'Electrical' };
  const IDS = Object.keys(BASE);

  function populate(sel, excludeId) {
    sel.innerHTML = '<option value="">Pick a service…</option>';
    IDS.forEach(id => {
      if (id === excludeId) return;
      const o = document.createElement('option');
      o.value = id; o.textContent = LABELS[id] + ' (from $' + BASE[id] + ')';
      sel.appendChild(o);
    });
  }

  const s1 = document.getElementById('ccSel1');
  const s2 = document.getElementById('ccSel2');
  const res = document.getElementById('ccResult');
  const err = document.getElementById('ccErr');
  if (!s1 || !s2) return;

  populate(s1, ''); populate(s2, '');

  function calc() {
    const a = s1.value, b = s2.value;
    err.style.display = 'none'; res.style.display = 'none';
    if (!a || !b) return;
    if (a === b) { err.style.display = 'block'; return; }
    populate(s1, b); populate(s2, a);
    s1.value = a; s2.value = b;
    const total = BASE[a] + BASE[b];
    const disc  = Math.round(total * 0.8);
    const saved = total - disc;
    document.getElementById('ccOriginal').textContent   = '$' + total;
    document.getElementById('ccDiscounted').textContent = '$' + disc;
    document.getElementById('ccSave').textContent       = 'Save $' + saved;
    const msg = encodeURIComponent('Hi! I want to book a COMBO: ' + LABELS[a] + ' + ' + LABELS[b] + '. Combo price $' + disc + ' (save $' + saved + ')');
    document.getElementById('ccWa').href = 'https://wa.me/12133611700?text=' + msg;
    res.style.display = 'block';
    track('combo_calc_view', {svc_a:a, svc_b:b, total:disc, save:saved});
  }

  s1.addEventListener('change', calc);
  s2.addEventListener('change', calc);
  window.reInitComboCalcLang = function() { populate(s1, s2.value||''); populate(s2, s1.value||''); };
  window._comboCalcInit = true;
}

// Init after DOM ready
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{initComboCalc();initMobileCalc();});
}else{
  initComboCalc();
  initMobileCalc();
}

/* ═══════════════════════════════════════════════
   TASK 4: Mobile FAB + Bottom Sheet Calculator
═══════════════════════════════════════════════ */
function initMobileCalc(){
  if(window.innerWidth>=900) return; // desktop — skip

  const fab=document.getElementById('calcFab');
  const overlay=document.getElementById('calcSheetOverlay');
  const sheetClose=document.getElementById('calcSheetClose');
  const sheetBody=document.getElementById('calcSheetBody');
  const calcBox=document.getElementById('calcBox');
  const fabTxt=document.getElementById('calcFabTxt');
  const anchorBtn=document.getElementById('calcAnchorBtn');
  if(!fab||!overlay||!calcBox) return;

  // Update FAB text on lang change
  window.updateMobileCalcLang=()=>{
    if(fabTxt) fabTxt.textContent=L().anchorBtn;
  };

  // Show FAB after scrolling 300px
  let fabShown=false;
  function onScroll(){
    const y=window.scrollY||window.pageYOffset;
    if(y>300&&!fabShown){fab.classList.add('fab-visible');fabShown=true;}
    else if(y<=300&&fabShown){fab.classList.remove('fab-visible');fabShown=false;}
  }
  window.addEventListener('scroll',onScroll,{passive:true});

  // Clone calculator into sheet
  function populateSheet(){
    if(sheetBody.childElementCount>0) return; // already populated
    const clone=calcBox.cloneNode(true);
    // Give cloned elements unique IDs to avoid conflicts
    clone.querySelectorAll('[id]').forEach(el=>{
      el.id='sh_'+el.id;
    });
    clone.id='sheetCalcBox';
    sheetBody.appendChild(clone);
    // Note: cloned calc is display-only. We keep original #calcBox as source of truth.
    // For simplicity, clicking open sheet scrolls to original calc.
    // Actually: just scroll to original calc on mobile via anchor
  }

  function openSheet(){
    // On mobile: scroll to in-page calc instead of opening sheet
    // (sheet would duplicate event handlers; scroll is simpler & reliable)
    if(calcBox){
      const top=calcBox.getBoundingClientRect().top+window.scrollY-80;
      window.scrollTo({top,behavior:'smooth'});
    }
    track('mobile_fab_click',{});
  }

  fab.addEventListener('click',openSheet);
  // Also hook anchor btn
  if(anchorBtn){
    anchorBtn.addEventListener('click',(e)=>{
      e.preventDefault();
      openSheet();
    });
  }

  // Resize: hide FAB on desktop
  window.addEventListener('resize',()=>{
    if(window.innerWidth>=900) fab.classList.remove('fab-visible');
  });
}

// Initial UI render (must run after combo declarations)
applyLang();renderCalculatorUI();updateArea();

// --- Combo promo WhatsApp click handler ---
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.cpromo-wa');
  if (!btn) return;
  const cardId = btn.closest('.scard')?.dataset.id;
  if (!cardId || !COMBO_PAIRS[cardId]) return;
  const p = COMBO_PAIRS[cardId];
  const msg = encodeURIComponent('Hi! Interested in COMBO: ' + p.label + ' (Save $' + p.save + ')');
  window.open('https://wa.me/12133611700?text=' + msg, '_blank');
});

/* ═══════════════════════════════════════════════
   LIGHTBOX IMAGE VIEWER
═══════════════════════════════════════════════ */
function initLightbox(){
  const overlay = document.getElementById('lightboxOverlay');
  const img = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  if (!overlay || !img || !closeBtn) return;

  // Click on service image to open lightbox
  // Skip service grid cards - only allow lightbox for standalone gallery images
  document.addEventListener('click', function(e) {
    const sph = e.target.closest('.sph');
    if (!sph) return;
    // Don't open lightbox for service cards in the grid
    if (sph.closest('.scard')) return;
    const imgElement = sph.querySelector('img');
    if (!imgElement) return;
    img.src = imgElement.src;
    overlay.classList.add('active');
  });

  // Close lightbox
  function closeLightbox() {
    overlay.classList.remove('active');
  }
  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeLightbox();
  });

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeLightbox();
    }
  });
}

// Initialize lightbox
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLightbox);
} else {
  initLightbox();
}

/* ─── SPINNER +/- BUTTONS FOR NUMBER INPUTS ─────────────────── */
function initSpinners(){
  document.querySelectorAll('#calcBox input[type=number]').forEach(function(inp){
    if(inp.parentElement.classList.contains('num-row')) return;
    var row=document.createElement('div');
    row.className='num-row';
    inp.parentElement.insertBefore(row,inp);
    var minus=document.createElement('button');
    minus.type='button';minus.className='num-btn';minus.textContent='\u2212';
    minus.setAttribute('aria-label','Decrease');
    minus.addEventListener('click',function(){
      var step=parseFloat(inp.step)||1;
      var mn=parseFloat(inp.min);
      var val=parseFloat(inp.value)||0;
      var nv=Math.round((val-step)*100)/100;
      if(!isNaN(mn)&&nv<mn) nv=mn;
      inp.value=nv;inp.dispatchEvent(new Event('input',{bubbles:true}));
    });
    var plus=document.createElement('button');
    plus.type='button';plus.className='num-btn';plus.textContent='+';
    plus.setAttribute('aria-label','Increase');
    plus.addEventListener('click',function(){
      var step=parseFloat(inp.step)||1;
      var mx=parseFloat(inp.max);
      var val=parseFloat(inp.value)||0;
      var nv=Math.round((val+step)*100)/100;
      if(!isNaN(mx)&&nv>mx) nv=mx;
      inp.value=nv;inp.dispatchEvent(new Event('input',{bubbles:true}));
    });
    row.appendChild(minus);row.appendChild(inp);row.appendChild(plus);
  });
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initSpinners);}
else{initSpinners();}
