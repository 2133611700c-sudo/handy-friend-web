/* ═══════════════════════════════════════════════
   PRICES (numbers only — labels in T{})
   Official Price List 2026 — Handy & Friend LA
═══════════════════════════════════════════════ */
/* Public model (frozen 2026-04-24):
   Service Call — $150, includes up to 2 hours on-site for the agreed scope.
   $75/hour after, only when approved in writing.
   Materials/parking/disposal extra only when written before work starts.
   Paint/flooring: $3/sf labor project estimate on dedicated subpages only. */
const P={
  base:{call:150,includedHours:2,hrAfter:75},

  /* CATEGORY 1: KITCHEN CABINET PAINTING — quote-only, no public price */
  kitchen:{
    doorRoller:7.25,door1side:40,door2side:70,doorFull:75,
    drawerSmall:25,drawerLarge:35,endPanel:50,island:175,
    interiorBox:30,degreasing:20,oakFill:45,twoTone:300,
    topCoat:20,glassMasking:20,hwHoles:20,deepRepair:25,
    caulking:1.25,removeContactPaper:50
  },

  /* CATEGORY 2: FURNITURE PAINTING — quote-only, no public price */
  furnPaint:{
    chair:40,nightstand:65,dresser:170,diningTable:130,builtIn:60
  },

  /* CATEGORY 3: INTERIOR PAINTING — $3/sf labor project estimate */
  paint:{
    wall1coat:3.00,wall2coat:3.75,ceiling:3.75,ceilingTexture:4.25,
    baseboard:3.00,baseboardInstall:2.50,crown:3.75,doorCasing:30,doorSlab:65,
    prep:0.65,wallpaper:1.25,mold:1.50
  },

  /* CATEGORY 4: FLOORING — $3/sf labor project estimate */
  floor:{
    laminateLabor:3.00,lvpLabor:3.00,demo:1.50,underlayment:0.50,
    spotLevel:60,transition:30,doorUndercut:30,baseboardReinstall:2.00
  },

  /* CATEGORY 5: MOUNTING & INSTALLATION — $150 service call */
  install:{
    tvStandard:150,artMirror:150,curtainFirst:150,curtainEach:75,serviceCall:150
  },

  /* CATEGORY 6: FURNITURE ASSEMBLY — $150 service call */
  assembly:{
    small:150,paxHourly:75
  },

  /* CATEGORY 7: PLUMBING — $150 service call */
  plumbing:{
    faucet:150,showerHead:150,toiletRepair:150,recaulk:150
  },

  /* CATEGORY 8: ELECTRICAL — $150 service call */
  electrical:{
    lightFixture:150,outletSwitch:150,outletEach:75,smartDevice:150
  },

  /* CATEGORY 9: LINEAR/TRIM SERVICES — project estimate */
  linear:{
    baseboard:3.00,baseboardInstall:2.50,baseboardRemove:2.00,
    crown:3.75,doorCasing:30,caulking:1.25,builtIn:60
  }
};

hydratePricingFromRegistry(P, window.HF_PRICE_REGISTRY);

function hydratePricingFromRegistry(prices, registry) {
  if (!registry) return;
  const sc = registry.service_call;
  const pe = registry.project_estimate;
  if (!sc || !pe) return;

  // Service call model: $150 base, $75/hr after
  prices.base.call = n(sc.price, prices.base.call);
  prices.base.hrAfter = n(sc.hourly_after, prices.base.hrAfter);

  // Project estimates: painting and flooring labor per sq ft
  if (pe.interior_painting) {
    const r = pe.interior_painting.labor_per_sf;
    prices.paint.wall1coat = n(r, prices.paint.wall1coat);
  }
  if (pe.flooring) {
    const r = pe.flooring.labor_per_sf;
    prices.floor.laminateLabor = n(r, prices.floor.laminateLabor);
    prices.floor.lvpLabor = n(r, prices.floor.lvpLabor);
  }

  // Service call categories: lock all to $150
  const serviceCallPrice = n(sc.price, 150);
  prices.install.tvStandard = serviceCallPrice;
  prices.install.artMirror = serviceCallPrice;
  prices.install.curtainFirst = serviceCallPrice;
  prices.install.serviceCall = serviceCallPrice;
  prices.assembly.small = serviceCallPrice;
  prices.plumbing.faucet = serviceCallPrice;
  prices.plumbing.showerHead = serviceCallPrice;
  prices.plumbing.toiletRepair = serviceCallPrice;
  prices.plumbing.recaulk = serviceCallPrice;
  prices.electrical.lightFixture = serviceCallPrice;
  prices.electrical.outletSwitch = serviceCallPrice;
  prices.electrical.smartDevice = serviceCallPrice;
}

