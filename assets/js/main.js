/* ═══════════════════════════════════════════════
   PRICES (numbers only — labels in T{})
═══════════════════════════════════════════════ */
const P={
  base:{call:150,hr:70,visit:75,paintMin:500,floorMin:500},
  paint:{w1:2.25,w2:3.00,cs:2.50,ct:3.25,cg:4.00,
    prep:.80,wp:1.60,ps:1.20,mold:2.00,
    base:4.50,casS:5.00,casP:5.75,crown:6.75,deco:7.75,min:500},
  floor:{lam:4.25,lvp:5.00,demo:2.00,under:.75,brd:2.50,trans:45,door:45,min:500}
};

/* ═══════════════════════════════════════════════
   PHOTOS
═══════════════════════════════════════════════ */
const SVC_IMG={
  tv:   'assets/img/tv-mounting.jpg',
  fur:  'assets/img/furniture.jpg',
  art:  'assets/img/art.jpg',
  paint:'assets/img/painting.jpg',
  floor:'assets/img/flooring.jpeg',
  plumb:'assets/img/plumbing.jpeg',
  elec: 'assets/img/electrical.jpeg'
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
    heroH:"Premium Handyman\nLos Angeles",
    heroSub:"Labor only · No markup on materials · Same-week availability",
    gridLbl:"Tap any service for full pricing",
    base:["$150 service call","$70/hr after 2h","$500 min · paint & floors"],
    svcs:[
      {id:"tv",   name:"TV Mounting",   from:"$150"},
      {id:"fur",  name:"Furniture",     from:"$150"},
      {id:"art",  name:"Art & Mirrors", from:"$150"},
      {id:"paint",name:"Painting",      from:"$2.25/sf"},
      {id:"floor",name:"Flooring",      from:"$4.25/sf"},
      {id:"plumb",name:"Plumbing",      from:"$150"},
      {id:"elec", name:"Electrical",    from:"$150"}
    ],
    calcTitle:"Quick Estimate",
    calcSub:"Enter room size → instant price",
    lSvc:"Service",lLen:"Length (ft)",lWid:"Width (ft)",
    lBase:"Baseboards (lin ft)",lTrans:"Transitions (qty)",lDoorU:"Door undercuts (qty)",
    lHrs:"Estimated hours",anchorBtn:"Get Free Estimate",
    lModeRoom:"Room (L×W)",lModeTotal:"Total sq ft",lSfTotal:"Total sq ft",
    hrBadgeHint:"Enter estimated hours above",
    hrBadgeIncl:"Included in service call",
    hrBadgeFmt:(extra,tot)=>`$150 call + ${extra}h × $70 = <strong>$${tot}</strong>`,
    areaTotalHint:"Enter total sq ft",
    areaTotalFmt:(sf)=>`Total area = <strong>${sf} sq ft</strong>`,
    waGreet:"Hi Handy & Friend! 👋",
    waEstLabel:"Estimate",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Hours: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Room: ${len}ft × ${wid}ft = ${sf} sq ft`,
    waConfirm:"Please confirm availability.",
    calcSubHr:"Service call $150 · +$70/hr after 2h",
    opts:[
      {v:"tv", l:"TV Mounting ($150 service call)"},
      {v:"fur",l:"Furniture Assembly ($150 service call)"},
      {v:"art",l:"Art & Mirrors Hanging ($150 service call)"},
      {v:"plumb",l:"Plumbing ($150 service call)"},
      {v:"elec",l:"Electrical ($150 service call)"},
      {v:"p1",l:"Painting — 1 coat (same color)"},
      {v:"p2",l:"Painting — 2 coats (color change)"},
      {v:"fl",l:"Flooring — Laminate ($4.25/sf)"},
      {v:"fv",l:"Flooring — LVP ($5.00/sf)"}
    ],
    ap:[
      {id:"prep", l:"+ Sanding / prep",       p:"+$0.80/sf"},
      {id:"wallp",l:"+ Wallpaper removal",     p:"+$1.60/sf"},
      {id:"mold", l:"+ Mold treatment",        p:"+$2.00/sf"},
      {id:"strip",l:"+ Paint stripping",       p:"+$1.20/sf"}
    ],
    af:[
      {id:"demo", l:"+ Demo existing floor",   p:"+$2.00/sf"},
      {id:"under",l:"+ Underlayment",          p:"+$0.75/sf"}
    ],
    calcBtn:"Calculate",
    resLbl:"Estimated labor cost",
    resSub:"Estimate only · Final price after photos or site visit",
    minApplied:"Minimum order applied",
    waBtn:"Send via WhatsApp",copyBtn:"Copy estimate",
    areaHint:(l,w,sf)=>l&&w?`${l} ft × ${w} ft = <strong>${sf} sq ft</strong>`:"Enter room length & width",
    sF1:"Main surfaces",sF2:"Prep add-ons",sF3:"Trim & millwork (per lin ft)",
    sG1:"Installation",sG2:"Add-ons & extras",
    /* DRAWER ROWS — all 7 services */
    dr:{
      prov:"You provide",
      tvScope:"Fixed price",tvDesc:"Surface cable mgmt included. $150 service call applies.",
      tv:[
        ["Standard mount (up to 65\") — drywall / studs","$150","1–1.5h"],
        ["Mount + concealed wires (in-wall or cable channel)","$220","2–2.5h"]
      ],
      tvProv:"TV bracket / arm",
      tvN:"Bracket not included. Concealed-wire option requires no fire blocks in wall. All holes patched & painted.",
      furScope:"Fixed price",furDesc:"$150 service call applies to small items. Hourly for PAX.",
      fur:[
        ["Small items (2–3 pcs) — nightstand / chair / shelf","$150","1–1.5h"],
        ["Dresser (3–6 drawers)","$200","2–3h"],
        ["Bed frame (storage/lift mechanism = +$70/hr)","$275","2.5–4h"],
        ["PAX / large closet system","$70/hr · min 4h ($280)","≥4h"]
      ],
      furProv:"All parts, hardware & instructions",
      furN:"Excess complexity or missing parts billed at $70/hr after included time.",
      artScope:"Fixed price",artDesc:"Up to 5 pieces. Level guarantee included.",
      art:[
        ["Art / Mirrors — up to 5 pcs, max 40 lbs per piece","$150","up to 2h"],
        ["Curtain rods / Blinds — 1st window","$150","1.5–2.5h"],
        ["Each additional window","+$30","~30 min"]
      ],
      artProv:"Hardware, anchors, brackets",
      artN:"Gallery walls >5 pieces billed at $70/hr after 2h. Standard drywall / stud walls only.",
      plumbScope:"Cosmetic only · No permits",plumbDesc:"Existing shutoffs must work. No new lines.",
      plumb:[
        ["Faucet replacement — kitchen or bathroom","$195","1.5–2.5h"],
        ["Shower head replacement","$150","< 1h"],
        ["Toilet tank / flapper repair","$150","~1h"],
        ["Re-caulk tub / shower (old caulk removal included)","$215","2–3h"]
      ],
      plumbProv:"Fixture, faucet, or parts",
      plumbN:"Shutoff valves must be functional. Heavy mold = extra charge. Anything beyond cosmetic scope → licensed C-36 plumber referral.",
      elecScope:"Like-for-like only · No permits",elecDesc:"Replacement in existing boxes only. No new circuits.",
      elec:[
        ["Light fixture swap — 1 fixture (existing box)","$175","1–2h"],
        ["Outlets / switches — first 3 units","$150","1–2h"],
        ["Each additional outlet or switch","+$20/ea","~15 min"],
        ["Smart doorbell / Smart lock + app setup","$195","1.5–2.5h"]
      ],
      elecProv:"Fixture, device, or switch",
      elecN:"Ceiling fans with new support box → licensed C-10 electrician. No panel work, no new runs.",
      paintScope:"Per sq ft · Labor only",paintDesc:"SF = painted surface (walls/ceiling), NOT floor area.",
      pF1:[
        ["Walls — 1 coat (same color refresh)","$2.25/sf"],
        ["Walls — 2 coats (color change or quality finish)","$3.00/sf"],
        ["Ceiling — smooth (2 coats)","$2.50/sf"],
        ["Ceiling — textured (2 coats)","$3.25/sf"],
        ["Ceiling — semi-gloss / gloss (2 coats)","$4.00/sf"]
      ],
      pF2:[
        ["+ Sanding / prep coat","+$0.80/sf"],
        ["+ Wallpaper removal","+$1.60/sf"],
        ["+ Heavy paint stripping (spot areas only)","+$1.20/sf"],
        ["+ Mold surface treatment (not remediation)","+$2.00/sf"]
      ],
      pF3:[
        ["Baseboards (2 coats)","$4.50/lf"],
        ["Door casings — simple (2 coats)","$5.00/lf"],
        ["Door casings — profile (2 coats)","$5.75/lf"],
        ["Crown / cornice molding","$6.75/lf"],
        ["Decorative plaster / high detail","$7.75/lf"]
      ],
      paintProv:"All paint, primer & tools",
      paintN:"$500 minimum. Estimate visit $75 → credited at job start. Materials by client, no markup.",
      flScope:"Per sq ft · Labor only",flDesc:"Output: 120–250 sq ft per day depending on product.",
      flG1:[
        ["Laminate click-lock","$4.25/sf"],
        ["LVP / Luxury Vinyl click","$5.00/sf"]
      ],
      flG2:[
        ["Demo — existing laminate / vinyl","+$2.00/sf"],
        ["Debris removal","$75–$150"],
        ["Underlayment installation","+$0.75/sf"],
        ["Transition strip","$45/ea"],
        ["Baseboard remove + reinstall","$2.50/lf"],
        ["Door undercut (per door)","$45–$65"],
        ["Spot leveling (problem areas)","$2.50–$5.00/sf"]
      ],
      flProv:"Flooring, underlayment & transitions",
      flN:"$500 minimum. Leveling compound & subfloor repairs quoted on-site after assessment."
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
    tvTime:"1–2h",furTime:"1.5–4h",artTime:"1–2.5h",
    paintTime:"Varies by area",floorTime:"Varies by area",
    plumbTime:"1–3h",elecTime:"1–2.5h",

    tvBenefit:"No mess. Wall-safe mounting.",
    furBenefit:"All parts included. Fully assembled.",
    artBenefit:"Level guarantee. Properly secured.",
    paintBenefit:"Professional finish. No spillage.",
    floorBenefit:"Clean installation. Debris removed.",
    plumbBenefit:"No leaks. Quality fixtures.",
    elecBenefit:"Safe wiring. Code-compliant.",

    tvBadge:"Most popular",paintBadge:"Same-day possible",

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
    heroH:"Handyman Premium\nLos Ángeles",
    heroSub:"Solo mano de obra · Sin margen en materiales · Misma semana",
    gridLbl:"Toca un servicio para ver precios completos",
    base:["Min $150 visita","$70/hr después de 2h","Min $500 pintura/pisos"],
    svcs:[
      {id:"tv",   name:"Montaje TV",      from:"$150"},
      {id:"fur",  name:"Muebles",        from:"$150"},
      {id:"art",  name:"Arte & Espejos",  from:"$150"},
      {id:"paint",name:"Pintura",        from:"$2.25/ft²"},
      {id:"floor",name:"Pisos",          from:"$4.25/ft²"},
      {id:"plumb",name:"Plomería",       from:"$150"},
      {id:"elec", name:"Eléctrico",      from:"$150"}
    ],
    calcTitle:"Calculadora de precio",
    calcSub:"Dimensiones del cuarto → precio",
    lSvc:"Servicio",lLen:"Largo (pies)",lWid:"Ancho (pies)",
    lBase:"Zócalos (pie lineal)",lTrans:"Transiciones (cant.)",lDoorU:"Recortes de puerta (cant.)",
    lHrs:"Horas estimadas",anchorBtn:"Obtener estimado",
    lModeRoom:"Habitación (L×A)",lModeTotal:"Total ft²",lSfTotal:"Total ft²",
    hrBadgeHint:"Ingresa las horas estimadas arriba",
    hrBadgeIncl:"Incluido en la llamada de servicio",
    hrBadgeFmt:(extra,tot)=>`$150 llamada + ${extra}h × $70 = <strong>$${tot}</strong>`,
    areaTotalHint:"Ingresa el total de ft²",
    areaTotalFmt:(sf)=>`Área total = <strong>${sf} ft²</strong>`,
    waGreet:"¡Hola Handy & Friend! 👋",
    waEstLabel:"Cotización",waTotalLabel:"Total",
    waHoursDetail:(h)=>`Horas: ~${h}h`,
    waRoomDetail:(len,wid,sf)=>`Habitación: ${len}ft × ${wid}ft = ${sf} ft²`,
    waConfirm:"Por favor confirme disponibilidad.",
    calcSubHr:"Llamada $150 · +$70/hr después de 2h",
    opts:[
      {v:"tv", l:"Montaje de TV ($150 llamada de servicio)"},
      {v:"fur",l:"Ensamblaje de muebles ($150 llamada)"},
      {v:"art",l:"Cuadros & Espejos ($150 llamada)"},
      {v:"plumb",l:"Plomería ($150 llamada de servicio)"},
      {v:"elec",l:"Eléctrico ($150 llamada de servicio)"},
      {v:"p1",l:"Pintura — 1 capa (mismo color)"},
      {v:"p2",l:"Pintura — 2 capas (cambio de color)"},
      {v:"fl",l:"Pisos — Laminado ($4.25/ft²)"},
      {v:"fv",l:"Pisos — LVP ($5.00/ft²)"}
    ],
    ap:[
      {id:"prep", l:"+ Preparación / lijado",    p:"+$0.80/ft²"},
      {id:"wallp",l:"+ Retirar tapiz",           p:"+$1.60/ft²"},
      {id:"mold", l:"+ Tratamiento de moho",     p:"+$2.00/ft²"},
      {id:"strip",l:"+ Quitar pintura vieja",    p:"+$1.20/ft²"}
    ],
    af:[
      {id:"demo", l:"+ Demo piso existente",     p:"+$2.00/ft²"},
      {id:"under",l:"+ Underlayment / base",     p:"+$0.75/ft²"}
    ],
    calcBtn:"Calcular",
    resLbl:"Costo estimado de mano de obra",
    resSub:"Solo estimado · Precio final tras fotos o visita en sitio",
    minApplied:"Mínimo de pedido aplicado",
    waBtn:"Enviar por WhatsApp",copyBtn:"Copiar estimado",
    areaHint:(l,w,sf)=>l&&w?`${l} pies × ${w} pies = <strong>${sf} ft²</strong>`:"Ingresa largo × ancho del cuarto",
    sF1:"Superficies principales",sF2:"Preparación (adicional)",sF3:"Molduras (por pie lineal)",
    sG1:"Instalación",sG2:"Servicios adicionales",
    dr:{
      prov:"Usted provee",
      tvScope:"Precio fijo",tvDesc:"Manejo de cables superficiales incluido. Min $150 aplicado.",
      tv:[
        ["Soporte estándar (hasta 65\") — pared/vigas","$150","1–1.5h"],
        ["Soporte + cables ocultos (en pared / canaleta)","$220","2–2.5h"]
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
        ["Arte / Espejos — hasta 5 pcs, máx 40 lbs c/u","$150","hasta 2h"],
        ["Cortineros / Persianas — 1ra ventana","$150","1.5–2.5h"],
        ["Cada ventana adicional","+$30","~30 min"]
      ],
      artProv:"Herraje, anclajes y soportes",
      artN:"Galerías >5 piezas se cobran a $70/hr después de 2h. Solo paredes estándar de drywall / vigas.",
      plumbScope:"Solo cosmético · Sin permisos",plumbDesc:"Válvulas existentes deben funcionar. Sin líneas nuevas.",
      plumb:[
        ["Reemplazo de grifo — cocina o baño","$195","1.5–2.5h"],
        ["Reemplazo de cabeza de ducha","$150","< 1h"],
        ["Reparación de tanque / flapper","$150","~1h"],
        ["Sellado de bañera / ducha (retiro incluido)","$215","2–3h"]
      ],
      plumbProv:"Grifo, accesorio o piezas de repuesto",
      plumbN:"Válvulas de cierre deben funcionar. Moho severo = cargo extra. Cualquier cosa fuera del alcance cosmético → plomero C-36.",
      elecScope:"Solo equivalente · Sin permisos",elecDesc:"Solo reemplazo en cajas existentes. Sin circuitos nuevos.",
      elec:[
        ["Cambio de luminaria — 1 (caja existente)","$175","1–2h"],
        ["Enchufes / interruptores — primeros 3","$150","1–2h"],
        ["Cada enchufe o interruptor adicional","+$20/ea","~15 min"],
        ["Timbre smart / Cerradura smart + configuración app","$195","1.5–2.5h"]
      ],
      elecProv:"Luminaria, dispositivo o interruptor",
      elecN:"Ventiladores con nueva caja de soporte → electricista C-10. Sin trabajo de panel ni nuevas líneas.",
      paintScope:"Por pie² · Solo mano de obra",paintDesc:"ft² = superficie pintada (paredes/techo), NO área del piso.",
      pF1:[
        ["Paredes — 1 capa (mismo color)","$2.25/ft²"],
        ["Paredes — 2 capas (cambio de color / acabado)","$3.00/ft²"],
        ["Techo — liso (2 capas)","$2.50/ft²"],
        ["Techo — texturizado (2 capas)","$3.25/ft²"],
        ["Techo — semi-brillante / brillante","$4.00/ft²"]
      ],
      pF2:[
        ["+ Lijado / capa de imprimación","+$0.80/ft²"],
        ["+ Retiro de tapiz","+$1.60/ft²"],
        ["+ Raspado de pintura vieja (puntual)","+$1.20/ft²"],
        ["+ Tratamiento de moho superficial","+$2.00/ft²"]
      ],
      pF3:[
        ["Zócalos (2 capas)","$4.50/lf"],
        ["Marcos de puerta — simple (2 capas)","$5.00/lf"],
        ["Marcos de puerta — perfil (2 capas)","$5.75/lf"],
        ["Cornisa / moldura corona","$6.75/lf"],
        ["Yeso decorativo / alto detalle","$7.75/lf"]
      ],
      paintProv:"Toda la pintura, imprimación y herramientas",
      paintN:"Mínimo $500. Visita de estimado $75 → se acredita al inicio. Materiales por cliente, sin margen.",
      flScope:"Por pie² · Solo mano de obra",flDesc:"Rendimiento: 120–250 ft² por día según el producto.",
      flG1:[
        ["Laminado click-lock","$4.25/ft²"],
        ["LVP / Vinilo de lujo click","$5.00/ft²"]
      ],
      flG2:[
        ["Demo — laminado / vinilo existente","+$2.00/ft²"],
        ["Retiro de escombros","$75–$150"],
        ["Instalación de underlayment","+$0.75/ft²"],
        ["Tira de transición","$45/ea"],
        ["Zócalo: retirar + instalar","$2.50/lf"],
        ["Recorte inferior de puerta","$45–$65"],
        ["Nivelación puntual (zonas problema)","$2.50–$5.00/ft²"]
      ],
      flProv:"Piso, base y transiciones",
      flN:"Mínimo $500. Compuesto de nivelación y reparaciones de subsuelo: cotización en sitio."
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
    tvTime:"1–2h",furTime:"1.5–4h",artTime:"1–2.5h",
    paintTime:"Varía según el área",floorTime:"Varía según el área",
    plumbTime:"1–3h",elecTime:"1–2.5h",

    tvBenefit:"Sin desorden. Montaje seguro en pared.",
    furBenefit:"Todas las piezas incluidas. Completamente ensamblado.",
    artBenefit:"Garantía de nivel. Bien asegurado.",
    paintBenefit:"Acabado profesional. Sin derrames.",
    floorBenefit:"Instalación limpia. Escombros retirados.",
    plumbBenefit:"Sin fugas. Accesorios de calidad.",
    elecBenefit:"Cableado seguro. Conforme a códigos.",

    tvBadge:"Más popular",paintBadge:"Posible mismo día",

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
    heroH:"Мастер на дом\nЛос-Анджелес",
    heroSub:"Только работа · Без наценки на материалы · Запись на эту неделю",
    gridLbl:"Нажмите на услугу — откроется полный прайс",
    base:["Выезд от $150","$70/час после 2ч","Минимум $500 покраска/полы"],
    svcs:[
      {id:"tv",   name:"Монтаж ТВ",       from:"$150"},
      {id:"fur",  name:"Мебель",          from:"$150"},
      {id:"art",  name:"Картины & Зерк.", from:"$150"},
      {id:"paint",name:"Покраска",        from:"$2.25/кф"},
      {id:"floor",name:"Полы",            from:"$4.25/кф"},
      {id:"plumb",name:"Сантехника",      from:"$150"},
      {id:"elec", name:"Электрика",       from:"$150"}
    ],
    calcTitle:"Калькулятор площади",
    calcSub:"Введите размеры комнаты → получите цену",
    lSvc:"Услуга",lLen:"Длина (футов)",lWid:"Ширина (футов)",
    lBase:"Плинтуса (пог.фут)",lTrans:"Порожки (шт.)",lDoorU:"Подрезка дверей (шт.)",
    lHrs:"Ориентировочное кол-во часов",anchorBtn:"Рассчитать стоимость",
    lModeRoom:"Комната (Д×Ш)",lModeTotal:"Общая площадь",lSfTotal:"Кв.футов всего",
    hrBadgeHint:"Введите кол-во часов выше",
    hrBadgeIncl:"Входит в стоимость вызова",
    hrBadgeFmt:(extra,tot)=>`Вызов $150 + ${extra}ч × $70 = <strong>$${tot}</strong>`,
    areaTotalHint:"Введите кв.футов",
    areaTotalFmt:(sf)=>`Общая площадь = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привет, Handy & Friend! 👋",
    waEstLabel:"Смета",waTotalLabel:"Итого",
    waHoursDetail:(h)=>`Часов: ~${h}ч`,
    waRoomDetail:(len,wid,sf)=>`Комната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Пожалуйста, подтвердите наличие.",
    calcSubHr:"Вызов $150 · +$70/час после 2ч",
    opts:[
      {v:"tv", l:"Монтаж ТВ ($150 вызов мастера)"},
      {v:"fur",l:"Сборка мебели ($150 вызов мастера)"},
      {v:"art",l:"Картины & Зеркала ($150 вызов)"},
      {v:"plumb",l:"Сантехника ($150 вызов мастера)"},
      {v:"elec",l:"Электрика ($150 вызов мастера)"},
      {v:"p1",l:"Покраска — 1 слой (тот же цвет)"},
      {v:"p2",l:"Покраска — 2 слоя (смена цвета)"},
      {v:"fl",l:"Ламинат ($4.25/кв.фут)"},
      {v:"fv",l:"LVP ($5.00/кв.фут)"}
    ],
    ap:[
      {id:"prep", l:"+ Подготовка / шлифовка",  p:"+$0.80/кф"},
      {id:"wallp",l:"+ Снятие обоев",            p:"+$1.60/кф"},
      {id:"mold", l:"+ Обработка плесени",       p:"+$2.00/кф"},
      {id:"strip",l:"+ Снятие старой краски",    p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покрытия",       p:"+$2.00/кф"},
      {id:"under",l:"+ Укладка подложки",        p:"+$0.75/кф"}
    ],
    calcBtn:"Рассчитать",
    resLbl:"Стоимость работ (ориентировочно)",
    resSub:"Примерная цена · Точная — после фото или выезда на объект",
    minApplied:"Применён минимум заказа",
    waBtn:"Отправить в WhatsApp",copyBtn:"Скопировать расчёт",
    areaHint:(l,w,sf)=>l&&w?`${l} фут × ${w} фут = <strong>${sf} кв.фут</strong>`:"Введите длину и ширину комнаты",
    sF1:"Основные поверхности",sF2:"Подготовка (доп.)",sF3:"Молдинги / отделка (пог.фут)",
    sG1:"Укладка",sG2:"Дополнительные работы",
    dr:{
      prov:"Вы обеспечиваете",
      tvScope:"Фиксированная цена",tvDesc:"Укладка кабелей по поверхности включена. Минимальный выезд $150.",
      tv:[
        ["Стандартный кронштейн (до 65\") — гипсокартон/балки","$150","1–1.5ч"],
        ["Кронштейн + скрытая проводка (в стене или кабель-канал)","$220","2–2.5ч"]
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
        ["Картины / Зеркала — до 5 шт., до 40 фунтов за шт.","$150","до 2ч"],
        ["Карнизы / Жалюзи — 1-е окно","$150","1.5–2.5ч"],
        ["Каждое дополнительное окно","+$30","~30 мин"]
      ],
      artProv:"Крепёж, анкеры, кронштейны",
      artN:"Галерея >5 предметов — $70/ч после 2ч. Только стандартные стены (гипсокартон/балки).",
      plumbScope:"Только косметика · Без разрешений",plumbDesc:"Запорные клапаны должны работать. Без новых линий.",
      plumb:[
        ["Замена крана — кухня или ванная","$195","1.5–2.5ч"],
        ["Замена душевой лейки","$150","< 1ч"],
        ["Ремонт бачка унитаза / клапана","$150","~1ч"],
        ["Повторная герметизация ванны / душа (удаление старого включено)","$215","2–3ч"]
      ],
      plumbProv:"Кран, смеситель или запчасти",
      plumbN:"Запорные клапаны должны работать. Сильная плесень — доплата. Всё сверх косметики → направление C-36.",
      elecScope:"Только замена аналогом · Без разрешений",elecDesc:"Только замена в существующих коробках. Без новых линий.",
      elec:[
        ["Замена светильника — 1 шт. (существующая коробка)","$175","1–2ч"],
        ["Розетки / выключатели — первые 3 шт.","$150","1–2ч"],
        ["Каждая дополнительная розетка или выключатель","+$20/шт.","~15 мин"],
        ["Умный звонок / Умный замок + настройка приложения","$195","1.5–2.5ч"]
      ],
      elecProv:"Светильник, устройство или выключатель",
      elecN:"Вентиляторы с новой опорной коробкой → лицензированный C-10. Без работ на щитке, без новых цепей.",
      paintScope:"За кв.фут · Только работа",paintDesc:"кф = площадь окрашиваемой поверхности (стены/потолок), НЕ площадь пола.",
      pF1:[
        ["Стены — 1 слой (обновление цвета)","$2.25/кф"],
        ["Стены — 2 слоя (смена цвета / чистовая отделка)","$3.00/кф"],
        ["Потолок — гладкий (2 слоя)","$2.50/кф"],
        ["Потолок — текстурный (2 слоя)","$3.25/кф"],
        ["Потолок — полуглянец / глянец","$4.00/кф"]
      ],
      pF2:[
        ["+ Шлифовка / грунтовочный слой","+$0.80/кф"],
        ["+ Снятие обоев","+$1.60/кф"],
        ["+ Снятие старой краски (точечно)","+$1.20/кф"],
        ["+ Обработка поверхности от плесени","+$2.00/кф"]
      ],
      pF3:[
        ["Плинтуса (2 слоя)","$4.50/пф"],
        ["Дверные коробки — простые (2 слоя)","$5.00/пф"],
        ["Дверные коробки — профиль (2 слоя)","$5.75/пф"],
        ["Карниз / молдинг корона","$6.75/пф"],
        ["Декоративная штукатурка / высокая детализация","$7.75/пф"]
      ],
      paintProv:"Вся краска, грунт и инструменты",
      paintN:"Минимум $500. Выезд для оценки $75 → засчитывается в стоимость работ. Материалы — клиент, без наценки.",
      flScope:"За кв.фут · Только работа",flDesc:"Выработка: 120–250 кв.фут в день в зависимости от продукта.",
      flG1:[
        ["Ламинат замковый (click-lock)","$4.25/кф"],
        ["LVP / Роскошный виниловый ламинат","$5.00/кф"]
      ],
      flG2:[
        ["Демонтаж — существующий ламинат / винил","+$2.00/кф"],
        ["Вывоз мусора","$75–$150"],
        ["Укладка подложки","+$0.75/кф"],
        ["Порожек перехода","$45/шт."],
        ["Плинтус: снять + установить","$2.50/пф"],
        ["Подрезка двери (за дверь)","$45–$65"],
        ["Точечное выравнивание (проблемные зоны)","$2.50–$5.00/кф"]
      ],
      flProv:"Покрытие, подложка и порожки",
      flN:"Минимум $500. Выравнивающая смесь и ремонт чернового пола — оценка на месте после осмотра."
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
    tvTime:"1–2ч",furTime:"1.5–4ч",artTime:"1–2.5ч",
    paintTime:"Зависит от площади",floorTime:"Зависит от площади",
    plumbTime:"1–3ч",elecTime:"1–2.5ч",

    tvBenefit:"Без беспорядка. Безопасное крепление на стену.",
    furBenefit:"Все части включены. Полная сборка.",
    artBenefit:"Гарантия уровня. Надежное крепление.",
    paintBenefit:"Профессиональная отделка. Без пролива.",
    floorBenefit:"Чистая установка. Мусор вывезен.",
    plumbBenefit:"Без протечек. Качественная фурнитура.",
    elecBenefit:"Безопасная проводка. По кодексу.",

    tvBadge:"Самый популярный",paintBadge:"Возможно в тот же день",

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
    heroH:"Майстер на дому\nЛос-Анджелес",
    heroSub:"Тільки робота · Без націнки на матеріали · Запис на цей тиждень",
    gridLbl:"Натисніть на послугу — відкриється повний прайс",
    base:["Виїзд від $150","$70/год після 2год","Мінімум $500 фарбування/підлоги"],
    svcs:[
      {id:"tv",   name:"Монтаж ТВ",        from:"$150"},
      {id:"fur",  name:"Меблі",            from:"$150"},
      {id:"art",  name:"Картини & Дзерк.", from:"$150"},
      {id:"paint",name:"Фарбування",       from:"$2.25/кф"},
      {id:"floor",name:"Підлога",          from:"$4.25/кф"},
      {id:"plumb",name:"Сантехніка",       from:"$150"},
      {id:"elec", name:"Електрика",        from:"$150"}
    ],
    calcTitle:"Калькулятор площі",
    calcSub:"Введіть розміри кімнати → отримайте ціну",
    lSvc:"Послуга",lLen:"Довжина (фут)",lWid:"Ширина (фут)",
    lBase:"Плінтуси (пог.фут)",lTrans:"Поріжки (шт.)",lDoorU:"Підрізання дверей (шт.)",
    lHrs:"Орієнтовна кількість годин",anchorBtn:"Розрахувати вартість",
    lModeRoom:"Кімната (Д×Ш)",lModeTotal:"Загальна площа",lSfTotal:"Кв.фут загалом",
    hrBadgeHint:"Введіть кількість годин вище",
    hrBadgeIncl:"Входить у вартість виклику",
    hrBadgeFmt:(extra,tot)=>`Виклик $150 + ${extra}год × $70 = <strong>$${tot}</strong>`,
    areaTotalHint:"Введіть кв.фут",
    areaTotalFmt:(sf)=>`Загальна площа = <strong>${sf} кв.фут</strong>`,
    waGreet:"Привіт, Handy & Friend! 👋",
    waEstLabel:"Кошторис",waTotalLabel:"Всього",
    waHoursDetail:(h)=>`Годин: ~${h}год`,
    waRoomDetail:(len,wid,sf)=>`Кімната: ${len}фт × ${wid}фт = ${sf} кв.фут`,
    waConfirm:"Просимо підтвердити наявність.",
    calcSubHr:"Виклик $150 · +$70/год після 2год",
    opts:[
      {v:"tv", l:"Монтаж ТВ ($150 виклик майстра)"},
      {v:"fur",l:"Складання меблів ($150 виклик)"},
      {v:"art",l:"Картини & Дзеркала ($150 виклик)"},
      {v:"plumb",l:"Сантехніка ($150 виклик майстра)"},
      {v:"elec",l:"Електрика ($150 виклик майстра)"},
      {v:"p1",l:"Фарбування — 1 шар (той самий колір)"},
      {v:"p2",l:"Фарбування — 2 шари (зміна кольору)"},
      {v:"fl",l:"Ламінат ($4.25/кв.фут)"},
      {v:"fv",l:"LVP ($5.00/кв.фут)"}
    ],
    ap:[
      {id:"prep", l:"+ Підготовка / шліфування",  p:"+$0.80/кф"},
      {id:"wallp",l:"+ Зняття шпалер",            p:"+$1.60/кф"},
      {id:"mold", l:"+ Обробка плісняви",         p:"+$2.00/кф"},
      {id:"strip",l:"+ Зняття старої фарби",      p:"+$1.20/кф"}
    ],
    af:[
      {id:"demo", l:"+ Демонтаж покриття",        p:"+$2.00/кф"},
      {id:"under",l:"+ Укладання підкладки",      p:"+$0.75/кф"}
    ],
    calcBtn:"Розрахувати",
    resLbl:"Вартість робіт (орієнтовно)",
    resSub:"Приблизна ціна · Точна — після фото або виїзду на об'єкт",
    minApplied:"Застосовано мінімум замовлення",
    waBtn:"Надіслати у WhatsApp",copyBtn:"Скопіювати розрахунок",
    areaHint:(l,w,sf)=>l&&w?`${l} фут × ${w} фут = <strong>${sf} кв.фут</strong>`:"Введіть довжину та ширину кімнати",
    sF1:"Основні поверхні",sF2:"Підготовка (додатково)",sF3:"Молдинги / оздоблення (пог.фут)",
    sG1:"Укладання",sG2:"Додаткові роботи",
    dr:{
      prov:"Ви забезпечуєте",
      tvScope:"Фіксована ціна",tvDesc:"Укладання кабелів по поверхні включено. Мінімальний виїзд $150.",
      tv:[
        ["Стандартне кріплення (до 65\") — гіпсокартон/балки","$150","1–1.5год"],
        ["Кріплення + прихована проводка (в стіні або кабель-канал)","$220","2–2.5год"]
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
        ["Картини / Дзеркала — до 5 шт., до 40 фунтів за шт.","$150","до 2год"],
        ["Карнизи / Жалюзі — 1-е вікно","$150","1.5–2.5год"],
        ["Кожне додаткове вікно","+$30","~30 хв"]
      ],
      artProv:"Кріплення, анкери, кронштейни",
      artN:"Галерея >5 предметів — $70/год після 2год. Тільки стандартні стіни (гіпсокартон/балки).",
      plumbScope:"Тільки косметика · Без дозволів",plumbDesc:"Запірні клапани мають працювати. Без нових ліній.",
      plumb:[
        ["Заміна крана — кухня або ванна","$195","1.5–2.5год"],
        ["Заміна душової лійки","$150","< 1год"],
        ["Ремонт бачка унітазу / клапана","$150","~1год"],
        ["Повторне герметизування ванни / душу (видалення старого включено)","$215","2–3год"]
      ],
      plumbProv:"Кран, змішувач або запчастини",
      plumbN:"Запірні клапани мають працювати. Сильна пліснява — доплата. Все що виходить за косметику → направлення C-36.",
      elecScope:"Тільки заміна аналогом · Без дозволів",elecDesc:"Тільки заміна в існуючих коробках. Без нових ліній.",
      elec:[
        ["Заміна світильника — 1 шт. (існуюча коробка)","$175","1–2год"],
        ["Розетки / вимикачі — перші 3 шт.","$150","1–2год"],
        ["Кожна додаткова розетка або вимикач","+$20/шт.","~15 хв"],
        ["Розумний дзвінок / Розумний замок + налаштування додатку","$195","1.5–2.5год"]
      ],
      elecProv:"Світильник, пристрій або вимикач",
      elecN:"Стельові вентилятори з новою опорною коробкою → ліцензований C-10. Без робіт на щитку, без нових цепів.",
      paintScope:"За кв.фут · Тільки робота",paintDesc:"кф = площа поверхні фарбування (стіни/стеля), НЕ площа підлоги.",
      pF1:[
        ["Стіни — 1 шар (оновлення кольору)","$2.25/кф"],
        ["Стіни — 2 шари (зміна кольору / чистова обробка)","$3.00/кф"],
        ["Стеля — гладка (2 шари)","$2.50/кф"],
        ["Стеля — текстурна (2 шари)","$3.25/кф"],
        ["Стеля — напівглянець / глянець","$4.00/кф"]
      ],
      pF2:[
        ["+ Шліфування / ґрунтувальний шар","+$0.80/кф"],
        ["+ Зняття шпалер","+$1.60/кф"],
        ["+ Зняття старої фарби (точково)","+$1.20/кф"],
        ["+ Обробка поверхні від плісняви","+$2.00/кф"]
      ],
      pF3:[
        ["Плінтуси (2 шари)","$4.50/пф"],
        ["Дверні коробки — прості (2 шари)","$5.00/пф"],
        ["Дверні коробки — профіль (2 шари)","$5.75/пф"],
        ["Карниз / молдинг корона","$6.75/пф"],
        ["Декоративна штукатурка / висока деталізація","$7.75/пф"]
      ],
      paintProv:"Вся фарба, ґрунт та інструменти",
      paintN:"Мінімум $500. Виїзд для оцінки $75 → зараховується у вартість робіт. Матеріали — клієнт, без націнки.",
      flScope:"За кв.фут · Тільки робота",flDesc:"Виробіток: 120–250 кв.фут на день залежно від продукту.",
      flG1:[
        ["Ламінат замковий (click-lock)","$4.25/кф"],
        ["LVP / Розкішний вініловий ламінат","$5.00/кф"]
      ],
      flG2:[
        ["Демонтаж — існуючий ламінат / вініл","+$2.00/кф"],
        ["Вивіз сміття","$75–$150"],
        ["Укладання підкладки","+$0.75/кф"],
        ["Поріжок переходу","$45/шт."],
        ["Плінтус: зняти + встановити","$2.50/пф"],
        ["Підрізання дверей (за двері)","$45–$65"],
        ["Точкове вирівнювання (проблемні зони)","$2.50–$5.00/кф"]
      ],
      flProv:"Покриття, підкладка та поріжки",
      flN:"Мінімум $500. Вирівнювальна суміш та ремонт чорнової підлоги — оцінка на місці після огляду."
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
    tvTime:"1–2год",furTime:"1.5–4год",artTime:"1–2.5год",
    paintTime:"Залежить від площі",floorTime:"Залежить від площі",
    plumbTime:"1–3год",elecTime:"1–2.5год",

    tvBenefit:"Без беруху. Безпечне кріплення на стіну.",
    furBenefit:"Усі деталі включені. Повне збирання.",
    artBenefit:"Гарантія рівня. Надійне кріплення.",
    paintBenefit:"Професійна обробка. Без розливів.",
    floorBenefit:"Чисте встановлення. Сміття вивезено.",
    plumbBenefit:"Без протіканння. Якісна фурнітура.",
    elecBenefit:"Безпечна проводка. За кодексом.",

    tvBadge:"Найпопулярніший",paintBadge:"Можна в той же день",

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
   RUNTIME
═══════════════════════════════════════════════ */

/* ─── GA4 Universal Tracker ─── */
function track(name, params={}) {
  try { if(typeof gtag==='function') gtag('event', name, params); } catch(e){}
}
let lang=localStorage.getItem('hf_lang')||'en';
let calcMode='room';
function L(){return T[lang]||T.en}
let lastEst=null;

/* ─── SMS CAPTURE HANDLER ─── */
function handleSmsCapture(e) {
  if(e)e.preventDefault();

  const phone = document.getElementById('smsPhone').value;
  const consent = document.getElementById('smsMktConsent').checked;
  const l = L();

  if (!phone) {
    alert('Please provide your phone number');
    return;
  }

  if (!consent) {
    alert('Please agree to receive SMS');
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

      // Track in Meta Pixel
      if (typeof fbq !== 'undefined') {
        fbq('track', 'SMS_Lead', {
          value: calcResAmt,
          currency: 'USD'
        });
      }

      // Track in GA4
      if (typeof gtag !== 'undefined') {
        gtag('event', 'sms_lead_generated', {
          estimate: calcResAmt
        });
      }
    } else {
      alert('Error sending SMS. Please try again.');
    }
  })
  .catch(err => {
    console.error('SMS error:', err);
    alert('Network error. Please try again.');
  });
}

function applyLang(){
  localStorage.setItem('hf_lang',lang);
  document.documentElement.lang=lang==='ua'?'uk':lang; // SEO: update <html lang>
  const l=L();
  // Show current lang · show next lang hint
  const o=['en','es','ru','ua'];
  const nextL=T[o[(o.indexOf(lang)+1)%4]].lang;
  document.getElementById('langTxt').textContent=l.lang;
  document.getElementById('langNext').textContent=`→ ${nextL}`;
  document.getElementById('heroH').innerHTML=l.heroH.replace('\n','<br>');
  document.getElementById('heroSub').textContent=l.heroSub;
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

  renderGrid();
  updateAddons();
  updateArea();
}

/* ─── SERVICE CARD DETAILS MAPPING ─── */
const serviceDetails = {
  tv: {
    time: 'tvTime',
    benefit: 'tvBenefit',
    badge: 'tvBadge'
  },
  fur: {
    time: 'furTime',
    benefit: 'furBenefit',
    badge: null
  },
  art: {
    time: 'artTime',
    benefit: 'artBenefit',
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
  plumb: {
    time: 'plumbTime',
    benefit: 'plumbBenefit',
    badge: null
  },
  elec: {
    time: 'elecTime',
    benefit: 'elecBenefit',
    badge: null
  }
};

function renderGrid(){
  const g=document.getElementById('servGrid');
  g.innerHTML='';
  const l = L();
  l.svcs.forEach(svc=>{
    const card=document.createElement('div');
    card.className='scard';
    const phHTML=`<div class="sph"><img src="${SVC_IMG[svc.id]||''}" alt="${svc.name}" loading="lazy" width="320" height="190" decoding="async"></div>`;

    // Get service details (time, benefit, badge)
    const detail = serviceDetails[svc.id];
    const timeText = detail && detail.time ? l[detail.time] : '';
    const benefitText = detail && detail.benefit ? l[detail.benefit] : '';
    const badgeKey = detail && detail.badge ? detail.badge : null;
    const badgeText = badgeKey ? l[badgeKey] : '';

    // Build extra details HTML
    let extraHTML = '';
    if(timeText) {
      extraHTML += `<div class="card-time"><strong>${l.cardTimeLabel}</strong> ${timeText}</div>`;
    }
    if(benefitText) {
      extraHTML += `<div class="card-benefit">${benefitText}</div>`;
    }
    if(badgeText) {
      extraHTML += `<div class="card-badge">${badgeText}</div>`;
    }

    card.innerHTML=`${phHTML}
      <div class="scb">
        <div class="scbd">
          <div class="scn">${svc.name}</div>
          <div class="scp"><b>${svc.from}</b></div>
          ${extraHTML}
        </div>
        <div class="schev">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M2 3.5L4.5 6L7 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="drawer" id="dr_${svc.id}">
        <div class="dri" id="dri_${svc.id}"></div>
      </div>`;
    card.addEventListener('click',(e)=>{
      // prevent clicks inside the open drawer from re-triggering toggle
      if(e.target.closest('.drawer'))return;
      toggle(svc.id);
    });
    g.appendChild(card);
    buildDrawer(svc.id);
  });
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
      +`<div class="dmin">⚡ Min $${P.paint.min}</div>`
      +C(d.prov,d.paintProv)+N(d.paintN);
  }
  if(id==='floor'){
    h=H(d.flScope,d.flDesc)
      +S(l.sG1)+R(d.flG1)
      +S(l.sG2)+R(d.flG2,true)
      +`<div class="dmin">⚡ Min $${P.floor.min}</div>`
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
      if(window.innerWidth<900){
        setTimeout(()=>{card.scrollIntoView({behavior:'smooth',block:'nearest'});},120);
      }
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

const HOURLY_SVCS=['tv','fur','art','plumb','elec'];
function isHourly(v){return HOURLY_SVCS.includes(v);}

function updateAddons(){
  const v=document.getElementById('svcSel').value;
  const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
  const hourly=isHourly(v);
  const l=L();
  const list=ip?l.ap:ifl?l.af:[];
  document.getElementById('addonGroup').innerHTML=list.map(a=>
    `<label class="arow"><input type="checkbox" id="ao_${a.id}"><span>${a.l}</span><span class="ap">${a.p}</span></label>`
  ).join('');
  document.getElementById('bpWrap').style.display=ip?'flex':'none';
  document.getElementById('flWrap').style.display=ifl?'block':'none';
  /* Toggle area-based vs hourly UI */
  const modeDiv=document.querySelector('.mode');
  const roomWrap=document.getElementById('roomWrap');
  const sfWrap=document.getElementById('sfWrap');
  const areaBadge=document.getElementById('areaBadge');
  const hrWrap=document.getElementById('hrWrap');
  const hrBadge=document.getElementById('hrBadge');
  const calcSubEl=document.getElementById('calcSub');
  if(hourly){
    modeDiv.style.display='none';
    roomWrap.style.display='none';
    sfWrap.style.display='none';
    areaBadge.style.display='none';
    hrWrap.style.display='flex';
    hrBadge.style.display='block';
    if(calcSubEl)calcSubEl.textContent=L().calcSubHr;
    updateHrBadge();
  } else {
    modeDiv.style.display='flex';
    areaBadge.style.display='block';
    hrWrap.style.display='none';
    hrBadge.style.display='none';
    if(calcSubEl)calcSubEl.textContent=L().calcSub;
    /* Restore area mode UI */
    roomWrap.style.display=calcMode==='room'?'grid':'none';
    sfWrap.style.display=calcMode==='total'?'flex':'none';
    updateArea();
  }
}

function updateHrBadge(){
  const h=+document.getElementById('hoursInput').value||0;
  const badge=document.getElementById('hrBadge');
  const l=L();
  if(!h){badge.innerHTML=l.hrBadgeHint;return;}
  const extra=Math.max(0,h-2);
  const tot=Math.round(150+extra*70);
  badge.innerHTML=extra>0
    ?l.hrBadgeFmt(extra,tot)
    :`$150 call<br><strong>${l.hrBadgeIncl}</strong>`;
}

document.getElementById('svcSel').addEventListener('change',updateAddons);
['dimLen','dimWid','totalSF'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',updateArea);});
document.getElementById('hoursInput').addEventListener('input',updateHrBadge);

document.getElementById('calcBtn').addEventListener('click',()=>{
  const v=document.getElementById('svcSel').value;
  const name=L().opts.find(o=>o.v===v)?.l||'';
  let tot=0, min=150, sf=0, len=0, wid=0, hours=0;

  if(isHourly(v)){
    /* ── Hourly / flat-fee services ── */
    hours=+document.getElementById('hoursInput').value||0;
    if(!hours){document.getElementById('hoursInput').focus();return;}
    const extra=Math.max(0,hours-2);
    tot=Math.round(150+extra*70);
    min=150;
    lastEst={tot,name,sf:0,len:0,wid:0,min,hours};
  } else {
    /* ── Area-based services (paint / floor) ── */
    const ip=v==='p1'||v==='p2',ifl=v==='fl'||v==='fv';
    len=+document.getElementById('dimLen').value||0;
    wid=+document.getElementById('dimWid').value||0;
    const tsf=+document.getElementById('totalSF')?.value||0;
    if(calcMode==='room'){
      if(!len||!wid){document.getElementById('dimLen').focus();return;}
    } else {
      if(!tsf){document.getElementById('totalSF').focus();return;}
    }
    sf=(calcMode==='total')?tsf:(len*wid);
    min=500;
    if(v==='p1')tot=sf*P.paint.w1;
    if(v==='p2')tot=sf*P.paint.w2;
    if(v==='fl')tot=sf*P.floor.lam;
    if(v==='fv')tot=sf*P.floor.lvp;
    if(ip){
      if(document.getElementById('ao_prep')?.checked)  tot+=sf*P.paint.prep;
      if(document.getElementById('ao_wallp')?.checked) tot+=sf*P.paint.wp;
      if(document.getElementById('ao_mold')?.checked)  tot+=sf*P.paint.mold;
      if(document.getElementById('ao_strip')?.checked) tot+=sf*P.paint.ps;
      tot+=(+document.getElementById('baseLF')?.value||0)*P.paint.base;
    }
    if(ifl){
      if(document.getElementById('ao_demo')?.checked)  tot+=sf*P.floor.demo;
      if(document.getElementById('ao_under')?.checked) tot+=sf*P.floor.under;
      tot+=(+document.getElementById('transQty')?.value||0)*P.floor.trans;
      tot+=(+document.getElementById('doorQty')?.value||0)*P.floor.door;
    }
    tot=Math.round(tot);
    lastEst={tot,name,sf:Math.round(sf),len,wid,min};
  }

  const minApplied=tot<min;
  if(minApplied)tot=min;
  if(lastEst)lastEst.tot=tot;
  document.getElementById('resAmt').textContent='$'+tot.toLocaleString('en-US');
  const rm=document.getElementById('resMin');
  if(minApplied){rm.style.display='inline-flex';
    document.getElementById('resMinTxt').textContent=L().minApplied+' (min $'+min+')';}
  else rm.style.display='none';
  document.getElementById('calcRes').classList.add('show');

  /* Show SMS capture form after result */
  const smsCaptureEl = document.getElementById('smsCaptureMini');
  if(smsCaptureEl) {
    smsCaptureEl.style.display = 'block';
    // Reset SMS form for new estimate
    document.getElementById('smsPhone').value = '';
    document.getElementById('smsMktConsent').checked = false;
    // Clear previous success message if any
    const oldHTML = smsCaptureEl.innerHTML;
    if(!oldHTML.includes('smsPhone')) {
      // Re-render the form if it was replaced with success message
      const l = L();
      smsCaptureEl.innerHTML = `
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#3a3a3a" id="smsCaptureTitle">${l.smsCaptureTitle}</h3>
        <div style="display:grid;gap:10px">
          <input type="tel" id="smsPhone" placeholder="${l.smsPhonePlaceholder}" style="padding:12px;border:1px solid #d9d1c0;border-radius:8px;font-size:14px;font-family:inherit">
          <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#666">
            <input type="checkbox" id="smsMktConsent" style="margin-top:2px;width:18px;height:18px">
            <span id="smsConsent">${l.smsConsent}</span>
          </label>
          <button id="smsSendBtn" style="padding:12px;background:#3a3a3a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:opacity 200ms">${l.smsSendBtn}</button>
        </div>
      `;
      // Reattach button listener
      document.getElementById('smsSendBtn').addEventListener('click', handleSmsCapture);
    }
  }

  document.getElementById('calcRes').scrollIntoView({behavior:'smooth',block:'nearest'});
  track('calc_calculate',{service:v,area_sqft:Math.round(sf),total:tot,hours});
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
  try{await navigator.clipboard.writeText(txt);}catch(e){}
  const btn=document.getElementById('resCopy'),old=btn.textContent;
  btn.textContent='✓ Copied!';setTimeout(()=>{btn.textContent=old;},1800);
});

document.getElementById('langBtn').addEventListener('click',()=>{
  const o=['en','es','ru','ua'];
  lang=o[(o.indexOf(lang)+1)%4];
  track('language_change',{language:lang});
  applyLang();
});

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

applyLang();updateAddons();updateArea();

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