function n(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

/* ═══════════════════════════════════════════════
   PHOTOS
═══════════════════════════════════════════════ */
const SVC_IMG={
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
    heroOfferTitle:"Hire a Handyman in Los Angeles",
    heroOfferSubHtml:'<span class="hero-included-accent">Same-day response, transparent pricing, and reliable local handyman help</span><br>Book online in minutes or call (213) 361-1700 for a fast quote',
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
      {id:"paint",name:"Interior Painting",       from:"$3.00/sf"},
      {id:"floor",name:"Flooring Installation",   from:"$3.00/sf"},
      {id:"tv",   name:"TV Mounting",             from:"$150"},
      {id:"fur",  name:"Furniture Assembly",       from:"$150"},
      {id:"art",  name:"Art & Mirrors",           from:"$150"},
      {id:"plumb",name:"Plumbing",                from:"$150"},
      {id:"elec", name:"Electrical",              from:"$150"}
    ],
    calcTitle:"Quick Estimate",
    calcSub:"Enter room size → instant price",
    lSvc:"Service",lLen:"Length (ft)",lWid:"Width (ft)",
    lBase:"Baseboards (lin ft)",lTrans:"Transitions (qty)",lDoorU:"Door undercuts (qty)",
    lHrs:"Estimated hours",anchorBtn:"Get Free Instant Quote",
    lModeRoom:"Room (L×W)",lModeTotal:"Total sq ft",lSfTotal:"Total sq ft",
    lSqftPrice:"Price per sq ft",
    lDoorPriceEdit:"Price per door ($)",lPiecePriceEdit:"Price per piece ($)",lLinearPriceEdit:"Price per ft ($)",
    univSqftLabel:"Quick Sq Ft Calculator",univLinLabel:"Quick Linear Ft Calculator",
    univSqftPriceLbl:"$/sf",univSqftAreaLbl:"Area (sf)",univLinPriceLbl:"$/lf",univLinLenLbl:"Length (ft)",
    subFlLam:"Laminate",subFlLvp:"LVP",
    subTv:"TV",subArt:"Art & Mirrors",subCurtain:"Curtains",
    subPlumb:"Plumbing",subElec:"Electrical",
    tabP1:"Paint 1ct",tabP2:"Paint 2ct",tabFl:"Flooring",tabTrim:"Trim",tabTv:"TV & Decor",tabFur:"Assembly",tabPlumb:"Plumb & Elec",
    areaTotalHint:"Enter total sq ft",
    areaTotalFmt:(sf)=>`Total area = <strong>${sf} sq ft</strong>`,
    waGreet:"Hi Handy & Friend! 👋",
    waEstLabel:"Estimate",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Hours: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Room: ${len}ft × ${wid}ft = ${sf} sq ft`,
    waConfirm:"Please confirm availability.",
    opts:[
      {v:"p1",l:"🖌️ Interior Painting — 1 coat ($3.00/sf)"},
      {v:"p2",l:"🖌️ Interior Painting — 2 coats ($3.75/sf)"},
      {v:"fl",l:"🏠 Flooring — Laminate ($3.00/sf)"},
      {v:"trim",l:"📏 Trim & Moldings (per linear ft)"},
      {v:"tv",l:"📺 TV Mounting"},
      {v:"art",l:"🖼️ Art & Mirrors"},
      {v:"fur",l:"🛋️ Furniture Assembly"},
      {v:"plumb",l:"🚰 Plumbing"},
      {v:"elec",l:"⚡ Electrical"}
    ],
    ap:[
      {id:"prep", l:"+ Sanding / prep",       p:"+$0.65/sf"},
      {id:"wallp",l:"+ Wallpaper removal",     p:"+$1.25/sf"},
      {id:"mold", l:"+ Mold treatment",        p:"+$1.50/sf"},
      {id:"strip",l:"+ Paint stripping",       p:"+$1.20/sf"}
    ],
    af:[
      {id:"demo", l:"+ Demo existing floor",   p:"+$1.50/sf"},
      {id:"under",l:"+ Underlayment",          p:"+$0.50/sf"}
    ],
    /* Calculator mode labels */
    calcSubKitchen:"Select door finish & count",
    calcSubFurn:"Select piece type & quantity",
    calcSubFixed:"Select your service option",
    lDoorType:"Door Finish",lDoorQty:"Number of Doors",
    lDrawerS:"Small Drawers",lDrawerL:"Large Drawers",lEndPanels:"End Panels",
    lPieceType:"Piece Type",lPieceQty:"Quantity",
    kitchenDoorOpts:[{v:"quote",l:"Quote after photos",p:0}],
    kitchenAddons:[],
    furnPieceOpts:[{v:"quote",l:"Quote after photos",p:0}],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Standard Mount (up to 65\")",p:150}
      ],
      art:[
        {id:"artHang",l:"Art / Mirror Hanging (up to 5 pcs)",p:150},
        {id:"curtain1",l:"Curtain Rods — first window",p:150}
      ],
      fur:[
        {id:"furSmall",l:"Small Items — fits in 2 hours",p:150}
      ],
      plumb:[
        {id:"plFaucet",l:"Minor Fixture Swap (faucet, shower head, tank)",p:150}
      ],
      elec:[
        {id:"elLight",l:"Minor Fixture Swap (light, outlet, doorbell)",p:150}
      ]
    },
    calcSubLinear:"Select trim type & enter length (ft)",
    lLinearService:"Service Type",lLinearLength:"Length",lLinearUnit:"Unit",
    linearOpts:[
      {v:"quote",l:"Trim & Millwork — Quote after photos",p:0}
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
      tvScope:"Service Call · $150",tvDesc:"Includes up to 2 hours on-site. Surface cable mgmt included.",
      tv:[
        ["Standard TV Mount (up to 65\")","$150 service call","1–1.5h"],
        ["Hidden Wire / Concealed In-Wall","Quote after photo","2–3h"]
      ],
      tvProv:"TV bracket / arm",
      tvN:"Bracket not included. Hidden-wire quoted after photo of the wall. All holes patched & painted.",
      furScope:"Service Call · $150",furDesc:"Includes up to 2 hours on-site. Larger scope quoted after photos.",
      fur:[
        ["Small Furniture Assembly (shelf, desk, table)","$150 service call","1–2h"],
        ["PAX / Large Closet / Bed Frame / Complex","Quote after photos","varies"]
      ],
      furProv:"All parts, hardware & original instructions",
      furN:"Most small items fit in the 2-hour service call. PAX systems, multi-piece sets, and missing parts quoted in writing before work starts.",
      artScope:"Service Call · $150",artDesc:"Up to 5 standard pieces. Level-checked included.",
      art:[
        ["Art / Mirror Hanging — up to 5 pieces","$150 service call","1–2h"],
        ["Gallery wall beyond 5 pieces","Quote after photos","varies"]
      ],
      artProv:"Hardware, anchors, brackets",
      artN:"Standard drywall / stud walls. Gallery walls >5 pieces quoted after photos.",
      kitchScope:"Quote after photos",kitchDesc:"Professional spray finish. Photos required for a written estimate.",
      kitch:[["Kitchen Cabinet Painting","Quote after photos"]],
      kitchProv:"Photos of your kitchen required before estimate",
      kitchN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      furnpScope:"Quote after photos",furnpDesc:"Full preparation, sanding, primer & paint. Photos required for estimate.",
      furnp:[["Furniture Painting","Quote after photos"]],
      furnpProv:"Photos of furniture required before estimate",
      furnpN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      plumbScope:"Service Call · $150 · No permits",plumbDesc:"Minor / handyman-level cosmetic fixes. No new lines or rough plumbing.",
      plumb:[
        ["Faucet, Shower Head, Toilet Tank, Re-Caulk","$150 service call","1–3h"]
      ],
      plumbProv:"Fixture or parts (client provides)",
      plumbN:"Shutoff valves must be functional. Beyond cosmetic scope — C-36 plumber referral.",
      elecScope:"Service Call · $150 · No permits",elecDesc:"Like-for-like replacement in existing boxes only. No new circuits.",
      elec:[
        ["Light Fixture, Outlet/Switch, Smart Doorbell/Lock","$150 service call","1–2.5h"]
      ],
      elecProv:"Fixture, device, or switch (client provides)",
      elecN:"Ceiling fans with new support box -> C-10 electrician referral. No panel work, no new runs.",
      paintScope:"Per sq ft · Labor only",paintDesc:"SF = painted surface area (walls/ceiling/trim), not floor area.",
      pF1:[
        ["Walls — 1 coat (refresh/same color)","$3.00/sf"],
        ["Walls — 2 coats (color change)","$3.75/sf"],
        ["Ceiling — smooth (2 coats)","$3.75/sf"],
        ["Ceiling — textured (2 coats)","$4.25/sf"],
        ["Trim, doors, baseboards","Quote after photos"]
      ],
      pF2:[
        ["+ Surface Prep — sanding/patching","+$0.65/sf"],
        ["+ Wallpaper Removal","+$1.25/sf"],
        ["+ Mold Surface Treatment","+$1.50/sf"]
      ],
      pF3:[],
      paintProv:"All paint, primer & tools",
      paintN:"Materials (paint, supplies) quoted separately in writing before work starts.",
      flScope:"Per sq ft · Labor only",flDesc:"Output: 120–250 sq ft/day.",
      flG1:[
        ["Laminate Click-Lock — labor only","$3.00/sf"],
        ["LVP / Vinyl Click — labor only","$3.00/sf"],
        ["Demo, underlayment, transitions, baseboard","Quote — written scope"]
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
    artBenefit:"Level-checked. Properly secured.",
    paintBenefit:"Professional finish. No spillage.",
    floorBenefit:"Clean installation. Debris removed.",
    plumbBenefit:"No leaks. Quality fixtures.",
    elecBenefit:"Safe wiring. Code-compliant.",

    tvBadge:"Most popular",paintBadge:"Same-day possible",

    comboTitle:"Bundle Small Tasks in One Visit",
    comboSub:"Add another task while we're there — we confirm the total in writing before arrival.",

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
    heroOfferTitle:"Contrata un handyman en Los Ángeles",
    heroOfferSubHtml:'<span class="hero-included-accent">Respuesta el mismo día, precios transparentes y ayuda confiable de handyman local</span><br>Reserva en línea en minutos o llama al (213) 361-1700 para una cotización rápida',
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
      {id:"paint",name:"Pintura Interior",         from:"$3.00/ft²"},
      {id:"floor",name:"Revestimiento de Pisos",   from:"$3.00/ft²"},
      {id:"tv",   name:"Montaje de TV",            from:"$150"},
      {id:"fur",  name:"Ensamblaje de Muebles",    from:"$150"},
      {id:"art",  name:"Arte, Espejos & Decoración",from:"$150"},
      {id:"plumb",name:"Plomería",                 from:"$150"},
      {id:"elec", name:"Eléctrico",                from:"$150"}
    ],
    calcTitle:"Calculadora de precio",
    calcSub:"Dimensiones del cuarto → precio",
    lSvc:"Servicio",lLen:"Largo (pies)",lWid:"Ancho (pies)",
    lBase:"Zócalos (pie lineal)",lTrans:"Transiciones (cant.)",lDoorU:"Recortes de puerta (cant.)",
    lHrs:"Horas estimadas",anchorBtn:"Obtener estimado",
    lModeRoom:"Habitación (L×A)",lModeTotal:"Total ft²",lSfTotal:"Total ft²",
    lSqftPrice:"Precio por ft²",
    lDoorPriceEdit:"Precio por puerta ($)",lPiecePriceEdit:"Precio por pieza ($)",lLinearPriceEdit:"Precio por pie ($)",
    univSqftLabel:"Calculadora rápida ft²",univLinLabel:"Calculadora rápida pie lineal",
    univSqftPriceLbl:"$/ft²",univSqftAreaLbl:"Área (ft²)",univLinPriceLbl:"$/pl",univLinLenLbl:"Largo (pies)",
    subFlLam:"Laminado",subFlLvp:"LVP",
    subTv:"TV",subArt:"Cuadros & Espejos",subCurtain:"Cortinas",
    subPlumb:"Plomería",subElec:"Eléctrico",
    tabP1:"Pintura 1c",tabP2:"Pintura 2c",tabFl:"Pisos",tabTrim:"Molduras",tabTv:"TV & Decor",tabFur:"Ensamblaje",tabPlumb:"Plom & Elec",
    areaTotalHint:"Ingresa el total de ft²",
    areaTotalFmt:(sf)=>`Área total = <strong>${sf} ft²</strong>`,
    waGreet:"¡Hola Handy & Friend! 👋",
    waEstLabel:"Cotización",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Horas: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Habitación: ${len}ft × ${wid}ft = ${sf} ft²`,
    waConfirm:"Por favor confirme disponibilidad.",
    opts:[
      {v:"p1",l:"🖌️ Pintura Interior — 1 capa ($3.00/ft²)"},
      {v:"p2",l:"🖌️ Pintura Interior — 2 capas ($3.75/ft²)"},
      {v:"fl",l:"🏠 Pisos — Laminado ($3.00/ft²)"},
      {v:"trim",l:"📏 Molduras y Cenefas (por pie lineal)"},
      {v:"tv",l:"📺 Montaje de TV"},
      {v:"art",l:"🖼️ Cuadros & Espejos"},
      {v:"fur",l:"🛋️ Ensamblaje de muebles"},
      {v:"plumb",l:"🚰 Plomería"},
      {v:"elec",l:"⚡ Eléctrico"}
    ],
    ap:[
      {id:"prep", l:"+ Preparación / lijado",    p:"+$0.65/ft²"},
      {id:"wallp",l:"+ Retirar tapiz",           p:"+$1.25/ft²"},
      {id:"mold", l:"+ Tratamiento de moho",     p:"+$1.50/ft²"},
      {id:"strip",l:"+ Quitar pintura vieja",    p:"+$1.20/ft²"}
    ],
    af:[
      {id:"demo", l:"+ Demo piso existente",     p:"+$1.50/ft²"},
      {id:"under",l:"+ Underlayment / base",     p:"+$0.50/ft²"}
    ],
    calcSubKitchen:"Elige acabado y cantidad",
    calcSubFurn:"Elige tipo de pieza y cantidad",
    calcSubFixed:"Selecciona tu opción de servicio",
    calcSubLinear:"Elige tipo de moldura e ingresa longitud (pies)",
    lLinearService:"Tipo de servicio",lLinearLength:"Longitud",lLinearUnit:"Unidad",
    linearOpts:[
      {v:"quote",l:"Molduras y zócalos — Cotización con fotos",p:0}
    ],
    lDoorType:"Acabado de puerta",lDoorQty:"Cantidad de puertas",
    lDrawerS:"Cajones pequeños",lDrawerL:"Cajones grandes",lEndPanels:"Paneles laterales",
    lPieceType:"Tipo de pieza",lPieceQty:"Cantidad",
    kitchenDoorOpts:[{v:"quote",l:"Quote after photos",p:0}],
    kitchenAddons:[],
    furnPieceOpts:[{v:"quote",l:"Quote after photos",p:0}],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Montaje estándar (hasta 65\")",p:150}
      ],
      art:[
        {id:"artHang",l:"Cuadros / Espejos (hasta 5 pcs)",p:150},
        {id:"curtain1",l:"Cortinas — primera ventana",p:150}
      ],
      fur:[
        {id:"furSmall",l:"Artículos pequeños — caben en 2 horas",p:150}
      ],
      plumb:[
        {id:"plFaucet",l:"Cambio menor de accesorio (grifo, ducha, tanque, sellado)",p:150}
      ],
      elec:[
        {id:"elLight",l:"Cambio menor de accesorio (luz, enchufe, timbre/cerradura)",p:150}
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
      kitchScope:"Quote after photos",kitchDesc:"Professional spray finish. Photos required for a written estimate.",
      kitch:[["Kitchen Cabinet Painting","Quote after photos"]],
      kitchProv:"Photos of your kitchen required before estimate",
      kitchN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      furnpScope:"Quote after photos",furnpDesc:"Full preparation, sanding, primer & paint. Photos required for estimate.",
      furnp:[["Furniture Painting","Quote after photos"]],
      furnpProv:"Photos of furniture required before estimate",
      furnpN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      tvScope:"Llamada de servicio · $150",tvDesc:"Incluye hasta 2 horas en sitio. Manejo superficial de cables incluido.",
      tv:[
        ["Montaje estándar (hasta 65\")","$150 llamada de servicio","1–1.5h"],
        ["Cables ocultos / Instalación en pared","Cotización con fotos","2–3h"]
      ],
      tvProv:"Soporte / bracket del TV",
      tvN:"Soporte no incluido. Instalación con cables ocultos cotizada con foto de la pared. Hoyos reparados y pintados.",
      furScope:"Llamada de servicio · $150",furDesc:"Incluye hasta 2 horas. Alcance mayor se cotiza con fotos.",
      fur:[
        ["Ensamblaje de muebles pequeños (estante, mesa, silla)","$150 llamada de servicio","1–2h"],
        ["PAX / Closet grande / Marco de cama / Complejo","Cotización con fotos","varies"]
      ],
      furProv:"Todas las piezas, tornillería e instrucciones",
      furN:"La mayoría de artículos pequeños caben en la llamada de servicio de 2 horas. PAX, conjuntos de varias piezas y partes faltantes se cotizan por escrito antes de comenzar.",
      artScope:"Llamada de servicio · $150",artDesc:"Hasta 5 piezas estándar. Nivelado incluido.",
      art:[
        ["Cuadros / Espejos — hasta 5 piezas","$150 llamada de servicio","1–2h"],
        ["Galería de más de 5 piezas","Cotización con fotos","varies"]
      ],
      artProv:"Herraje, anclajes y soportes",
      artN:"Paredes estándar de drywall / vigas. Galerías >5 piezas se cotizan con fotos.",
      plumbScope:"Llamada de servicio · $150 · Sin permisos",plumbDesc:"Solo reparaciones menores de handyman. Sin líneas nuevas ni plomería estructural.",
      plumb:[
        ["Grifo, ducha, tanque, re-sellado","$150 llamada de servicio","1–3h"]
      ],
      plumbProv:"Accesorio o piezas de repuesto (el cliente provee)",
      plumbN:"Válvulas de cierre deben funcionar. Fuera del alcance cosmético → plomero C-36.",
      elecScope:"Llamada de servicio · $150 · Sin permisos",elecDesc:"Solo reemplazo equivalente en cajas existentes. Sin circuitos nuevos.",
      elec:[
        ["Luminaria, enchufe/interruptor, timbre/cerradura smart","$150 llamada de servicio","1–2.5h"]
      ],
      elecProv:"Luminaria, dispositivo o interruptor",
      elecN:"Ventiladores con nueva caja de soporte → electricista C-10. Sin trabajo de panel ni nuevas líneas.",
      paintScope:"Por pie² · Solo mano de obra",paintDesc:"ft² = superficie pintada (paredes/techo), NO área del piso.",
      pF1:[
        ["Paredes — 1 capa (mismo color)","$3.00/ft²"],
        ["Paredes — 2 capas (cambio de color)","$3.75/ft²"],
        ["Techo — liso (2 capas)","$3.75/ft²"],
        ["Techo — texturizado (2 capas)","$4.25/ft²"],
        ["Molduras, puertas, zócalos","Cotización con fotos"]
      ],
      pF2:[
        ["+ Lijado / capa de imprimación","+$0.65/ft²"],
        ["+ Retiro de tapiz","+$1.25/ft²"],
        ["+ Raspado de pintura vieja (puntual)","+$1.20/ft²"],
        ["+ Tratamiento de moho superficial","+$1.50/ft²"]
      ],
      pF3:[],
      paintProv:"Toda la pintura, imprimación y herramientas",
      paintN:"Visita de estimado $75 → se acredita al inicio. Materiales por cliente, sin margen.",
      flScope:"Por pie² · Solo mano de obra",flDesc:"Rendimiento: 120–250 ft² por día según el producto.",
      flG1:[
        ["Laminado click-lock — solo mano de obra","$3.00/ft²"],
        ["LVP / Vinilo de lujo click — solo mano de obra","$3.00/ft²"],
        ["Demo, underlayment, transiciones, zócalos","Cotización — alcance por escrito"]
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
    artBenefit:"Nivelado. Bien fijado.",
    paintBenefit:"Acabado profesional. Sin derrames.",
    floorBenefit:"Instalación limpia. Escombros retirados.",
    plumbBenefit:"Sin fugas. Accesorios de calidad.",
    elecBenefit:"Cableado seguro. Conforme a códigos.",

    tvBadge:"Más popular",paintBadge:"Posible mismo día",

    comboTitle:"Combina tareas pequeñas en una sola visita",
    comboSub:"Agrega otra tarea mientras estamos — confirmamos el total por escrito antes de llegar.",

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
    heroOfferTitle:"Закажите мастера в Лос-Анджелесе",
    heroOfferSubHtml:'<span class="hero-included-accent">Ответ в тот же день, прозрачные цены и надёжный местный мастер</span><br>Запишитесь онлайн за пару минут или звоните (213) 361-1700 для быстрой сметы',
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
      {id:"paint",name:"Интерьерная покраска",     from:"$3.00/кф"},
      {id:"floor",name:"Напольное покрытие",       from:"$3.00/кф"},
      {id:"tv",   name:"Монтаж ТВ",               from:"$150"},
      {id:"fur",  name:"Сборка мебели",            from:"$150"},
      {id:"art",  name:"Картины, зеркала и декор", from:"$150"},
      {id:"plumb",name:"Сантехника",               from:"$150"},
      {id:"elec", name:"Электрика",                from:"$150"}
    ],
    calcTitle:"Калькулятор площади",
    calcSub:"Введите размеры комнаты → получите цену",
    lSvc:"Услуга",lLen:"Длина (футов)",lWid:"Ширина (футов)",
    lBase:"Плинтуса (пог.фут)",lTrans:"Порожки (шт.)",lDoorU:"Подрезка дверей (шт.)",
    lHrs:"Ориентировочное кол-во часов",anchorBtn:"Рассчитать стоимость",
    lModeRoom:"Комната (Д×Ш)",lModeTotal:"Общая площадь",lSfTotal:"Кв.футов всего",
    lSqftPrice:"Цена за кв.фут",
    lDoorPriceEdit:"Цена за дверь ($)",lPiecePriceEdit:"Цена за шт ($)",lLinearPriceEdit:"Цена за фут ($)",
    univSqftLabel:"Быстрый калькулятор кв.фут",univLinLabel:"Быстрый калькулятор пог.фут",
    univSqftPriceLbl:"$/кф",univSqftAreaLbl:"Площадь (кф)",univLinPriceLbl:"$/пф",univLinLenLbl:"Длина (фут)",
    subFlLam:"Ламинат",subFlLvp:"LVP",
    subTv:"ТВ",subArt:"Картины & Зеркала",subCurtain:"Карнизы",
    subPlumb:"Сантехника",subElec:"Электрика",
    tabP1:"Краска 1сл",tabP2:"Краска 2сл",tabFl:"Пол",tabTrim:"Молдинги",tabTv:"ТВ & Декор",tabFur:"Сборка",tabPlumb:"Сантех & Эл",
    areaTotalHint:"Введите кв.футов",
    areaTotalFmt:(sf)=>`Общая площадь = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привет, Handy & Friend! 👋",
    waEstLabel:"Смета",waTotalLabel:"Итого",
    waHoursDetail:(h)=>`Часов: ~${h}ч`,
    waRoomDetail:(len,wid,sf)=>`Комната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Пожалуйста, подтвердите наличие.",
    opts:[
      {v:"p1",l:"🖌️ Интерьер — 1 слой ($3.00/кф)"},
      {v:"p2",l:"🖌️ Интерьер — 2 слоя ($3.75/кф)"},
      {v:"fl",l:"🏠 Ламинат ($3.00/кф)"},
      {v:"trim",l:"📏 Отделка и Молдинги (за линейный фут)"},
      {v:"tv",l:"📺 Монтаж ТВ"},
      {v:"art",l:"🖼️ Картины & Зеркала"},
      {v:"fur",l:"🛋️ Сборка мебели"},
      {v:"plumb",l:"🚰 Сантехника"},
      {v:"elec",l:"⚡ Электрика"}
    ],
    ap:[
      {id:"prep", l:"+ Подготовка / шлифовка",  p:"+$0.65/кф"},
      {id:"wallp",l:"+ Снятие обоев",            p:"+$1.25/кф"},
      {id:"mold", l:"+ Обработка плесени",       p:"+$1.50/кф"},
      {id:"strip",l:"+ Снятие старой краски",    p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покрытия",       p:"+$1.50/кф"},
      {id:"under",l:"+ Укладка подложки",        p:"+$0.50/кф"}
    ],
    calcSubKitchen:"Выберите покрытие и количество дверей",
    calcSubFurn:"Выберите тип предмета и количество",
    calcSubFixed:"Выберите вариант услуги",
    calcSubLinear:"Выберите тип отделки и введите длину (фут)",
    lLinearService:"Тип отделки",lLinearLength:"Длина",lLinearUnit:"Единица",
    linearOpts:[
      {v:"quote",l:"Молдинги и плинтусы — Смета после фото",p:0}
    ],
    lDoorType:"Покрытие двери",lDoorQty:"Кол-во дверей",
    lDrawerS:"Маленькие ящики",lDrawerL:"Большие ящики",lEndPanels:"Торцевые панели",
    lPieceType:"Тип предмета",lPieceQty:"Количество",
    kitchenDoorOpts:[{v:"quote",l:"Quote after photos",p:0}],
    kitchenAddons:[],
    furnPieceOpts:[{v:"quote",l:"Quote after photos",p:0}],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Стандартный монтаж (до 65\")",p:150}
      ],
      art:[
        {id:"artHang",l:"Картины / Зеркала (до 5 шт.)",p:150},
        {id:"curtain1",l:"Карнизы — первое окно",p:150}
      ],
      fur:[
        {id:"furSmall",l:"Мелкие предметы — умещаются в 2 часа",p:150}
      ],
      plumb:[
        {id:"plFaucet",l:"Мелкий ремонт (смеситель, лейка, бачок, герметизация)",p:150}
      ],
      elec:[
        {id:"elLight",l:"Мелкий ремонт (светильник, розетка, звонок/замок)",p:150}
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
      kitchScope:"Quote after photos",kitchDesc:"Professional spray finish. Photos required for a written estimate.",
      kitch:[["Kitchen Cabinet Painting","Quote after photos"]],
      kitchProv:"Photos of your kitchen required before estimate",
      kitchN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      furnpScope:"Quote after photos",furnpDesc:"Full preparation, sanding, primer & paint. Photos required for estimate.",
      furnp:[["Furniture Painting","Quote after photos"]],
      furnpProv:"Photos of furniture required before estimate",
      furnpN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      tvScope:"Сервисный вызов · $150",tvDesc:"Включает до 2 часов на объекте. Укладка кабелей по поверхности включена.",
      tv:[
        ["Стандартный монтаж (до 65\")","$150 сервисный вызов","1–1.5ч"],
        ["Скрытая проводка / Прокладка в стене","Котировка по фото","2–3ч"]
      ],
      tvProv:"Кронштейн / держатель",
      tvN:"Кронштейн не входит. Скрытая проводка котируется по фото стены. Отверстия зашпаклёваны и покрашены.",
      furScope:"Сервисный вызов · $150",furDesc:"Включает до 2 часов. Бо́льший объём котируется по фото.",
      fur:[
        ["Сборка мелкой мебели (полка, стол, стул)","$150 сервисный вызов","1–2ч"],
        ["PAX / Большой шкаф / Кровать / Сложная сборка","Котировка по фото","varies"]
      ],
      furProv:"Все детали, крепёж и инструкции",
      furN:"Большинство мелких предметов вмещается в 2-часовой сервисный вызов. PAX, несколько предметов и отсутствующие детали — котировка письменно до начала работ.",
      artScope:"Сервисный вызов · $150",artDesc:"До 5 стандартных предметов. Гарантия горизонтали включена.",
      art:[
        ["Картины / Зеркала — до 5 штук","$150 сервисный вызов","1–2ч"],
        ["Галерея более 5 предметов","Котировка по фото","varies"]
      ],
      artProv:"Крепёж, анкеры, кронштейны",
      artN:"Стандартные стены (гипсокартон/балки). Галерея >5 предметов — котировка по фото.",
      plumbScope:"Сервисный вызов · $150 · Без разрешений",plumbDesc:"Только мелкий ремонт хендимена. Без новых линий и черновой сантехники.",
      plumb:[
        ["Смеситель, лейка, бачок, герметизация","$150 сервисный вызов","1–3ч"]
      ],
      plumbProv:"Кран, смеситель или запчасти (клиент обеспечивает)",
      plumbN:"Запорные клапаны должны работать. Всё сверх косметики → направление C-36.",
      elecScope:"Сервисный вызов · $150 · Без разрешений",elecDesc:"Только замена аналогом в существующих коробках. Без новых линий.",
      elec:[
        ["Светильник, розетка/выключатель, умный звонок/замок","$150 сервисный вызов","1–2.5ч"]
      ],
      elecProv:"Светильник, устройство или выключатель",
      elecN:"Вентиляторы с новой опорной коробкой → лицензированный C-10. Без работ на щитке, без новых цепей.",
      paintScope:"За кв.фут · Только работа",paintDesc:"кф = площадь окрашиваемой поверхности (стены/потолок), НЕ площадь пола.",
      pF1:[
        ["Стены — 1 слой (обновление цвета)","$3.00/кф"],
        ["Стены — 2 слоя (смена цвета)","$3.75/кф"],
        ["Потолок — гладкий (2 слоя)","$3.75/кф"],
        ["Потолок — текстурный (2 слоя)","$4.25/кф"],
        ["Молдинги, двери, плинтусы","Смета после фото"]
      ],
      pF2:[
        ["+ Шлифовка / грунтовочный слой","+$0.65/кф"],
        ["+ Снятие обоев","+$1.25/кф"],
        ["+ Снятие старой краски (точечно)","+$1.20/кф"],
        ["+ Обработка поверхности от плесени","+$1.50/кф"]
      ],
      pF3:[],
      paintProv:"Вся краска, грунт и инструменты",
      paintN:"Выезд для оценки $75 → засчитывается в стоимость работ. Материалы — клиент, без наценки.",
      flScope:"За кв.фут · Только работа",flDesc:"Выработка: 120–250 кв.фут в день в зависимости от продукта.",
      flG1:[
        ["Ламинат замковый (click-lock) — только работа","$3.00/кф"],
        ["LVP / Роскошный виниловый ламинат — только работа","$3.00/кф"],
        ["Демонтаж, подложка, порожки, плинтусы","Смета — объём письменно"]
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
    artBenefit:"По уровню. Надёжное крепление.",
    paintBenefit:"Профессиональная отделка. Без пролива.",
    floorBenefit:"Чистая установка. Мусор вывезен.",
    plumbBenefit:"Без протечек. Качественная фурнитура.",
    elecBenefit:"Безопасная проводка. По кодексу.",

    tvBadge:"Самый популярный",paintBadge:"Возможно в тот же день",

    comboTitle:"Совмести несколько задач за один визит",
    comboSub:"Добавь ещё одну задачу, пока мы у тебя — общую стоимость подтверждаем письменно до приезда.",

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
    heroOfferTitle:"Замовте майстра в Лос-Анджелесі",
    heroOfferSubHtml:'<span class="hero-included-accent">Відповідь того ж дня, прозорі ціни та надійний місцевий майстер</span><br>Бронюйте онлайн за кілька хвилин або телефонуйте (213) 361-1700 для швидкого кошторису',
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
      {id:"paint",name:"Інтер'єрне фарбування",       from:"$3.00/кф"},
      {id:"floor",name:"Підлогове покриття",           from:"$3.00/кф"},
      {id:"tv",   name:"Монтаж ТВ",                   from:"$150"},
      {id:"fur",  name:"Збирання меблів",              from:"$150"},
      {id:"art",  name:"Картини, дзеркала та декор",   from:"$150"},
      {id:"plumb",name:"Сантехніка",                   from:"$150"},
      {id:"elec", name:"Електрика",                    from:"$150"}
    ],
    calcTitle:"Калькулятор площі",
    calcSub:"Введіть розміри кімнати → отримайте ціну",
    lSvc:"Послуга",lLen:"Довжина (фут)",lWid:"Ширина (фут)",
    lBase:"Плінтуси (пог.фут)",lTrans:"Поріжки (шт.)",lDoorU:"Підрізання дверей (шт.)",
    lHrs:"Орієнтовна кількість годин",anchorBtn:"Розрахувати вартість",
    lModeRoom:"Кімната (Д×Ш)",lModeTotal:"Загальна площа",lSfTotal:"Кв.фут загалом",
    lSqftPrice:"Ціна за кв.фут",
    lDoorPriceEdit:"Ціна за дверцю ($)",lPiecePriceEdit:"Ціна за шт ($)",lLinearPriceEdit:"Ціна за фут ($)",
    univSqftLabel:"Швидкий калькулятор кв.фут",univLinLabel:"Швидкий калькулятор пог.фут",
    univSqftPriceLbl:"$/кф",univSqftAreaLbl:"Площа (кф)",univLinPriceLbl:"$/пф",univLinLenLbl:"Довжина (фут)",
    subFlLam:"Ламінат",subFlLvp:"LVP",
    subTv:"ТВ",subArt:"Картини & Дзеркала",subCurtain:"Карнизи",
    subPlumb:"Сантехніка",subElec:"Електрика",
    tabP1:"Фарба 1ш",tabP2:"Фарба 2ш",tabFl:"Підлога",tabTrim:"Молдинги",tabTv:"ТВ & Декор",tabFur:"Збирання",tabPlumb:"Сантех & Ел",
    areaTotalHint:"Введіть кв.фут",
    areaTotalFmt:(sf)=>`Загальна площа = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привіт, Handy & Friend! 👋",
    waEstLabel:"Кошторис",waTotalLabel:"Всього",
    waHoursDetail:(h)=>`Годин: ~${h}год`,
    waRoomDetail:(len,wid,sf)=>`Кімната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Просимо підтвердити наявність.",
    opts:[
      {v:"p1",l:"🖌️ Інтер'єр — 1 шар ($3.00/кф)"},
      {v:"p2",l:"🖌️ Інтер'єр — 2 шари ($3.75/кф)"},
      {v:"fl",l:"🏠 Ламінат ($3.00/кф)"},
      {v:"trim",l:"📏 Обладнання та Молдинги (за лінійний фут)"},
      {v:"tv",l:"📺 Монтаж ТВ"},
      {v:"art",l:"🖼️ Картини & Дзеркала"},
      {v:"fur",l:"🛋️ Збирання меблів"},
      {v:"plumb",l:"🚰 Сантехніка"},
      {v:"elec",l:"⚡ Електрика"}
    ],
    ap:[
      {id:"prep", l:"+ Підготовка / шліфування",  p:"+$0.65/кф"},
      {id:"wallp",l:"+ Зняття шпалер",            p:"+$1.25/кф"},
      {id:"mold", l:"+ Обробка плісняви",         p:"+$1.50/кф"},
      {id:"strip",l:"+ Зняття старої фарби",      p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покриття",        p:"+$1.50/кф"},
      {id:"under",l:"+ Укладання підкладки",      p:"+$0.50/кф"}
    ],
    calcSubKitchen:"Оберіть покриття та кількість дверей",
    calcSubFurn:"Оберіть тип предмета та кількість",
    calcSubFixed:"Оберіть варіант послуги",
    calcSubLinear:"Оберіть тип молдингу та введіть довжину (фут)",
    lLinearService:"Тип роботи",lLinearLength:"Довжина",lLinearUnit:"Одиниця",
    linearOpts:[
      {v:"quote",l:"Молдинги та плінтуси — Кошторис після фото",p:0}
    ],
    lDoorType:"Покриття дверей",lDoorQty:"Кількість дверей",
    lDrawerS:"Маленькі ящики",lDrawerL:"Великі ящики",lEndPanels:"Торцеві панелі",
    lPieceType:"Тип предмета",lPieceQty:"Кількість",
    kitchenDoorOpts:[{v:"quote",l:"Quote after photos",p:0}],
    kitchenAddons:[],
    furnPieceOpts:[{v:"quote",l:"Quote after photos",p:0}],
    fixedOpts:{
      tv:[
        {id:"tvStd",l:"Стандартний монтаж (до 65\")",p:150}
      ],
      art:[
        {id:"artHang",l:"Картини / Дзеркала (до 5 шт.)",p:150},
        {id:"curtain1",l:"Карнизи — перше вікно",p:150}
      ],
      fur:[
        {id:"furSmall",l:"Дрібні предмети — вміщуються в 2 години",p:150}
      ],
      plumb:[
        {id:"plFaucet",l:"Дрібний ремонт (змішувач, лійка, бачок, герметизація)",p:150}
      ],
      elec:[
        {id:"elLight",l:"Дрібний ремонт (світильник, розетка, дзвінок/замок)",p:150}
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
      kitchScope:"Quote after photos",kitchDesc:"Professional spray finish. Photos required for a written estimate.",
      kitch:[["Kitchen Cabinet Painting","Quote after photos"]],
      kitchProv:"Photos of your kitchen required before estimate",
      kitchN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      furnpScope:"Quote after photos",furnpDesc:"Full preparation, sanding, primer & paint. Photos required for estimate.",
      furnp:[["Furniture Painting","Quote after photos"]],
      furnpProv:"Photos of furniture required before estimate",
      furnpN:"Send photos and we provide a written quote. Scope and price confirmed in writing before work starts.",
      tvScope:"Сервісний виклик · $150",tvDesc:"Включає до 2 годин на об'єкті. Укладання кабелів по поверхні включено.",
      tv:[
        ["Стандартний монтаж (до 65\")","$150 сервісний виклик","1–1.5год"],
        ["Прихована проводка / Прокладання в стіні","Котировка по фото","2–3год"]
      ],
      tvProv:"Кронштейн / тримач для ТВ",
      tvN:"Кронштейн не входить. Прихована проводка котирується по фото стіни. Отвори зашпакльовані та пофарбовані.",
      furScope:"Сервісний виклик · $150",furDesc:"Включає до 2 годин. Більший обсяг котирується по фото.",
      fur:[
        ["Збирання дрібних меблів (полиця, стіл, стілець)","$150 сервісний виклик","1–2год"],
        ["PAX / Велика шафа / Ліжко / Складне збирання","Котировка по фото","varies"]
      ],
      furProv:"Всі деталі, кріплення та інструкції",
      furN:"Більшість дрібних предметів вміщується в 2-годинний сервісний виклик. PAX, кілька предметів та відсутні деталі — котировка письмово до початку робіт.",
      artScope:"Сервісний виклик · $150",artDesc:"До 5 стандартних предметів. Гарантія горизонталі включена.",
      art:[
        ["Картини / Дзеркала — до 5 штук","$150 сервісний виклик","1–2год"],
        ["Галерея більше 5 предметів","Котировка по фото","varies"]
      ],
      artProv:"Кріплення, анкери, кронштейни",
      artN:"Стандартні стіни (гіпсокартон/балки). Галерея >5 предметів — котировка по фото.",
      plumbScope:"Сервісний виклик · $150 · Без дозволів",plumbDesc:"Тільки дрібний ремонт хендімена. Без нових ліній та чорнової сантехніки.",
      plumb:[
        ["Змішувач, лійка, бачок, герметизація","$150 сервісний виклик","1–3год"]
      ],
      plumbProv:"Кран, змішувач або запчастини (клієнт забезпечує)",
      plumbN:"Запірні клапани мають працювати. Все що виходить за косметику → направлення C-36.",
      elecScope:"Сервісний виклик · $150 · Без дозволів",elecDesc:"Тільки заміна аналогом в існуючих коробках. Без нових ліній.",
      elec:[
        ["Світильник, розетка/вимикач, розумний дзвінок/замок","$150 сервісний виклик","1–2.5год"]
      ],
      elecProv:"Світильник, пристрій або вимикач",
      elecN:"Стельові вентилятори з новою опорною коробкою → ліцензований C-10. Без робіт на щитку, без нових ліній.",
      paintScope:"За кв.фут · Тільки робота",paintDesc:"кф = площа поверхні фарбування (стіни/стеля), НЕ площа підлоги.",
      pF1:[
        ["Стіни — 1 шар (оновлення кольору)","$3.00/кф"],
        ["Стіни — 2 шари (зміна кольору)","$3.75/кф"],
        ["Стеля — гладка (2 шари)","$3.75/кф"],
        ["Стеля — текстурна (2 шари)","$4.25/кф"],
        ["Молдинги, двері, плінтуси","Кошторис після фото"]
      ],
      pF2:[
        ["+ Шліфування / ґрунтувальний шар","+$0.65/кф"],
        ["+ Зняття шпалер","+$1.25/кф"],
        ["+ Зняття старої фарби (точково)","+$1.20/кф"],
        ["+ Обробка поверхні від плісняви","+$1.50/кф"]
      ],
      pF3:[],
      paintProv:"Вся фарба, ґрунт та інструменти",
      paintN:"Виїзд для оцінки $75 → зараховується у вартість робіт. Матеріали — клієнт, без націнки.",
      flScope:"За кв.фут · Тільки робота",flDesc:"Виробіток: 120–250 кв.фут на день залежно від продукту.",
      flG1:[
        ["Ламінат замковий (click-lock) — тільки робота","$3.00/кф"],
        ["LVP / Розкішний вініловий ламінат — тільки робота","$3.00/кф"],
        ["Демонтаж, підкладка, поріжки, плінтуси","Кошторис — обсяг письмово"]
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
    artBenefit:"По рівню. Надійне кріплення.",
    paintBenefit:"Професійна обробка. Без розливів.",
    floorBenefit:"Чисте встановлення. Сміття вивезено.",
    plumbBenefit:"Без протіканння. Якісна фурнітура.",
    elecBenefit:"Безпечна проводка. За кодексом.",

    tvBadge:"Найпопулярніший",paintBadge:"Можна в той же день",

    comboTitle:"Поєднай кілька завдань за один візит",
    comboSub:"Додай ще одне завдання, поки ми у тебе — загальну вартість підтверджуємо письмово до приїзду.",

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
    heroBtnCall:'📞 Call Now — Free Quote',
    heroBtnWA:'💬 WhatsApp',
    heroBtnQuote:'📋 Get Quote in 2 Min',
    barCall:'Call',
    barMessage:'Message',
    heroResponseNote:'⏰ We respond within 1 hour during business hours (8am-8pm PT)',
    urgencyChip:'⚡ Trusted by homeowners across Los Angeles',
    urgencyTitle:'🎯 Book Your Service Today',
    urgencySub:'Clear pricing • Written quotes • Same-Day Response • Central LA service area',
    urgencyBtn:'✅ Book Your Service Now',
    whyTitle:'Why Choose Handy & Friend?',
    painLabel:'❌ Pain Point',
    promiseLabel:'✅ Our Promise',
    pain1Title:"Contractors don't show up",
    pain1Sub:"You're left hanging. Wasted time.",
    promise1Title:'100% Reliability',
    promise1Sub:'We show up on time. Every appointment.',
    pain2Title:'Hidden fees surprise you',
    pain2Sub:'Final bill is 2x the quote.',
    promise2Title:'Upfront Transparent Pricing',
    promise2Sub:'No surprises. What you see is what you pay.',
    pain3Title:'Poor quality finish',
    pain3Sub:'Work looks sloppy. Frustrating.',
    promise3Title:'Professional Quality',
    promise3Sub:'Clean work. Clear scope. Local team.',
    servicesTitle:'Services',
    serviceTv:'TV Mounting',
    serviceFurniture:'Furniture Assembly',
    serviceArt:'Art & Mirrors',
    servicePainting:'Painting',
    serviceFlooring:'Flooring',
    servicePlumbing:'Plumbing',
    serviceElectrical:'Electrical',
    stickyCall:'Call 213-361-1700',
    testimonialsTitle:'Sample Customer Experiences',
    testimonialsSub:'Illustrative only — real verified reviews coming with our Google Business launch.',
    review1:'"Amazing service! Fixed my TV mounting in 1 hour. Professional and quick. Highly recommend!"',
    review2:'"Upfront pricing and clear scope from start to finish. Showed up on time, cleaned up after."',
    review3:'"Perfect furniture assembly! On time, clean, and super reliable. Will call again."',
    leadTitle:'Ready to Book Your Service?',
    leadSub:'Phone and chat quotes are free. Service Call $150 includes up to 2 hours.',
    leadNamePlaceholder:'Your Name',
    leadEmailPlaceholder:'Your Email',
    leadPhonePlaceholder:'Phone Number (e.g. 310-555-0100)',
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
    formSuccessSub:'We respond within 1 hour during business hours (8am-8pm PT).',
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
    faqA1:'We respond within 1 hour during business hours (8am-8pm PT). For urgent same-day service, call 213-361-1700 directly.',
    faqQ2:'Do you charge for estimates/quotes?',
    faqA2:'Phone and chat quotes are free. On-site estimates: $75, credited toward your project when you book.',
    faqQ3:'Are you insured?',
    faqA3:'We carry General Liability Insurance. Work terms and service limits are explained before booking.',
    faqQ4:"What if I'm not satisfied with the work?",
    faqA4:"If you're unhappy with the work, tell us within 7 days and we'll come back and fix it at no extra cost. Your feedback is always welcome.",
    faqQ5:'Do you offer weekend or after-hours service?',
    faqA5:'Yes! We offer flexible scheduling. Call 213-361-1700 to arrange weekend or evening appointments.',
    faqQ6:'What payment methods do you accept?',
    faqA6:'We accept cash, Venmo, PayPal, and all major credit cards. Payment is due upon completion of work.',
    map_title:'Our Service Area',
    map_subtitle:'Serving Los Angeles, Hollywood, West Hollywood, Beverly Hills & Santa Monica',
    finalCtaTitle:"Don't Wait-Book Your Handyman Today",
    finalCtaSub:'Professional service across Los Angeles with clear, upfront scope.',
    finalCtaWhatsApp:'💬 Message on WhatsApp',
    finalCtaMessenger:'💬 Facebook Messenger',
    finalCtaCall:'📞 Call Now',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> provides home repair services up to $1,000 (labor only). Services include TV mounting, furniture assembly, painting, flooring, plumbing, electrical, and art hanging. For work exceeding $1,000, structural modifications, permits, or trade-regulated requirements, consult a trade contractor. We carry General Liability Insurance. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Call 213-361-1700</a></strong> for details.',
    copyDone:'✓ Copied!',
    smsPhoneRequired:'Please provide your phone number',
    smsConsentRequired:'Please agree to receive SMS',
    smsSendError:'Error sending SMS. Please try again.',
    smsNetworkError:'Network error. Please try again.',
    leadSubmitError:'Error submitting form. Please call 213-361-1700 directly.',
    fhsTitle:'More Than Just These Services',
    fhsSub:'From a loose doorknob to a full room refresh — one call, one team, most indoor repairs.',
    fhsItem1:'General Repairs',
    fhsItem2:'Electrical Help',
    fhsItem3:'Plumbing Fixes',
    fhsItem4:'Touch-Up Painting',
    fhsItem5:'Door & Lock Install',
    fhsItem6:'Mirror & Art Hanging',
    fhsItem7:'Delivery & Setup',
    fhsCtaText:"Not sure we do it? Text a photo or description and we'll quote it fast.",
    hiwTitle:'How It Works',
    hiwSub:'Three simple steps, no surprises.',
    hiwStep1Title:'Call or Text',
    hiwStep1Desc:'Describe what you need. Photo helps. Most quotes in 15 minutes.',
    hiwStep2Title:'Get a Clear Price',
    hiwStep2Desc:'Written price before work starts. No hidden fees.',
    hiwStep3Title:'We Show Up & Fix It',
    hiwStep3Desc:'Same-day or next-day across central LA.',
    moreServicesStrip:'TV mounting · drywall · assembly · electrical · plumbing · painting · doors · and more',
    heroEyebrowV2:"Los Angeles · Text a Photo · 15-Min Flat Quote",
    heroTitleV2:"Service Call $150 · Up to 2 Hours · $75/hr After",
    heroSubV2:"Text a photo, get a flat quote in 15 minutes. Same-day handyman across central LA. English · Español · Русский · עברית.",
    heroCallBtn:"Call (213) 361-1700",
    heroTextBtn:"Text Photo for Quote",
    urgencyStripV2:"⚡ 3 same-day slots left this week · Text now for your 15-min quote",
    serviceGridTitle:"Simple Pricing. Written Scope.",
    serviceGridSub:"LA-wide handyman help with clear upfront pricing.",
    svcTvTitle:"TV Mounting",svcTvPrice:"$150 service call",svcTvDesc:"Standard mount on any wall. Surface cable mgmt included.",
    svcDwTitle:"Drywall Repair",svcDwPrice:"$150 service call",svcDwDesc:"Small patches, texture matching, primer included.",
    svcFaTitle:"Furniture Assembly",svcFaPrice:"$150 service call",svcFaDesc:"IKEA, Wayfair, Amazon. Most pieces fit in 2 hours.",
    svcDoorTitle:"Door Installation",svcDoorPrice:"Quote after photos",svcDoorDesc:"Interior, prehung, exterior, smart locks. Send photos for written quote.",
    svcPaintTitle:"Interior Painting",svcPaintPrice:"Quote after photos",svcPaintDesc:"Walls, ceilings, trim. $3/sf labor estimate on painting page.",
    svcArtTitle:"Art & Mirror Hanging",svcArtPrice:"$150 service call",svcArtDesc:"Up to 5 pieces. Level-checked, properly secured, any wall type.",
    pppTitle:"Tired of Bad Handyman Experiences?",
    ppp1Pain:"Contractor no-shows",ppp1Promise:"Text confirmation 2 hours before",
    ppp2Pain:"Hidden fees and surprises",ppp2Promise:"Flat price in writing before visit",
    ppp3Pain:"Sloppy, rushed finish",ppp3Promise:"We don't leave until you approve",
    ppp4Pain:"No cleanup after the job",ppp4Promise:"Drop cloths + vacuum included",
    ppp5Pain:"Wrong tools, extra trips",ppp5Promise:"We bring everything",
    ppp6Pain:"Can't reach them after",ppp6Promise:"Same-number warranty — just text us",
    ownerTitle:"Who You're Hiring",
    ownerBody:"Handy & Friend is a small local team — solo operator with one helper for bigger jobs. We do most work ourselves and answer our own phone. If something goes wrong, you call us directly. 12+ years fixing LA homes.",
    neighborhoodsTitle:"Serving Central Los Angeles",
    neighborhoodsSub:"Same-day service across these neighborhoods and nearby areas:",
    doneRightTitle:"The Done-Right Promise",
    doneRightBody:"If the work isn't right, we come back and fix it at no extra cost. 1-year on workmanship. If we can't finish what we quoted, you don't pay for it.",
    mobileStickyCall:"Call",mobileStickyText:"Text",mobileStickyPrice:"Pricing",
    faqNewQ1:"How fast can you come?",
    faqNewA1:"Most requests get a same-day or next-day slot. Text us a photo and we confirm within 15 minutes during Mon-Sat 8am-7pm.",
    faqNewQ2:"Are you insured?",
    faqNewA2:"Yes — General Liability Insurance. We're a small local team; we handle minor handyman jobs under $500 labor. For anything bigger or requiring permits, we refer you to a trade contractor.",
    faqNewQ3:"How does your pricing work?",
    faqNewA3:"Our service call is $150 and includes up to 2 hours on-site for the agreed scope. Additional labor is $75/hour. Materials, parking, and disposal are extra only when confirmed in writing before work starts.",
    faqNewQ4:"Do you work weekends and same-day?",
    faqNewA4:"Yes — Mon to Sat 8am to 7pm. Same-day and next-day availability most weeks. Sunday by special request only.",
    faqNewQ5:"Do you bring your own tools?",
    faqNewA5:"Yes — drill, mounts, anchors, drop cloths, paint, even spackling. You don't have to buy anything.",
    faqNewQ6:"Do I have to be home for the quote?",
    faqNewA6:"No — text us a photo or a short description. Most quotes come back within 15 minutes. Onsite visit only when needed.",
    faqNewQ7:"Do you clean up after the job?",
    faqNewA7:"Always. Drop cloths go down before work, trash and dust go out when we leave. Vacuum included.",
    faqNewQ8:"How do I pay?",
    faqNewA8:"Cash, Zelle, Venmo, or credit/debit card. Payment is due after the job is done and you're happy with it.",
    faqNewQ9:"What if something breaks after?",
    faqNewA9:"We stand behind our work for 1 year. Just text us and we come back. Same-number warranty — no runaround.",
    faqNewQ10:"Do you speak Spanish or Russian?",
    faqNewA10:"Yes — our team speaks English, Spanish, Russian, and Hebrew."
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
    heroBtnCall:'📞 Llamar — Cotización gratis',
    heroBtnWA:'💬 WhatsApp',
    heroBtnQuote:'📋 Cotización en 2 min',
    barCall:'Llamar',
    barMessage:'Mensaje',
    heroResponseNote:'⏰ Respondemos en 1 hora durante horario laboral (8am-8pm PT)',
    urgencyChip:'⚡ Con la confianza de hogares en Los Angeles',
    urgencyTitle:'🎯 Reserva tu servicio hoy',
    urgencySub:'Precios claros • Cotizacion por escrito • Respuesta el mismo dia • Area de servicio central de LA',
    urgencyBtn:'✅ Reserva tu lugar ahora',
    whyTitle:'Por que elegir Handy & Friend?',
    painLabel:'❌ Problema',
    promiseLabel:'✅ Nuestra promesa',
    pain1Title:'Los contratistas no llegan',
    pain1Sub:'Te dejan esperando. Tiempo perdido.',
    promise1Title:'100% confiabilidad',
    promise1Sub:'Llegamos a tiempo. En cada cita.',
    pain2Title:'Cargos ocultos sorpresa',
    pain2Sub:'La factura final sale al doble.',
    promise2Title:'Precios transparentes desde el inicio',
    promise2Sub:'Sin sorpresas. Pagas lo que ves.',
    pain3Title:'Acabado de mala calidad',
    pain3Sub:'Trabajo descuidado y frustrante.',
    promise3Title:'Calidad profesional',
    promise3Sub:'Trabajo limpio. Alcance claro. Equipo local.',
    servicesTitle:'Servicios',
    serviceTv:'Montaje de TV',
    serviceFurniture:'Ensamblaje de muebles',
    serviceArt:'Arte y espejos',
    servicePainting:'Pintura',
    serviceFlooring:'Pisos',
    servicePlumbing:'Plomeria',
    serviceElectrical:'Electrico',
    stickyCall:'Llamar 213-361-1700',
    testimonialsTitle:'Experiencias ilustrativas de clientes',
    testimonialsSub:'Solo de ejemplo — las reseñas verificadas reales llegan con el lanzamiento de nuestro Google Business.',
    review1:'"Servicio increible. Montaron mi TV en 1 hora. Profesional y rapido. Super recomendado."',
    review2:'"Precio claro y alcance bien definido de principio a fin. Llegaron a tiempo y dejaron todo limpio."',
    review3:'"Armado de muebles perfecto. Llegaron a tiempo, limpios y muy confiables. Llamare de nuevo."',
    leadTitle:'Listo para reservar tu servicio?',
    leadSub:'Las cotizaciones por teléfono y chat son gratis. El servicio comienza en $150.',
    leadNamePlaceholder:'Tu nombre',
    leadEmailPlaceholder:'Tu correo',
    leadPhonePlaceholder:'Numero de telefono (ej. 310-555-0100)',
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
    formSuccessSub:'Respondemos en 1 hora durante horario laboral (8am-8pm PT).',
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
    faqA1:'Respondemos en 1 hora durante horario laboral (8am-8pm PT). Para servicio urgente el mismo dia, llama al 213-361-1700.',
    faqQ2:'Cobran por estimados o cotizaciones?',
    faqA2:'Las cotizaciones por telefono y chat son gratis. Estimado en sitio: $75, acreditado al contratar.',
    faqQ3:'Estan asegurados?',
    faqA3:'Si. Tenemos Seguro de Responsabilidad General. Todo trabajo esta garantizado.',
    faqQ4:'Que pasa si no quedo satisfecho?',
    faqA4:'Si no quedas conforme con el trabajo, avisanos dentro de 7 dias y regresamos a corregirlo sin costo extra.',
    faqQ5:'Ofrecen servicio en fin de semana o fuera de horario?',
    faqA5:'Si. Ofrecemos horarios flexibles. Llama al 213-361-1700 para coordinar.',
    faqQ6:'Que metodos de pago aceptan?',
    faqA6:'Aceptamos efectivo, Venmo, PayPal y tarjetas principales. El pago se realiza al finalizar.',
    map_title:'Nuestra area de servicio',
    map_subtitle:'Servimos Los Angeles, Hollywood, West Hollywood, Beverly Hills y Santa Monica',
    finalCtaTitle:'No esperes-Reserva tu handyman hoy',
    finalCtaSub:'Servicio profesional en Los Angeles con alcance y precio claros.',
    finalCtaWhatsApp:'💬 Escribir por WhatsApp',
    finalCtaMessenger:'💬 Facebook Messenger',
    finalCtaCall:'📞 Llamar ahora',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> ofrece servicios de reparacion del hogar hasta $1,000 (solo mano de obra). Incluye montaje de TV, ensamblaje de muebles, pintura, pisos, plomeria, electrico y colgado de arte. Para trabajos mayores a $1,000, modificaciones estructurales, permisos o requisitos de licencia, consulta a un contratista con licencia. Tenemos seguro de responsabilidad civil. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Llama al 213-361-1700</a></strong> para mas detalles.',
    copyDone:'✓ Copiado',
    smsPhoneRequired:'Ingresa tu numero de telefono',
    smsConsentRequired:'Debes aceptar recibir SMS',
    smsSendError:'Error al enviar SMS. Intentalo de nuevo.',
    smsNetworkError:'Error de red. Intentalo de nuevo.',
    leadSubmitError:'Error al enviar el formulario. Llama al 213-361-1700.',
    fhsTitle:'Mas que solo estos servicios',
    fhsSub:'De una manija suelta a una habitacion renovada — una llamada, un equipo, la mayoria de reparaciones interiores.',
    fhsItem1:'Reparaciones generales',
    fhsItem2:'Ayuda electrica',
    fhsItem3:'Arreglos de plomeria',
    fhsItem4:'Retoques de pintura',
    fhsItem5:'Puertas y cerraduras',
    fhsItem6:'Espejos y cuadros',
    fhsItem7:'Entrega y montaje',
    fhsCtaText:'No estas seguro? Envia una foto o descripcion y te cotizamos rapido.',
    hiwTitle:'Como funciona',
    hiwSub:'Tres pasos simples, sin sorpresas.',
    hiwStep1Title:'Llama o escribe',
    hiwStep1Desc:'Describe lo que necesitas. Una foto ayuda. Cotizacion en 15 minutos.',
    hiwStep2Title:'Precio claro',
    hiwStep2Desc:'Precio por escrito antes de comenzar. Sin sorpresas.',
    hiwStep3Title:'Llegamos y lo arreglamos',
    hiwStep3Desc:'El mismo dia o al dia siguiente en el centro de LA.',
    moreServicesStrip:'Montaje de TV · drywall · muebles · electrico · plomeria · pintura · puertas · y mas',
    heroEyebrowV2:"Los Ángeles · Envía una foto · Cotización fija en 15 min",
    heroTitleV2:"Llamada de servicio $150 · 2 horas incl. · $75/hr después",
    heroSubV2:"Envía una foto por SMS y cotizamos en 15 minutos. Handyman el mismo día en el centro de LA. English · Español · Русский · עברית.",
    heroCallBtn:"Llama al (213) 361-1700",
    heroTextBtn:"Envía foto para cotizar",
    urgencyStripV2:"⚡ Quedan 3 cupos para hoy esta semana · Escríbenos ahora y cotizamos en 15 min",
    serviceGridTitle:"Precio simple. Por escrito.",
    serviceGridSub:"Ayuda de handyman en todo LA con precios claros desde el inicio.",
    svcTvTitle:"Montaje de TV",svcTvPrice:"$150 llamada de servicio",svcTvDesc:"Estándar en drywall o estructura. Soporte en cable incluido. Instalación con cables ocultos: cotización con fotos.",
    svcDwTitle:"Reparación de drywall",svcDwPrice:"$150 llamada de servicio",svcDwDesc:"Parches pequeños hasta 6\". Parches mayores o daño por agua: cotización con fotos.",
    svcFaTitle:"Armado de muebles",svcFaPrice:"$150 llamada de servicio",svcFaDesc:"IKEA, Wayfair, Amazon. Piezas pequeñas a medianas que caben en 2 horas. PAX/Elfa o piezas múltiples: cotización.",
    svcDoorTitle:"Instalación de puertas",svcDoorPrice:"Cotización con fotos",svcDoorDesc:"Interior, prehung, exterior, cerraduras inteligentes.",
    svcPaintTitle:"Pintura interior",svcPaintPrice:"$3/sf labor estimate",svcPaintDesc:"Paredes, techos, molduras, retoques. Estimado de proyecto — solo mano de obra, materiales aparte.",
    svcArtTitle:"Cuadros y espejos",svcArtPrice:"$150 llamada de servicio",svcArtDesc:"Hasta 5 piezas estándar. Nivelados, bien fijados, cualquier tipo de pared.",
    pppTitle:"¿Cansado de malas experiencias con handymen?",
    ppp1Pain:"Contratistas que no llegan",ppp1Promise:"Confirmación por SMS 2 horas antes",
    ppp2Pain:"Cargos ocultos y sorpresas",ppp2Promise:"Precio fijo por escrito antes de la visita",
    ppp3Pain:"Trabajo apurado y descuidado",ppp3Promise:"No nos vamos hasta que tú lo apruebes",
    ppp4Pain:"No limpian al terminar",ppp4Promise:"Lonas protectoras + aspirado incluidos",
    ppp5Pain:"Herramientas faltantes, idas y vueltas",ppp5Promise:"Llegamos con todo",
    ppp6Pain:"No contestan después",ppp6Promise:"Garantía al mismo número — solo escríbenos",
    ownerTitle:"Con quién trabajas",
    ownerBody:"Handy & Friend es un equipo local pequeño — operador independiente con un ayudante para trabajos más grandes. Hacemos el trabajo nosotros mismos y contestamos nuestro propio teléfono. Si algo sale mal, nos llamas directamente. 12+ años arreglando casas en LA.",
    neighborhoodsTitle:"Servimos el centro de Los Ángeles",
    neighborhoodsSub:"Servicio el mismo día en estos vecindarios y zonas cercanas:",
    doneRightTitle:"Nuestra promesa: trabajo bien hecho",
    doneRightBody:"Si el trabajo no queda bien, volvemos y lo arreglamos sin costo extra. 1 año de garantía en mano de obra. Si no terminamos lo cotizado, no lo pagas.",
    mobileStickyCall:"Llamar",mobileStickyText:"SMS",mobileStickyPrice:"Precios",
    faqNewQ1:"¿Qué tan rápido pueden venir?",
    faqNewA1:"La mayoría de las solicitudes recibe un cupo el mismo día o al día siguiente. Envíanos una foto por SMS y confirmamos en 15 minutos, lunes a sábado de 8am a 7pm.",
    faqNewQ2:"¿Tienen seguro?",
    faqNewA2:"Sí — seguro de responsabilidad civil (General Liability). Somos un equipo local pequeño; nos encargamos de trabajos menores de handyman con mano de obra de menos de $500. Para trabajos más grandes o que requieran permisos, te referimos a un contratista con licencia.",
    faqNewQ3:"¿Cuál es el trabajo mínimo?",
    faqNewA3:"Llamada de servicio: $150, incluye hasta 2 horas en sitio para el trabajo acordado. Tiempo adicional: $75/hora, solo cuando se aprueba por escrito. Los materiales son extra únicamente cuando se especifican por escrito antes de comenzar.",
    faqNewQ4:"¿Trabajan fines de semana y el mismo día?",
    faqNewA4:"Sí — de lunes a sábado de 8am a 7pm. La mayoría de las semanas tenemos disponibilidad el mismo día o al día siguiente. Los domingos solo por pedido especial.",
    faqNewQ5:"¿Traen sus propias herramientas?",
    faqNewA5:"Sí — taladro, soportes, anclajes, lonas, pintura e incluso masilla. No tienes que comprar nada.",
    faqNewQ6:"¿Tengo que estar en casa para la cotización?",
    faqNewA6:"No — envíanos una foto o una breve descripción por SMS. La mayoría de las cotizaciones llegan en 15 minutos. Visita en persona solo cuando es necesario.",
    faqNewQ7:"¿Limpian al terminar?",
    faqNewA7:"Siempre. Ponemos lonas antes de empezar y al irnos nos llevamos la basura y el polvo. Aspirado incluido.",
    faqNewQ8:"¿Cómo se paga?",
    faqNewA8:"Efectivo, Zelle, Venmo o tarjeta de crédito/débito. El pago se realiza al terminar el trabajo, cuando estés conforme.",
    faqNewQ9:"¿Qué pasa si algo se daña después?",
    faqNewA9:"Respaldamos nuestro trabajo por 1 año. Solo escríbenos y volvemos. Garantía al mismo número — sin vueltas.",
    faqNewQ10:"¿Hablan español o ruso?",
    faqNewA10:"Sí — nuestro equipo habla inglés, español, ruso y hebreo."
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
    heroBtnCall:'📞 Позвонить — бесплатно',
    heroBtnWA:'💬 WhatsApp',
    heroBtnQuote:'📋 Расчёт за 2 мин',
    barCall:'Звонок',
    barMessage:'Сообщение',
    heroResponseNote:'⏰ Отвечаем в течение 1 часа в рабочие часы (8am-8pm PT)',
    urgencyChip:'⚡ Нам доверяют клиенты по всему Лос-Анджелесу',
    urgencyTitle:'🎯 Забронируйте услугу сегодня',
    urgencySub:'Прозрачные цены • Письменная смета • Ответ в тот же день • Центр Лос-Анджелеса',
    urgencyBtn:'✅ Забронировать сейчас',
    whyTitle:'Почему выбирают Handy & Friend?',
    painLabel:'❌ Проблема',
    promiseLabel:'✅ Наше обещание',
    pain1Title:'Подрядчики не приезжают',
    pain1Sub:'Вы теряете время в ожидании.',
    promise1Title:'100% надежность',
    promise1Sub:'Приезжаем вовремя. На каждую встречу.',
    pain2Title:'Скрытые доплаты',
    pain2Sub:'Итоговый счет в 2 раза выше.',
    promise2Title:'Прозрачная цена заранее',
    promise2Sub:'Без сюрпризов. Платите то, что видите.',
    pain3Title:'Плохое качество',
    pain3Sub:'Небрежная работа и разочарование.',
    promise3Title:'Профессиональное качество',
    promise3Sub:'Чистая работа. Ясный объём. Местная команда.',
    servicesTitle:'Услуги',
    serviceTv:'Монтаж ТВ',
    serviceFurniture:'Сборка мебели',
    serviceArt:'Картины и зеркала',
    servicePainting:'Покраска',
    serviceFlooring:'Полы',
    servicePlumbing:'Сантехника',
    serviceElectrical:'Электрика',
    stickyCall:'Позвонить 213-361-1700',
    testimonialsTitle:'Примеры клиентских историй',
    testimonialsSub:'Только для иллюстрации — настоящие проверенные отзывы появятся после запуска Google Business.',
    review1:'"Отличный сервис! Смонтировали ТВ за 1 час. Профессионально и быстро."',
    review2:'"Прозрачные цены и понятный объём работ от начала до конца. Приехали вовремя, всё убрали после себя."',
    review3:'"Идеальная сборка мебели! Вовремя, чисто, очень надёжно. Обращусь снова."',
    leadTitle:'Готовы забронировать услугу?',
    leadSub:'Оценка по телефону и в чате бесплатна. Сервисный вызов — $150.',
    leadNamePlaceholder:'Ваше имя',
    leadEmailPlaceholder:'Ваш email',
    leadPhonePlaceholder:'Телефон (например 310-555-0100)',
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
    formSuccessSub:'Отвечаем в течение 1 часа в рабочие часы (8am-8pm PT).',
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
    faqA1:'Отвечаем в течение 1 часа в рабочие часы (8am-8pm PT). Для срочных задач звоните 213-361-1700.',
    faqQ2:'Вы берете плату за смету?',
    faqA2:'Нет. Все сметы бесплатные. Прозрачные цены без скрытых платежей.',
    faqQ3:'У вас есть страховка?',
    faqA3:'Да. У нас есть страхование общей ответственности (General Liability Insurance). Условия и объём работ обсуждаются до начала.',
    faqQ4:'Что если я недоволен работой?',
    faqA4:'Если работа не устроит, сообщите нам в течение 7 дней — приедем и исправим без доплат.',
    faqQ5:'Работаете по выходным и вечером?',
    faqA5:'Да. Предлагаем гибкий график. Позвоните по номеру 213-361-1700.',
    faqQ6:'Какие способы оплаты принимаете?',
    faqA6:'Принимаем наличные, Venmo, PayPal и основные банковские карты.',
    map_title:'Зона обслуживания',
    map_subtitle:'Обслуживаем Лос-Анджелес, Голливуд, Вест-Голливуд, Беверли-Хиллз и Санта-Монику',
    finalCtaTitle:'Не откладывайте-забронируйте мастера сегодня',
    finalCtaSub:'Профессиональный сервис по Лос-Анджелесу с понятным объёмом работ и ценой.',
    finalCtaWhatsApp:'💬 Написать в WhatsApp',
    finalCtaMessenger:'💬 Facebook Messenger',
    finalCtaCall:'📞 Позвонить',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> выполняет домашние ремонты до $1,000 (только работа). Включая монтаж ТВ, сборку мебели, покраску, полы, сантехнику, электрику и навес картин. Для работ свыше $1,000, конструктивных изменений, разрешений или лицензируемых задач обратитесь к лицензированному подрядчику. У нас есть страхование ответственности. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Позвоните 213-361-1700</a></strong> для деталей.',
    copyDone:'✓ Скопировано',
    smsPhoneRequired:'Введите номер телефона',
    smsConsentRequired:'Нужно согласиться на получение SMS',
    smsSendError:'Ошибка отправки SMS. Попробуйте снова.',
    smsNetworkError:'Сетевая ошибка. Попробуйте снова.',
    leadSubmitError:'Ошибка отправки формы. Позвоните 213-361-1700.',
    fhsTitle:'Больше чем просто эти услуги',
    fhsSub:'От шатающейся дверной ручки до обновления комнаты — один звонок, одна бригада, почти любые домашние работы.',
    fhsItem1:'Общий ремонт',
    fhsItem2:'Электрика',
    fhsItem3:'Сантехника',
    fhsItem4:'Подкраска',
    fhsItem5:'Двери и замки',
    fhsItem6:'Зеркала и картины',
    fhsItem7:'Доставка и сборка',
    fhsCtaText:'Не уверены, что сделаем? Пришлите фото или описание — быстро посчитаем.',
    hiwTitle:'Как это работает',
    hiwSub:'Три простых шага без сюрпризов.',
    hiwStep1Title:'Звонок или СМС',
    hiwStep1Desc:'Опишите задачу. Фото помогает. Расчёт за 15 минут.',
    hiwStep2Title:'Честная цена',
    hiwStep2Desc:'Письменная цена до начала работ. Никаких скрытых платежей.',
    hiwStep3Title:'Приезжаем и делаем',
    hiwStep3Desc:'Сегодня или завтра в центре Лос-Анджелеса.',
    moreServicesStrip:'Монтаж ТВ · гипсокартон · сборка мебели · электрика · сантехника · покраска · двери · и многое другое',
    heroEyebrowV2:"Лос-Анджелес · Фото в SMS · Расчёт за 15 мин",
    heroTitleV2:"Сервисный вызов $150 · до 2 часов · $75/час после",
    heroSubV2:"Пришлите фото в SMS — расчёт за 15 минут. Хендимен в день обращения по центру LA. English · Español · Русский · עברית.",
    heroCallBtn:"Звонок (213) 361-1700",
    heroTextBtn:"Отправить фото для расчёта",
    urgencyStripV2:"⚡ Осталось 3 места на этой неделе с приездом сегодня · Напишите сейчас — расчёт за 15 мин",
    serviceGridTitle:"Простая цена. Письменный объём.",
    serviceGridSub:"Услуги хендимена по всему LA с понятной ценой заранее.",
    svcTvTitle:"Монтаж ТВ",svcTvPrice:"$150 сервисный вызов",svcTvDesc:"Стандарт на гипсокартоне или балке. Кабель-канал включён. Скрытая проводка — котировка по фото.",
    svcDwTitle:"Ремонт гипсокартона",svcDwPrice:"$150 сервисный вызов",svcDwDesc:"Небольшие дыры до 6\". Крупный ремонт или водный ущерб — котировка по фото.",
    svcFaTitle:"Сборка мебели",svcFaPrice:"$150 сервисный вызов",svcFaDesc:"IKEA, Wayfair, Amazon. Мелкие и средние предметы, помещающиеся в 2 часа. PAX/Elfa и несколько сложных предметов — котировка.",
    svcDoorTitle:"Установка дверей",svcDoorPrice:"Котировка по фото",svcDoorDesc:"Межкомнатные, в коробке, входные, смарт-замки.",
    svcPaintTitle:"Внутренняя покраска",svcPaintPrice:"$3/sf labor estimate",svcPaintDesc:"Стены, потолки, плинтусы, подкраска. Сметная стоимость проекта — только работа, материалы отдельно.",
    svcArtTitle:"Картины и зеркала",svcArtPrice:"$150 сервисный вызов",svcArtDesc:"До 5 стандартных предметов. По уровню, надёжно закреплено, любая стена.",
    pppTitle:"Устали от плохих хендименов?",
    ppp1Pain:"Мастер не пришёл",ppp1Promise:"SMS с подтверждением за 2 часа до визита",
    ppp2Pain:"Скрытые доплаты и сюрпризы",ppp2Promise:"Фиксированная цена в письменном виде до визита",
    ppp3Pain:"Сделано наспех и небрежно",ppp3Promise:"Не уходим, пока вы не одобрите работу",
    ppp4Pain:"После работы оставляют мусор",ppp4Promise:"Защитная плёнка + уборка пылесосом включены",
    ppp5Pain:"Нет нужных инструментов, лишние поездки",ppp5Promise:"Привозим всё с собой",
    ppp6Pain:"После работы не дозвониться",ppp6Promise:"Гарантия по тому же номеру — просто напишите",
    ownerTitle:"Кто будет работать у вас",
    ownerBody:"Handy & Friend — небольшая местная команда. Работает один мастер, на крупных задачах — с помощником. Большинство работ делаем сами и сами отвечаем на звонки. Если что-то пошло не так — вы звоните напрямую нам. Ремонтируем дома в LA более 12 лет.",
    neighborhoodsTitle:"Работаем в центральной части Лос-Анджелеса",
    neighborhoodsSub:"Приезд в день обращения в эти районы и рядом:",
    doneRightTitle:"Гарантия, что всё сделано как надо",
    doneRightBody:"Если работа выполнена не так, как нужно, — приедем и исправим без доплат. Гарантия на работу — 1 год. Если не можем закончить оговоренное, вы за это не платите.",
    mobileStickyCall:"Звонок",mobileStickyText:"SMS",mobileStickyPrice:"Цены",
    faqNewQ1:"Как быстро можете приехать?",
    faqNewA1:"Обычно даём слот на сегодня или завтра. Пришлите фото в SMS — подтверждаем в течение 15 минут. Пн–Сб, 8:00–19:00.",
    faqNewQ2:"Есть страховка?",
    faqNewA2:"Да — страховка гражданской ответственности (General Liability). Мы небольшая местная команда и берём мелкие задачи хендимена с работой до $500. Более крупные работы или те, где нужны разрешения, передаём подрядчику с лицензией.",
    faqNewQ3:"Какой минимальный заказ?",
    faqNewA3:"Сервисный вызов — $150, включает до 2 часов работы на объекте по согласованному объёму. Дополнительное время: $75/час, только при письменном согласовании. Материалы — доплата только если указано в письменном договоре до начала работ.",
    faqNewQ4:"Работаете ли по выходным и в день обращения?",
    faqNewA4:"Да — пн–сб с 8:00 до 19:00. Выезд в тот же или на следующий день есть почти всегда. Воскресенье — только по отдельной договорённости.",
    faqNewQ5:"Привозите ли свой инструмент?",
    faqNewA5:"Да — дрель, кронштейны, анкеры, защитная плёнка, краска и даже шпаклёвка. Вам ничего покупать не нужно.",
    faqNewQ6:"Нужно ли быть дома для расчёта?",
    faqNewA6:"Нет — пришлите фото или короткое описание в SMS. Обычно присылаем расчёт в течение 15 минут. Приезд на место — только если это действительно нужно.",
    faqNewQ7:"Убираете ли после работы?",
    faqNewA7:"Всегда. Перед работой стелем защитную плёнку, мусор и пыль забираем с собой. Уборка пылесосом включена.",
    faqNewQ8:"Как можно оплатить?",
    faqNewA8:"Наличные, Zelle, Venmo или кредитная/дебетовая карта. Оплата — после завершения работы, когда вы всем довольны.",
    faqNewQ9:"Что если что-то сломается после работы?",
    faqNewA9:"Мы отвечаем за свою работу 1 год. Просто напишите нам — приедем и исправим. Гарантия по тому же номеру, без лишних переключений.",
    faqNewQ10:"Говорите ли по-испански или по-русски?",
    faqNewA10:"Да — наша команда говорит по-английски, по-испански, по-русски и на иврите."
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
    heroBtnCall:'📞 Подзвонити — безкоштовно',
    heroBtnWA:'💬 WhatsApp',
    heroBtnQuote:'📋 Розрахунок за 2 хв',
    heroFullPricing:'💲 Повний прайс',
    barCall:'Дзвінок',
    barMessage:'Повідомлення',
    heroResponseNote:'⏰ Відповідаємо протягом 1 години в робочий час (8am-8pm PT)',
    urgencyChip:'⚡ Нам довіряють клієнти по всьому Лос-Анджелесу',
    urgencyTitle:'🎯 Забронюйте послугу сьогодні',
    urgencySub:'Прозорі ціни • Письмовий кошторис • Відповідь того ж дня • Центр Лос-Анджелеса',
    urgencyBtn:'✅ Забронювати зараз',
    whyTitle:'Чому обирають Handy & Friend?',
    painLabel:'❌ Проблема',
    promiseLabel:'✅ Наша обіцянка',
    pain1Title:'Підрядники не приїжджають',
    pain1Sub:'Ви марнуєте час в очікуванні.',
    promise1Title:'100% надійність',
    promise1Sub:'Приїжджаємо вчасно. На кожну зустріч.',
    pain2Title:'Приховані доплати',
    pain2Sub:'Фінальний рахунок у 2 рази вищий.',
    promise2Title:'Прозора ціна наперед',
    promise2Sub:'Без сюрпризів. Ви платите те, що бачите.',
    pain3Title:'Низька якість',
    pain3Sub:'Неакуратна робота і розчарування.',
    promise3Title:'Професійна якість',
    promise3Sub:'Чиста робота. Ясний обсяг. Місцева команда.',
    servicesTitle:'Послуги',
    serviceTv:'Монтаж ТВ',
    serviceFurniture:'Збирання меблів',
    serviceArt:'Картини та дзеркала',
    servicePainting:'Фарбування',
    serviceFlooring:'Підлога',
    servicePlumbing:'Сантехніка',
    serviceElectrical:'Електрика',
    stickyCall:'Подзвонити 213-361-1700',
    testimonialsTitle:'Приклади клієнтських історій',
    testimonialsSub:'Лише для ілюстрації — справжні перевірені відгуки з’являться після запуску Google Business.',
    review1:'"Чудовий сервіс! ТВ змонтували за 1 годину. Професійно і швидко."',
    review2:'"Прозорі ціни й зрозумілий обсяг робіт від початку до кінця. Приїхали вчасно, прибрали після себе."',
    review3:'"Ідеальне збирання меблів! Вчасно, чисто, дуже надійно. Звернусь ще."',
    leadTitle:'Готові забронювати послугу?',
    leadSub:'Оцінка телефоном і в чаті безкоштовна. Сервісний виклик — $150.',
    leadNamePlaceholder:'Ваше ім’я',
    leadEmailPlaceholder:'Ваш email',
    leadPhonePlaceholder:'Телефон (наприклад 310-555-0100)',
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
    formSuccessSub:'Відповідаємо протягом 1 години в робочий час (8am-8pm PT).',
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
    faqA1:'Відповідаємо протягом 1 години в робочий час (8am-8pm PT). Для термінових робіт телефонуйте 213-361-1700.',
    faqQ2:'Чи берете оплату за кошторис?',
    faqA2:'Ні. Усі кошториси безкоштовні. Прозорі ціни без прихованих платежів.',
    faqQ3:'Чи маєте страховку?',
    faqA3:'Так. Ми маємо страхування загальної відповідальності (General Liability Insurance). Умови та обсяг робіт обговорюються до початку.',
    faqQ4:'Що як я не задоволений роботою?',
    faqA4:'Якщо робота не влаштує, повідомте нам протягом 7 днів — приїдемо та виправимо без доплат.',
    faqQ5:'Чи працюєте у вихідні та ввечері?',
    faqA5:'Так. Пропонуємо гнучкий графік. Телефонуйте 213-361-1700.',
    faqQ6:'Які способи оплати приймаєте?',
    faqA6:'Приймаємо готівку, Venmo, PayPal і основні банківські картки.',
    map_title:'Зона обслуговування',
    map_subtitle:'Обслуговуємо Лос-Анджелес, Голлівуд, Вест-Голлівуд, Беверлі-Гіллз та Санта-Моніку',
    finalCtaTitle:'Не зволікайте-бронюйте майстра сьогодні',
    finalCtaSub:'Професійний сервіс у Лос-Анджелесі з прозорим обсягом робіт і ціною.',
    finalCtaWhatsApp:'💬 Написати у WhatsApp',
    finalCtaMessenger:'💬 Facebook Messenger',
    finalCtaCall:'📞 Подзвонити',
    legalDisclaimerHtml:'<strong>Handy & Friend</strong> виконує домашні ремонти до $1,000 (лише робота). Послуги включають монтаж ТВ, збирання меблів, фарбування, підлогу, сантехніку, електрику та навішування картин. Для робіт понад $1,000, конструктивних змін, дозволів або ліцензованих вимог звертайтесь до ліцензованого підрядника. Маємо страхування цивільної відповідальності. <strong><a href="tel:+12133611700" style="color:#b88924;text-decoration:none">Телефонуйте 213-361-1700</a></strong> для деталей.',
    copyDone:'✓ Скопійовано',
    smsPhoneRequired:'Вкажіть номер телефону',
    smsConsentRequired:'Потрібно погодитись на SMS',
    smsSendError:'Помилка надсилання SMS. Спробуйте ще раз.',
    smsNetworkError:'Мережева помилка. Спробуйте ще раз.',
    leadSubmitError:'Помилка відправки форми. Зателефонуйте 213-361-1700.',
    fhsTitle:'Більше ніж просто ці послуги',
    fhsSub:'Від розхитаної дверної ручки до оновлення кімнати — один дзвінок, одна бригада, майже будь-які домашні роботи.',
    fhsItem1:'Загальний ремонт',
    fhsItem2:'Електрика',
    fhsItem3:'Сантехніка',
    fhsItem4:'Підфарбовування',
    fhsItem5:'Двері та замки',
    fhsItem6:'Дзеркала та картини',
    fhsItem7:'Доставка та збирання',
    fhsCtaText:'Не впевнені, що зробимо? Надішліть фото або опис — швидко порахуємо.',
    hiwTitle:'Як це працює',
    hiwSub:'Три прості кроки без сюрпризів.',
    hiwStep1Title:'Дзвінок або СМС',
    hiwStep1Desc:'Опишіть завдання. Фото допомагає. Розрахунок за 15 хвилин.',
    hiwStep2Title:'Чесна ціна',
    hiwStep2Desc:'Письмова ціна до початку робіт. Ніяких прихованих платежів.',
    hiwStep3Title:'Приїжджаємо та робимо',
    hiwStep3Desc:'Сьогодні або завтра в центрі Лос-Анджелеса.',
    moreServicesStrip:'Монтаж ТВ · гіпсокартон · збирання меблів · електрика · сантехніка · фарбування · двері · і багато іншого',
    heroEyebrowV2:"Лос-Анджелес · Фото в SMS · Розрахунок за 15 хв",
    heroTitleV2:"Сервісний виклик $150 · до 2 годин · $75/год після",
    heroSubV2:"Надішліть фото в SMS — розрахунок за 15 хвилин. Хендімен у день звернення по центру LA. English · Español · Русский · עברית.",
    heroCallBtn:"Дзвінок (213) 361-1700",
    heroTextBtn:"Надіслати фото для розрахунку",
    urgencyStripV2:"⚡ Залишилось 3 слоти цього тижня з приїздом сьогодні · Напишіть зараз — розрахунок за 15 хв",
    serviceGridTitle:"Проста ціна. Письмовий обсяг.",
    serviceGridSub:"Послуги хендімена по всьому LA зі зрозумілою ціною наперед.",
    svcTvTitle:"Монтаж ТВ",svcTvPrice:"$150 сервісний виклик",svcTvDesc:"Стандарт на гіпсокартоні або балці. Кабель-канал включено. Прихована проводка — котировка по фото.",
    svcDwTitle:"Ремонт гіпсокартону",svcDwPrice:"$150 сервісний виклик",svcDwDesc:"Невеликі дірки до 6\". Більший ремонт або пошкодження водою — котировка по фото.",
    svcFaTitle:"Збирання меблів",svcFaPrice:"$150 сервісний виклик",svcFaDesc:"IKEA, Wayfair, Amazon. Дрібні та середні предмети, що вміщуються в 2 години. PAX/Elfa та кілька складних предметів — котировка.",
    svcDoorTitle:"Встановлення дверей",svcDoorPrice:"Котировка по фото",svcDoorDesc:"Міжкімнатні, з коробкою, вхідні, смарт-замки.",
    svcPaintTitle:"Внутрішнє фарбування",svcPaintPrice:"$3/sf labor estimate",svcPaintDesc:"Стіни, стелі, плінтуси, підфарбовування. Кошторис проекту — лише робота, матеріали окремо.",
    svcArtTitle:"Картини та дзеркала",svcArtPrice:"$150 сервісний виклик",svcArtDesc:"До 5 стандартних предметів. По рівню, надійно закріплено, будь-яка стіна.",
    pppTitle:"Втомилися від поганих хендіменів?",
    ppp1Pain:"Майстер не прийшов",ppp1Promise:"SMS з підтвердженням за 2 години до візиту",
    ppp2Pain:"Приховані доплати й сюрпризи",ppp2Promise:"Фіксована ціна письмово до візиту",
    ppp3Pain:"Зроблено поспіхом і недбало",ppp3Promise:"Не йдемо, доки ви не схвалите роботу",
    ppp4Pain:"Після роботи залишають безлад",ppp4Promise:"Захисна плівка + прибирання пилососом включені",
    ppp5Pain:"Немає потрібних інструментів, зайві поїздки",ppp5Promise:"Привозимо все з собою",
    ppp6Pain:"Після роботи не додзвонитися",ppp6Promise:"Гарантія за тим самим номером — просто напишіть",
    ownerTitle:"Хто у вас працюватиме",
    ownerBody:"Handy & Friend — невелика місцева команда. Працює один майстер, на більших задачах — з помічником. Більшість робіт виконуємо самі й самі відповідаємо на дзвінки. Якщо щось пішло не так — телефонуєте напряму нам. Ремонтуємо будинки в LA понад 12 років.",
    neighborhoodsTitle:"Працюємо в центральній частині Лос-Анджелеса",
    neighborhoodsSub:"Приїзд у день звернення в ці райони та поруч:",
    doneRightTitle:"Гарантія, що все зроблено як слід",
    doneRightBody:"Якщо роботу виконано не так, як треба, — приїдемо й виправимо без додаткової оплати. Гарантія на роботу — 1 рік. Якщо не зможемо завершити обумовлене, ви за це не платите.",
    mobileStickyCall:"Дзвінок",mobileStickyText:"SMS",mobileStickyPrice:"Ціни",
    faqNewQ1:"Як швидко можете приїхати?",
    faqNewA1:"Зазвичай даємо слот на сьогодні або завтра. Надішліть фото в SMS — підтвердимо протягом 15 хвилин. Пн–Сб, 8:00–19:00.",
    faqNewQ2:"Чи є страховка?",
    faqNewA2:"Так — страховка цивільної відповідальності (General Liability). Ми невелика місцева команда й беремо дрібні задачі хендімена з роботою до $500. Більші роботи або ті, де потрібні дозволи, передаємо підряднику з ліцензією.",
    faqNewQ3:"Яке мінімальне замовлення?",
    faqNewA3:"Сервісний виклик — $150, включає до 2 годин роботи на об'єкті за погодженим обсягом. Додатковий час: $75/год, лише при письмовому погодженні. Матеріали — доплата лише якщо зазначено в письмовій угоді до початку робіт.",
    faqNewQ4:"Чи працюєте у вихідні та в день звернення?",
    faqNewA4:"Так — пн–сб з 8:00 до 19:00. Виїзд у той самий або наступний день є майже завжди. Неділя — тільки за окремою домовленістю.",
    faqNewQ5:"Чи привозите свій інструмент?",
    faqNewA5:"Так — дриль, кронштейни, анкери, захисна плівка, фарба й навіть шпаклівка. Вам нічого купувати не потрібно.",
    faqNewQ6:"Чи потрібно бути вдома для розрахунку?",
    faqNewA6:"Ні — надішліть фото або короткий опис у SMS. Зазвичай надсилаємо розрахунок протягом 15 хвилин. Приїзд на місце — лише коли це справді потрібно.",
    faqNewQ7:"Чи прибираєте після роботи?",
    faqNewA7:"Завжди. Перед роботою стелимо захисну плівку, сміття та пил забираємо з собою. Прибирання пилососом включене.",
    faqNewQ8:"Як можна оплатити?",
    faqNewA8:"Готівка, Zelle, Venmo або кредитна/дебетова картка. Оплата — після завершення роботи, коли ви всім задоволені.",
    faqNewQ9:"Що робити, якщо щось зламається після роботи?",
    faqNewA9:"Ми відповідаємо за свою роботу 1 рік. Просто напишіть нам — приїдемо та виправимо. Гарантія за тим самим номером, без зайвих перемикань.",
    faqNewQ10:"Чи говорите іспанською або російською?",
    faqNewA10:"Так — наша команда говорить англійською, іспанською, російською та івритом."
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
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'sms',
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
        gtag('event', 'sms_lead', {
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
  if(heroOfferTitleEl) heroOfferTitleEl.textContent=l.heroOfferTitle||'Hire a Handyman in Los Angeles';
  const heroOfferSubEl=document.getElementById('heroOfferSub');
  if(heroOfferSubEl) {
    heroOfferSubEl.innerHTML=l.heroOfferSubHtml||'<span class="hero-included-accent">Same-day response, transparent pricing, and reliable local handyman help</span><br>Book online in minutes or call (213) 361-1700 for a fast quote';
  }
  const heroSubEl=document.getElementById('heroSub');
  if(heroSubEl)heroSubEl.textContent=l.heroSub;
  document.getElementById('gridLbl').textContent=l.gridLbl;
  document.getElementById('calcTitle').textContent=l.calcTitle;
  document.getElementById('calcSub').textContent=l.calcSub;
  const lSvcEl=document.getElementById('lSvc');if(lSvcEl)lSvcEl.textContent=l.lSvc;
  const lLenEl=document.getElementById('lLen');if(lLenEl)lLenEl.textContent=l.lLen;
  const lWidEl=document.getElementById('lWid');if(lWidEl)lWidEl.textContent=l.lWid;
  const lBaseEl=document.getElementById('lBase');if(lBaseEl)lBaseEl.textContent=l.lBase;
  const modeRoomEl=document.getElementById('modeRoom');if(modeRoomEl)modeRoomEl.textContent=l.lModeRoom;
  const modeTotalEl=document.getElementById('modeTotal');if(modeTotalEl)modeTotalEl.textContent=l.lModeTotal;
  const lSfEl=document.getElementById('lSf');if(lSfEl)lSfEl.textContent=l.lSfTotal;
  const bwaEl=document.querySelector('.bar .bwa');
  if(bwaEl)bwaEl.href='https://wa.me/12133611700?text='+encodeURIComponent(l.waGreet);
  const calcAnchorEl=document.getElementById('calcAnchorTxt');
  if(calcAnchorEl)calcAnchorEl.textContent=l.anchorBtn;
  const lTransEl=document.getElementById('lTrans');if(lTransEl)lTransEl.textContent=l.lTrans;
  const lDoorUEl=document.getElementById('lDoorU');if(lDoorUEl)lDoorUEl.textContent=l.lDoorU;
  document.getElementById('calcBtn').textContent=l.calcBtn;
  document.getElementById('resLbl').textContent=l.resLbl;
  document.getElementById('resSub').textContent=l.resSub;
  document.getElementById('resWaTxt').textContent=l.waBtn;
  document.getElementById('resCopyTxt').textContent=l.copyBtn;
  // update min badge if result visible
  const resMinEl=document.getElementById('resMin');
  if(lastEst&&resMinEl&&resMinEl.style.display!=='none'){
    const resMinTxt=document.getElementById('resMinTxt');
    if(resMinTxt)resMinTxt.textContent=l.minApplied+' (min $'+(lastEst.min||500)+')';
  }
  const baseBanner=document.getElementById('baseBanner');
  if(baseBanner)baseBanner.innerHTML=l.base.map(s=>`<div class="bp"><strong>·</strong> ${s}</div>`).join('');

  /* Tab labels */
  const tabMap={p1:'tabP1',p2:'tabP2',fl:'tabFl',trim:'tabTrim',tv:'tabTv',fur:'tabFur',plumb:'tabPlumb'};
  document.querySelectorAll('.calc-tab').forEach(tab=>{
    const key=tabMap[tab.dataset.svc];
    if(key&&l[key]){
      const span=tab.querySelector('span');
      if(span) span.textContent=l[key];
      else tab.textContent=l[key];
    }
  });

  /* Universal calc labels */
  const uSqLbl=document.getElementById('univSqftLabel');if(uSqLbl)uSqLbl.textContent=l.univSqftLabel||'';
  const uLiLbl=document.getElementById('univLinLabel');if(uLiLbl)uLiLbl.textContent=l.univLinLabel||'';
  const uSqPr=document.getElementById('univSqftPriceLbl');if(uSqPr)uSqPr.textContent=l.univSqftPriceLbl||'';
  const uSqAr=document.getElementById('univSqftAreaLbl');if(uSqAr)uSqAr.textContent=l.univSqftAreaLbl||'';
  const uLiPr=document.getElementById('univLinPriceLbl');if(uLiPr)uLiPr.textContent=l.univLinPriceLbl||'';
  const uLiLn=document.getElementById('univLinLenLbl');if(uLiLn)uLiLn.textContent=l.univLinLenLbl||'';

  /* Editable price labels */
  const sqPrLbl=document.getElementById('lSqftPrice');if(sqPrLbl)sqPrLbl.textContent=l.lSqftPrice||'';
  const dPrLbl=document.getElementById('lDoorPriceEdit');if(dPrLbl)dPrLbl.textContent=l.lDoorPriceEdit||'';
  const pPrLbl=document.getElementById('lPiecePriceEdit');if(pPrLbl)pPrLbl.textContent=l.lPiecePriceEdit||'';
  const lnPrLbl=document.getElementById('lLinearPriceEdit');if(lnPrLbl)lnPrLbl.textContent=l.lLinearPriceEdit||'';

  /* SMS Capture translations */
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
  const calcServices = ['paint', 'floor'];
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
      // Update calculator tab selection without scrolling
      const tabMap={paint:'p1',floor:'fl',tv:'tv',fur:'fur',art:'tv',plumb:'plumb',elec:'plumb'};
      const tabSvc=tabMap[svc.id]||svc.id;
      const tab=document.querySelector('.calc-tab[data-svc="'+tabSvc+'"]');
      if(tab){
        document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        currentSvc=tabSvc;
        /* For art, set sub-toggle to art */
        if(svc.id==='art'){activeFixedSub='art';}
        else if(svc.id==='elec'){activeFixedSub='elec';}
        renderCalculatorUI();
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
      '<span class="cpromo-pair">' + p.label + '</span>';
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
  const l=+document.getElementById('dimLen')?.value||0;
  const w=+document.getElementById('dimWid')?.value||0;
  const tsf=+document.getElementById('totalSF')?.value||0;
  const sf=(calcMode==='total'&&tsf)?Math.round(tsf):(l&&w?Math.round(l*w):0);
  const badge=document.getElementById('areaBadge');
  if(!badge)return;
  if(calcMode==='total'){
    badge.innerHTML=sf?L().areaTotalFmt(sf):L().areaTotalHint;
  } else {
    badge.innerHTML=L().areaHint(l||'',w||'',sf);
  }
}

/* ═══════════════════════════════════════════════
   CALCULATOR — tab-based system
═══════════════════════════════════════════════ */
let currentSvc='p1'; /* default active tab */

const SVC_MODE={
  p1:'sqft',p2:'sqft',fl:'sqft',fv:'sqft',
  trim:'linear',
  tv:'fixed',art:'fixed',fur:'fixed',plumb:'fixed',elec:'fixed'
};
function getMode(v){return SVC_MODE[v]||'sqft';}

/* Price defaults for sqft mode services */
const SQFT_PRICES={p1:3.00,p2:3.75,fl:3.00,fv:3.00};

/* Track user price overrides (null = use default) */
let sqftPriceOverride=null;
let kitchenPriceOverride=null;
let furnPriceOverride=null;
let linearPriceOverride=null;

/* Active fixed sub-service for grouped tabs */
let activeFixedSub=null;

/* ── Tab click handler ── */
document.getElementById('calcTabs')?.addEventListener('click',e=>{
  const tab=e.target.closest('.calc-tab');
  if(!tab)return;
  document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  currentSvc=tab.dataset.svc;
  /* Reset price overrides when switching services */
  sqftPriceOverride=null;
  kitchenPriceOverride=null;
  furnPriceOverride=null;
  linearPriceOverride=null;
  activeFixedSub=null;
  renderCalculatorUI();
});

/* ── Main render ── */
function renderCalculatorUI(){
  const v=currentSvc;
  if(!v)return;
  const mode=getMode(v);
  const l=L();

  /* hide all mode wrappers */
  ['sqftModeWrap','kitchenWrap','furnWrap','fixedWrap','linearWrap'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  /* hide sub-toggles */
  const flSub=document.getElementById('floorSubToggle');if(flSub)flSub.style.display='none';
  const fxSub=document.getElementById('fixedSubToggle');if(fxSub)fxSub.style.display='none';

  /* hide old inner wrappers that still exist */
  ['roomWrap','sfWrap','areaBadge','bpWrap','flWrap'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  const modeEl=document.querySelector('.mode');
  if(modeEl)modeEl.style.display='none';
  const addonGroup=document.getElementById('addonGroup');
  if(addonGroup)addonGroup.innerHTML='';

  const sub=document.getElementById('calcSub');

  if(mode==='sqft'){
    document.getElementById('sqftModeWrap').style.display='block';
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    if(modeEl)modeEl.style.display='flex';
    const roomW=document.getElementById(calcMode==='room'?'roomWrap':'sfWrap');
    if(roomW)roomW.style.display=calcMode==='room'?'grid':'flex';
    const areaBadge=document.getElementById('areaBadge');
    if(areaBadge)areaBadge.style.display='block';

    /* Set price edit */
    const priceEdit=document.getElementById('sqftPriceEdit');
    if(priceEdit){
      if(sqftPriceOverride===null){
        priceEdit.value=(SQFT_PRICES[v]||3.00).toFixed(2);
      }
    }

    /* Show floor sub-toggle for fl/fv */
    if(ifl&&flSub){
      flSub.style.display='flex';
      renderFloorSubToggle();
    }

    /* Addons */
    const list=ip?l.ap:ifl?l.af:[];
    if(addonGroup){
      addonGroup.innerHTML=list.map(a=>
        `<label class="arow"><input type="checkbox" id="ao_${a.id}">`+
        `<span>${a.l}</span><span class="ap">${a.p}</span></label>`
      ).join('');
    }
    if(ip){const bpWrap=document.getElementById('bpWrap');if(bpWrap)bpWrap.style.display='flex';}
    if(ifl){const flW=document.getElementById('flWrap');if(flW)flW.style.display='block';}
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
    /* Determine which sub-service group to show */
    if(v==='tv'){
      if(!activeFixedSub)activeFixedSub='tv';
      if(fxSub){fxSub.style.display='flex';renderFixedSubToggle('tv');}
      renderFixedOpts(activeFixedSub);
    }else if(v==='plumb'){
      if(!activeFixedSub)activeFixedSub='plumb';
      if(fxSub){fxSub.style.display='flex';renderFixedSubToggle('plumb');}
      renderFixedOpts(activeFixedSub);
    }else{
      renderFixedOpts(v);
    }
  }
  else if(mode==='linear'){
    document.getElementById('linearWrap').style.display='block';
    if(sub) sub.textContent=l.calcSubLinear||'';
    renderLinearOpts(v);
  }
  updateLivePreview();
}

/* ── Floor sub-toggle (Laminate / LVP) ── */
function renderFloorSubToggle(){
  const wrap=document.getElementById('floorSubToggle');
  if(!wrap)return;
  const l=L();
  wrap.innerHTML=
    `<button class="sub-btn${currentSvc==='fl'?' active':''}" data-fsub="fl">${l.subFlLam||'Laminate'} ($3.00)</button>`+
    `<button class="sub-btn${currentSvc==='fv'?' active':''}" data-fsub="fv">${l.subFlLvp||'LVP'} ($3.00)</button>`;
  wrap.querySelectorAll('.sub-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      currentSvc=btn.dataset.fsub;
      sqftPriceOverride=null;
      /* Update tab active state */
      document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
      const flTab=document.querySelector('.calc-tab[data-svc="fl"]');
      if(flTab)flTab.classList.add('active');
      renderCalculatorUI();
    });
  });
}

/* ── Fixed sub-toggle (TV group / Plumb group) ── */
function renderFixedSubToggle(group){
  const wrap=document.getElementById('fixedSubToggle');
  if(!wrap)return;
  const l=L();
  let btns='';
  if(group==='tv'){
    btns=
      `<button class="sub-btn${activeFixedSub==='tv'?' active':''}" data-fxsub="tv">${l.subTv||'TV'}</button>`+
      `<button class="sub-btn${activeFixedSub==='art'?' active':''}" data-fxsub="art">${l.subArt||'Art & Mirrors'}</button>`+
      `<button class="sub-btn${activeFixedSub==='curtain'?' active':''}" data-fxsub="curtain">${l.subCurtain||'Curtains'}</button>`;
  }else if(group==='plumb'){
    btns=
      `<button class="sub-btn${activeFixedSub==='plumb'?' active':''}" data-fxsub="plumb">${l.subPlumb||'Plumbing'}</button>`+
      `<button class="sub-btn${activeFixedSub==='elec'?' active':''}" data-fxsub="elec">${l.subElec||'Electrical'}</button>`;
  }
  wrap.innerHTML=btns;
  wrap.querySelectorAll('.sub-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeFixedSub=btn.dataset.fxsub;
      /* For curtain sub, use art opts */
      renderFixedOpts(activeFixedSub==='curtain'?'art':activeFixedSub);
      wrap.querySelectorAll('.sub-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updateLivePreview();
    });
  });
}

/* ── Render helpers ── */
function renderKitchenOpts(){
  const l=L();
  const sel=document.getElementById('doorTypeSel');
  if(sel){
    sel.innerHTML=l.kitchenDoorOpts.map(o=>
      `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
    ).join('');
  }
  const lDT=document.getElementById('lDoorType');if(lDT)lDT.textContent=l.lDoorType;
  const lDQ=document.getElementById('lDoorQtyK');if(lDQ)lDQ.textContent=l.lDoorQty;
  const lDS=document.getElementById('lDrawerS');if(lDS)lDS.textContent=l.lDrawerS;
  const lDL=document.getElementById('lDrawerL');if(lDL)lDL.textContent=l.lDrawerL;
  const lEP=document.getElementById('lEndPanels');if(lEP)lEP.textContent=l.lEndPanels;
  const ag=document.getElementById('kitchenAddonGroup');
  if(ag){
    ag.innerHTML=(l.kitchenAddons||[]).map(a=>
      `<label class="arow"><input type="checkbox" id="ao_${a.id}">`+
      `<span>${a.l}</span><span class="ap">${a.p}</span></label>`
    ).join('');
  }
  /* Set kitchen price edit from selected door type */
  const kpe=document.getElementById('kitchenPriceEdit');
  if(kpe&&sel&&kitchenPriceOverride===null){
    kpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||75).toFixed(0);
  }
}

function renderFurnOpts(){
  const l=L();
  const sel=document.getElementById('pieceTypeSel');
  if(sel){
    sel.innerHTML=l.furnPieceOpts.map(o=>
      `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
    ).join('');
  }
  const lPT=document.getElementById('lPieceType');if(lPT)lPT.textContent=l.lPieceType;
  const lPQ=document.getElementById('lPieceQty');if(lPQ)lPQ.textContent=l.lPieceQty;
  /* Set furniture price edit from selected piece type */
  const fpe=document.getElementById('furnPriceEdit');
  if(fpe&&sel&&furnPriceOverride===null){
    fpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||40).toFixed(0);
  }
}

function renderFixedOpts(svc){
  const l=L();
  const opts=l.fixedOpts[svc]||[];
  const wrap=document.getElementById('fixedCards');
  if(!wrap)return;
  wrap.innerHTML=opts.map((o,i)=>{
    if(o.addon) return '';
    return `<label class="fcard"><input type="radio" name="fixedOpt" value="${o.id}" data-price="${o.p}" ${i===0?'checked':''}>`+
      `<div class="fcard-inner"><span class="fcard-name">${o.l}</span>`+
      `<span class="fcard-price">$${o.p}</span></div></label>`;
  }).join('');
  const extraWrap=document.getElementById('fixedExtraWrap');
  const addonOpt=opts.find(o=>o.addon);
  const extraOpt=opts.find(o=>o.extra);
  if(addonOpt&&extraWrap){
    extraWrap.style.display='flex';
    document.getElementById('lFixedExtra').textContent=addonOpt.l+' ($'+addonOpt.p+'/ea)';
    document.getElementById('fixedExtraQty').value='';
    document.getElementById('fixedExtraQty').dataset.price=addonOpt.p;
  } else if(extraOpt&&extraWrap){
    extraWrap.style.display='flex';
    document.getElementById('lFixedExtra').textContent=extraOpt.extra.l+' ($'+extraOpt.extra.ep+'/ea)';
    document.getElementById('fixedExtraQty').value='';
    document.getElementById('fixedExtraQty').dataset.price=extraOpt.extra.ep;
  } else if(extraWrap){
    extraWrap.style.display='none';
  }
  /* Bind radio changes to live preview */
  wrap.querySelectorAll('input[name="fixedOpt"]').forEach(r=>{
    r.addEventListener('change',updateLivePreview);
  });
}

function renderLinearOpts(svc){
  const l=L();
  const sel=document.getElementById('linearServiceSel');
  if(sel){
    sel.innerHTML=l.linearOpts.map(o=>
      `<option value="${o.v}" data-price="${o.p}">${o.l}</option>`
    ).join('');
  }
  const lLS=document.getElementById('lLinearService');if(lLS)lLS.textContent=l.lLinearService||'Service Type';
  const lLL=document.getElementById('lLinearLength');if(lLL)lLL.textContent=l.lLinearLength||'Length';
  const lLU=document.getElementById('lLinearUnit');if(lLU)lLU.textContent=l.lLinearUnit||'Unit';
  /* Set linear price edit from selected service */
  const lpe=document.getElementById('linearPriceEdit');
  if(lpe&&sel&&linearPriceOverride===null){
    lpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||3.00).toFixed(2);
  }
  updateLinearLength();
}

function updateLinearLength(){
  const l=+document.getElementById('linearLength')?.value||0;
  const badge=document.getElementById('linearBadge');
  const sel=document.getElementById('linearServiceSel');
  if(!badge||!sel)return;
  const lpe=document.getElementById('linearPriceEdit');
  const svcPrice=linearPriceOverride!==null?linearPriceOverride:(+sel.options[sel.selectedIndex]?.dataset.price||0);
  const unit=document.getElementById('linearUnitSel')?.value||'ft';
  if(!l){badge.innerHTML='Enter length';badge.style.display='block';return;}
  const convLength=unit==='m'?Math.round(l*3.28084*100)/100:l;
  const tot=Math.round(convLength*svcPrice*100)/100;
  badge.innerHTML=`${convLength} ft × $${svcPrice}/ft = <strong>$${tot}</strong>`;
  badge.style.display='block';
}

/* ── Editable price input handlers ── */
document.getElementById('sqftPriceEdit')?.addEventListener('input',e=>{
  sqftPriceOverride=+e.target.value||null;
  updateLivePreview();
});
document.getElementById('kitchenPriceEdit')?.addEventListener('input',e=>{
  kitchenPriceOverride=+e.target.value||null;
  updateLivePreview();
});
document.getElementById('furnPriceEdit')?.addEventListener('input',e=>{
  furnPriceOverride=+e.target.value||null;
  updateLivePreview();
});
document.getElementById('linearPriceEdit')?.addEventListener('input',e=>{
  linearPriceOverride=+e.target.value||null;
  updateLinearLength();
  updateLivePreview();
});

/* When door type changes, update kitchen price edit */
document.getElementById('doorTypeSel')?.addEventListener('change',()=>{
  kitchenPriceOverride=null;
  const sel=document.getElementById('doorTypeSel');
  const kpe=document.getElementById('kitchenPriceEdit');
  if(kpe&&sel)kpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||75).toFixed(0);
  updateLivePreview();
});

/* When piece type changes, update furniture price edit */
document.getElementById('pieceTypeSel')?.addEventListener('change',()=>{
  furnPriceOverride=null;
  const sel=document.getElementById('pieceTypeSel');
  const fpe=document.getElementById('furnPriceEdit');
  if(fpe&&sel)fpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||40).toFixed(0);
  updateLivePreview();
});

/* When linear service changes, update linear price edit */
document.getElementById('linearServiceSel')?.addEventListener('change',()=>{
  linearPriceOverride=null;
  const sel=document.getElementById('linearServiceSel');
  const lpe=document.getElementById('linearPriceEdit');
  if(lpe&&sel)lpe.value=(+sel.options[sel.selectedIndex]?.dataset.price||3.00).toFixed(2);
  updateLinearLength();
  updateLivePreview();
});

/* ── Area / dimension input listeners ── */
['dimLen','dimWid','totalSF'].forEach(id=>{
  const el=document.getElementById(id);
  if(el){el.addEventListener('input',()=>{updateArea();updateLivePreview();});}
});
['linearLength','linearUnitSel'].forEach(id=>{
  const el=document.getElementById(id);
  if(el){el.addEventListener('input',()=>{updateLinearLength();updateLivePreview();});
    el.addEventListener('change',()=>{updateLinearLength();updateLivePreview();});}
});
['doorQtyK','drawerSmallQty','drawerLargeQty','endPanelQty','pieceQty','fixedExtraQty',
 'baseLF','transQty','doorQty'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('input',updateLivePreview);
});

/* ── Universal quick calculators ── */
function updateUniversalCalcs(){
  const sp=+document.getElementById('univSqftPrice')?.value||0;
  const sa=+document.getElementById('univSqftArea')?.value||0;
  const sr=document.getElementById('univSqftResult');
  if(sr){
    if(sp&&sa){sr.innerHTML=sa+' sf × $'+sp.toFixed(2)+' = <strong>$'+Math.round(sa*sp*100)/100+'</strong>';}
    else{sr.textContent='\u2014';}
  }
  const lp=+document.getElementById('univLinPrice')?.value||0;
  const ll=+document.getElementById('univLinLen')?.value||0;
  const lr=document.getElementById('univLinResult');
  if(lr){
    if(lp&&ll){lr.innerHTML=ll+' lf × $'+lp.toFixed(2)+' = <strong>$'+Math.round(ll*lp*100)/100+'</strong>';}
    else{lr.textContent='\u2014';}
  }
}
document.getElementById('univSqftToggle')?.addEventListener('change',e=>{
  const body=document.getElementById('univSqftBody');
  if(body)body.style.display=e.target.checked?'flex':'none';
});
document.getElementById('univLinToggle')?.addEventListener('change',e=>{
  const body=document.getElementById('univLinBody');
  if(body)body.style.display=e.target.checked?'flex':'none';
});
['univSqftPrice','univSqftArea','univLinPrice','univLinLen'].forEach(id=>{
  document.getElementById(id)?.addEventListener('input',updateUniversalCalcs);
});

/* ── Live preview badge ── */
let liveDebounce;
function updateLivePreview(){
  clearTimeout(liveDebounce);
  liveDebounce=setTimeout(()=>{
    const badge=document.getElementById('liveBadge');
    if(!badge)return;
    const tot=computeTotal();
    if(tot>0){
      badge.textContent='\u2248 $'+tot.toLocaleString('en-US');
      badge.classList.add('visible');
    }else{
      badge.classList.remove('visible');
      badge.textContent='';
    }
  },150);
}

/* ── computeTotal — pure calculation, no side effects ── */
function computeTotal(){
  const v=currentSvc;
  if(!v)return 0;
  const mode=getMode(v);
  let tot=0;

  if(mode==='kitchen'){
    const sel=document.getElementById('doorTypeSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const doorPrice=kitchenPriceOverride!==null?kitchenPriceOverride:defaultPrice;
    const doorQty=+document.getElementById('doorQtyK')?.value||0;
    const ds=+document.getElementById('drawerSmallQty')?.value||0;
    const dl=+document.getElementById('drawerLargeQty')?.value||0;
    const ep=+document.getElementById('endPanelQty')?.value||0;
    tot=doorQty*doorPrice + ds*P.kitchen.drawerSmall + dl*P.kitchen.drawerLarge + ep*P.kitchen.endPanel;
    if(document.getElementById('ao_degreasing')?.checked) tot+=doorQty*P.kitchen.degreasing;
    if(document.getElementById('ao_oakFill')?.checked) tot+=doorQty*P.kitchen.oakFill;
    if(document.getElementById('ao_twoTone')?.checked) tot+=P.kitchen.twoTone;
  }
  else if(mode==='furniture'){
    const sel=document.getElementById('pieceTypeSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const piecePrice=furnPriceOverride!==null?furnPriceOverride:defaultPrice;
    const qty=+document.getElementById('pieceQty')?.value||0;
    tot=qty*piecePrice;
  }
  else if(mode==='linear'){
    const sel=document.getElementById('linearServiceSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const svcPrice=linearPriceOverride!==null?linearPriceOverride:defaultPrice;
    const len=+document.getElementById('linearLength')?.value||0;
    const unit=document.getElementById('linearUnitSel')?.value||'ft';
    const convLen=unit==='m'?Math.round(len*3.28084*100)/100:len;
    tot=Math.round(convLen*svcPrice*100)/100;
  }
  else if(mode==='fixed'){
    const radio=document.querySelector('input[name="fixedOpt"]:checked');
    if(!radio)return 0;
    tot=+radio.dataset.price||0;
    const extraQty=+document.getElementById('fixedExtraQty')?.value||0;
    const extraPrice=+document.getElementById('fixedExtraQty')?.dataset.price||0;
    tot+=extraQty*extraPrice;
  }
  else{ /* sqft */
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    const len=+document.getElementById('dimLen')?.value||0;
    const wid=+document.getElementById('dimWid')?.value||0;
    const tsf=+document.getElementById('totalSF')?.value||0;
    let sf;
    if(calcMode==='room'){sf=len*wid;}else{sf=tsf;}
    if(!sf)return 0;
    const defaultRate=SQFT_PRICES[v]||3.00;
    const rate=sqftPriceOverride!==null?sqftPriceOverride:defaultRate;
    tot=sf*rate;
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
  }
  return Math.round(tot);
}

/* ── calcBtn click handler ── */
document.getElementById('calcBtn').addEventListener('click',()=>{
  const v=currentSvc;
  if(!v)return;
  const mode=getMode(v);
  const name=L().opts.find(o=>o.v===v)?.l||'';
  let tot=0,detail='';

  if(mode==='kitchen'){
    const sel=document.getElementById('doorTypeSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const doorPrice=kitchenPriceOverride!==null?kitchenPriceOverride:defaultPrice;
    const doorQty=+document.getElementById('doorQtyK')?.value||0;
    if(!doorQty){document.getElementById('doorQtyK')?.focus();return;}
    const ds=+document.getElementById('drawerSmallQty')?.value||0;
    const dl=+document.getElementById('drawerLargeQty')?.value||0;
    const ep=+document.getElementById('endPanelQty')?.value||0;
    tot=doorQty*doorPrice + ds*P.kitchen.drawerSmall + dl*P.kitchen.drawerLarge + ep*P.kitchen.endPanel;
    if(document.getElementById('ao_degreasing')?.checked) tot+=doorQty*P.kitchen.degreasing;
    if(document.getElementById('ao_oakFill')?.checked) tot+=doorQty*P.kitchen.oakFill;
    if(document.getElementById('ao_twoTone')?.checked) tot+=P.kitchen.twoTone;
    detail=doorQty+' doors @ $'+doorPrice+(ds+dl>0?' + '+(ds+dl)+' drawers':'')+(ep>0?' + '+ep+' panels':'');
  }
  else if(mode==='furniture'){
    const sel=document.getElementById('pieceTypeSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const piecePrice=furnPriceOverride!==null?furnPriceOverride:defaultPrice;
    const qty=+document.getElementById('pieceQty')?.value||0;
    if(!qty){document.getElementById('pieceQty')?.focus();return;}
    tot=qty*piecePrice;
    detail=qty+' × '+(sel?.options[sel.selectedIndex]?.text.split('\u2014')[0].trim()||'')+' @ $'+piecePrice;
  }
  else if(mode==='linear'){
    const sel=document.getElementById('linearServiceSel');
    const defaultPrice=+(sel?.options[sel.selectedIndex]?.dataset.price)||0;
    const svcPrice=linearPriceOverride!==null?linearPriceOverride:defaultPrice;
    const len=+document.getElementById('linearLength')?.value||0;
    const unit=document.getElementById('linearUnitSel')?.value||'ft';
    if(!len){document.getElementById('linearLength')?.focus();return;}
    const convLen=unit==='m'?Math.round(len*3.28084*100)/100:len;
    tot=Math.round(convLen*svcPrice*100)/100;
    const svcName=sel?.options[sel.selectedIndex]?.textContent||'';
    detail=Math.round(convLen*100)/100+' ft × $'+svcPrice.toFixed(2)+' - '+svcName;
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
  else{ /* sqft */
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    const len=+document.getElementById('dimLen')?.value||0;
    const wid=+document.getElementById('dimWid')?.value||0;
    const tsf=+document.getElementById('totalSF')?.value||0;
    let sf;
    if(calcMode==='room'){
      if(!len||!wid){document.getElementById('dimLen')?.focus();return;}
      sf=len*wid;
    }else{
      if(!tsf){document.getElementById('totalSF')?.focus();return;}
      sf=tsf;
    }
    const defaultRate=SQFT_PRICES[v]||3.00;
    const rate=sqftPriceOverride!==null?sqftPriceOverride:defaultRate;
    tot=sf*rate;
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
    detail=Math.round(sf)+' sq ft @ $'+rate.toFixed(2)+'/sf';
    lastEst={tot:Math.round(tot),name,sf:Math.round(sf),len,wid,detail,mode:'sqft'};
  }

  tot=Math.round(tot);
  if(mode!=='sqft') lastEst={tot,name,detail,mode};

  /* show result */
  document.getElementById('resAmt').textContent='$'+tot.toLocaleString('en-US');
  const resMin=document.getElementById('resMin');if(resMin)resMin.style.display='none';
  document.getElementById('calcRes').style.display='block';
  setTimeout(()=>document.getElementById('calcRes').classList.add('show'),10);
  document.getElementById('calcRes').scrollIntoView({behavior:'smooth',block:'nearest'});
  track('calc_calculate',{service:v,total:tot,mode,detail});

  /* ── Cross-sell suggestion after calc result ── */
  showCalcCrossSell(v, tot);
});

/* ── WhatsApp & Copy handlers ── */
document.getElementById('resWa').addEventListener('click',()=>{
  if(!lastEst)return;
  const l=L();
  const m=`${l.waGreet}\n${l.waEstLabel}: ${lastEst.name}\n${lastEst.detail}\n${l.waTotalLabel}: $${lastEst.tot.toLocaleString()}\n${l.waConfirm}`;
  track('calc_share_whatsapp',{service:lastEst.name,total:lastEst.tot});
  window.open('https://wa.me/12133611700?text='+encodeURIComponent(m),'_blank','noopener');
});

document.getElementById('resCopy').addEventListener('click',async()=>{
  if(!lastEst)return;
  const txt=`${lastEst.name}: $${lastEst.tot.toLocaleString()} (${lastEst.detail||''})\nHandy & Friend \u00b7 (213) 361-1700`;
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
        compressModalPhoto(file,function(photoObj){
          if(selectedPhotos.length>=6) return;
          selectedPhotos.push(photoObj);
          addThumb(photoObj);
          photoBtn.classList.add('has-photos');
        });
      });
      photoInput.value=''; // reset so same file can be re-added
    });
  }

  // v11: Compress photos before sending (800px max, JPEG 0.7) — matches chat widget
  function compressModalPhoto(file,callback){
    var img=new Image();
    var reader=new FileReader();
    reader.onload=function(e){
      img.onload=function(){
        var maxDim=800;
        var w=img.width,h=img.height;
        if(w>maxDim||h>maxDim){
          if(w>h){h=Math.round(h*maxDim/w);w=maxDim;}
          else{w=Math.round(w*maxDim/h);h=maxDim;}
        }
        var canvas=document.createElement('canvas');
        canvas.width=w;canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        var compressed=canvas.toDataURL('image/jpeg',0.7);
        callback({dataUrl:compressed,name:file.name||'photo.jpg'});
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
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
// NOTE: phone_click is already tracked via emitCoreEvent() in index.html (tel: link delegation)
// Removed duplicate click_call to avoid double-counting in GA4.
// whatsapp_click tracked via href delegation in index.html (wa.me link listener)

/* ═══════════════════════════════════════════════
   CROSS-SELL ENGINE — every service has 2 best upsells
═══════════════════════════════════════════════ */
/*
 * CROSS-SELL — 3 safe clusters (plumb/elec excluded from auto cross-sell)
 * Cluster 1 (Wall & Install): tv, art, fur, curtain
 * Cluster 2 (Paint & Refresh): paint, floor
 * Cluster 3 (Renovation):      paint, floor, trim/base
 */
const CROSS_SELL = {
  /* Cluster 1: Wall & Install */
  tv: [
    { id:'art',  emoji:'🪞', price:'$150 service call' },
    { id:'fur',  emoji:'🛋️', price:'$150 service call' }
  ],
  fur: [
    { id:'tv',   emoji:'📺', price:'$150 service call' },
    { id:'art',  emoji:'🪞', price:'$150 service call' }
  ],
  /* Cluster 3: Renovation */
  p1: [
    { id:'floor', emoji:'🏠', price:'$3/sf labor estimate' },
    { id:'drywall', emoji:'🔧', price:'$150 service call' }
  ],
  p2: [
    { id:'floor', emoji:'🏠', price:'$3/sf labor estimate' },
    { id:'drywall', emoji:'🔧', price:'$150 service call' }
  ],
  fl: [
    { id:'paint', emoji:'🎨', price:'$3/sf labor estimate' },
    { id:'trim',  emoji:'📏', price:'Quote after photos' }
  ],
  fv: [
    { id:'paint', emoji:'🎨', price:'$3/sf labor estimate' },
    { id:'trim',  emoji:'📏', price:'Quote after photos' }
  ]
  /* plumb, elec: intentionally excluded — standalone services, legal scope flag */
};

/* Map cross-sell IDs to tab IDs for calculator tab switching */
const XSELL_TAB_MAP = {
  paint:'p1', floor:'fl',
  tv:'tv', fur:'fur', art:'tv', plumb:'plumb', elec:'plumb',
  trim:'linear', smart:'plumb', base:'linear', drywall:'fur'
};

function getXsellName(id) {
  const l = L();
  const nameMap = {
    drywall: 'Drywall Repair',
    paint: l.svcs?.find(s=>s.id==='paint')?.name || 'Interior Painting',
    floor: l.svcs?.find(s=>s.id==='floor')?.name || 'Flooring',
    tv:    l.svcs?.find(s=>s.id==='tv')?.name || 'TV Mounting',
    fur:   l.svcs?.find(s=>s.id==='fur')?.name || 'Furniture Assembly',
    art:   l.svcs?.find(s=>s.id==='art')?.name || 'Art & Mirrors',
    plumb: l.svcs?.find(s=>s.id==='plumb')?.name || 'Plumbing',
    elec:  l.svcs?.find(s=>s.id==='elec')?.name || 'Electrical',
    trim:  'Baseboard / Trim',
    smart: 'Smart Doorbell / Lock',
    base:  'Baseboard Install'
  };
  return nameMap[id] || id;
}

/* Show cross-sell suggestion under calculator result */
function showCalcCrossSell(svcId, total) {
  let box = document.getElementById('calcCrossSell');
  if (!box) {
    box = document.createElement('div');
    box.id = 'calcCrossSell';
    const calcRes = document.getElementById('calcRes');
    if (calcRes) calcRes.parentNode.insertBefore(box, calcRes.nextSibling);
  }

  const suggestions = CROSS_SELL[svcId];
  if (!suggestions || suggestions.length === 0) {
    box.style.display = 'none';
    return;
  }

  const l = L();
  const xsellTitle = {
    en: 'Add to your project — Same Visit',
    es: 'Agrega a tu proyecto — Misma Visita',
    ru: 'Добавь к заказу — Один визит',
    ua: 'Додай до замовлення — Один візит'
  }[lang] || 'Add to your project — Same Visit';

  const xsellCta = {
    en: 'Add & Get Quote',
    es: 'Agregar y Cotizar',
    ru: 'Добавить и узнать цену',
    ua: 'Додати й дізнатись ціну'
  }[lang] || 'Add & Get Quote';

  let html = `<div style="margin-top:14px;padding:14px 16px;background:linear-gradient(135deg,rgba(184,137,44,0.08),rgba(184,137,44,0.03));border:1px solid rgba(184,137,44,0.25);border-radius:12px">
    <div style="font-size:13px;font-weight:700;color:#B8892C;margin-bottom:10px">🎁 ${xsellTitle}</div>`;

  suggestions.forEach(s => {
    const name = getXsellName(s.id);
    const tabId = XSELL_TAB_MAP[s.id] || s.id;
    html += `<div class="xsell-item" data-xsell-tab="${tabId}" data-xsell-sub="${s.id==='art'?'art':s.id==='elec'?'elec':''}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:6px;background:#fff;border-radius:10px;border:1px solid rgba(184,137,44,0.15);cursor:pointer;transition:all 200ms" onmouseover="this.style.borderColor='#B8892C'" onmouseout="this.style.borderColor='rgba(184,137,44,0.15)'">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">${s.emoji}</span>
        <div>
          <div style="font-size:14px;font-weight:600;color:#2a1f14">${name}</div>
          <div style="font-size:12px;color:#8a7a6a">${s.price}</div>
        </div>
      </div>
      <span style="font-size:12px;font-weight:700;color:#B8892C;white-space:nowrap">${xsellCta} →</span>
    </div>`;
  });

  html += `<div style="text-align:center;margin-top:6px;font-size:11px;color:#8a7a6a">💡 ${
    {en:'Book 2+ services in one visit',es:'Reserva 2+ servicios en una visita',ru:'Закажи 2+ услуги за один визит',ua:'Замов 2+ послуги за один візит'}[lang]||'Book 2+ services in one visit'
  }</div></div>`;

  box.innerHTML = html;
  box.style.display = 'block';

  /* Click handler: switch calculator to the cross-sell service tab */
  box.querySelectorAll('.xsell-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabSvc = item.dataset.xsellTab;
      const subType = item.dataset.xsellSub;
      const tab = document.querySelector('.calc-tab[data-svc="' + tabSvc + '"]');
      if (tab) {
        document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSvc = tabSvc;
        if (subType === 'art') activeFixedSub = 'art';
        else if (subType === 'elec') activeFixedSub = 'elec';
        renderCalculatorUI();
        document.getElementById('calcBox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        track('xsell_calc_click', { from: currentSvc, to: tabSvc });
      }
    });
  });
}

/* ═══════════════════════════════════════════════
   COMBO PROMO — mini block under each service card
═══════════════════════════════════════════════ */
const COMBO_PAIRS = {
  /* Cluster 3: Renovation */
  paint: { partner: 'floor', label: 'Painting + Flooring' },
  floor: { partner: 'paint', label: 'Flooring + Painting' },
  /* Cluster 1: Wall & Install */
  tv:    { partner: 'art',   label: 'TV Mounting + Art Hanging' },
  art:   { partner: 'tv',    label: 'Art Hanging + TV Mounting' },
  fur:   { partner: 'tv',    label: 'Furniture Assembly + TV Mounting' },
  /* plumb/elec: standalone — no combo badge */
};

function buildComboPromo(svcId){
  const pair=COMBO_PAIRS[svcId];
  if(!pair)return '';
  const l=L();
  const withSvc=l.svcs.find(s=>s.id===pair.partner);
  if(!withSvc)return '';
  const waMsg=encodeURIComponent(
    `${l.waGreet}\nCombo: ${l.svcs.find(s=>s.id===svcId)?.name} + ${withSvc.name}\n${l.waConfirm}`
  );
  return `<a class="cpromo" href="https://wa.me/12133611700?text=${waMsg}" target="_blank" rel="noopener" onclick="event.stopPropagation();track('combo_promo_click',{from:'${svcId}',to:'${pair.partner}'})">
    <span class="cpromo-tag">COMBO</span>
    <span class="cpromo-pair">${pair.label}</span>
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
  const LABELS = { tv:'TV Mounting', fur:'Furniture Assembly', art:'Art & Mirror Hanging',
                   paint:'Interior Painting', floor:'Flooring', curtain:'Curtain Rods' };
  const IDS = Object.keys(LABELS);

  function populate(sel, excludeId) {
    sel.innerHTML = '<option value="">Pick a service…</option>';
    IDS.forEach(id => {
      if (id === excludeId) return;
      const o = document.createElement('option');
      o.value = id; o.textContent = LABELS[id];
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
    document.getElementById('ccOriginal').textContent   = '$150 / service call';
    document.getElementById('ccDiscounted').textContent = 'Written quote';
    document.getElementById('ccSave').textContent       = 'Scope confirmed in writing';
    const msg = encodeURIComponent('Hi! I want to book two services in one visit: ' + LABELS[a] + ' + ' + LABELS[b] + '. Please confirm availability.');
    document.getElementById('ccWa').href = 'https://wa.me/12133611700?text=' + msg;
    res.style.display = 'block';
    track('combo_calc_view', {svc_a:a, svc_b:b});
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
  const msg = encodeURIComponent('Hi! Interested in combining: ' + p.label + '. Please confirm availability.');
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
    if(inp.closest('.kitchen-extra-calcs')) return;
    if(inp.classList.contains('price-edit')) return;
    if(inp.closest('.univ-calcs')) return;
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
