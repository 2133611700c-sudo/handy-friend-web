/**
 * Service Calculator Modal — Quick pricing calculator for each service
 * Opens in popup modal when clicking service cards
 * Uses updated 2026 pricing from P object
 * FIXED: Smooth animations, prevent screen jumping, multi-language support
 */

const ServiceCalcModal = {
  // Multi-language support
  i18n: {
    en: {
      estimatedCost: 'ESTIMATED COST',
      materialsNotIncluded: 'Materials & taxes not included',
      sendViaWhatsapp: 'Send via WhatsApp',
      fullPackage: 'Full Package (2 sides + box + prep)',
      twoSide: '2-Side Spray',
      oneSide: '1-Side Spray',
      rollerFinish: 'Roller Finish (budget)',
      drawerSmall: 'Drawer Front (small)',
      drawerLarge: 'Drawer Front (large)',
      endPanel: 'End Panel',
      island: 'Island',
      diningChair: 'Dining Chair',
      nightstand: 'Nightstand / Side Table',
      dresser: 'Dresser / Large Cabinet',
      diningTable: 'Dining Table',
      wall1coat: 'Walls — 1 coat (same color)',
      wall2coat: 'Walls — 2 coats (color change)',
      ceilSmooth: 'Ceiling — smooth',
      ceilText: 'Ceiling — textured',
      lvp: 'LVP / Luxury Vinyl',
      laminate: 'Laminate Click-Lock',
      demo: 'Demo Old Floor',
    },
    ru: {
      estimatedCost: 'ПРИМЕРНАЯ СТОИМОСТЬ',
      materialsNotIncluded: 'Материалы и налоги не включены',
      sendViaWhatsapp: 'Отправить в WhatsApp',
      fullPackage: 'Полный пакет (2 стороны + коробка + подготовка)',
      twoSide: 'Покраска 2 сторон',
      oneSide: 'Покраска 1 стороны',
      rollerFinish: 'Валик (бюджет)',
      drawerSmall: 'Фасад ящика (маленький)',
      drawerLarge: 'Фасад ящика (большой)',
      endPanel: 'Боковая панель',
      island: 'Остров',
      diningChair: 'Стул',
      nightstand: 'Тумба / Столик',
      dresser: 'Комод / Шкаф',
      diningTable: 'Обеденный стол',
      wall1coat: 'Стены — 1 слой (один цвет)',
      wall2coat: 'Стены — 2 слоя (смена цвета)',
      ceilSmooth: 'Потолок — гладкий',
      ceilText: 'Потолок — текстурированный',
      lvp: 'Виниловое напольное покрытие',
      laminate: 'Ламинат',
      demo: 'Демонтаж старого пола',
    },
    es: {
      estimatedCost: 'COSTO ESTIMADO',
      materialsNotIncluded: 'Materiales e impuestos no incluidos',
      sendViaWhatsapp: 'Enviar por WhatsApp',
      fullPackage: 'Paquete completo (2 lados + caja + prep)',
      twoSide: 'Pintura 2 lados',
      oneSide: 'Pintura 1 lado',
      rollerFinish: 'Rodillo (presupuesto)',
      drawerSmall: 'Frente de cajón (pequeño)',
      drawerLarge: 'Frente de cajón (grande)',
      endPanel: 'Panel final',
      island: 'Isla',
      diningChair: 'Silla de comedor',
      nightstand: 'Mesita de noche',
      dresser: 'Cómoda / Gabinete grande',
      diningTable: 'Mesa de comedor',
      wall1coat: 'Paredes — 1 capa (mismo color)',
      wall2coat: 'Paredes — 2 capas (cambio de color)',
      ceilSmooth: 'Techo — liso',
      ceilText: 'Techo — texturizado',
      lvp: 'Vinilo de lujo',
      laminate: 'Laminado de clic',
      demo: 'Demolición del piso viejo',
    },
    uk: {
      estimatedCost: 'ПРИБЛИЗНА ВАРТІСТЬ',
      materialsNotIncluded: 'Матеріали та податки не включені',
      sendViaWhatsapp: 'Надіслати в WhatsApp',
      fullPackage: 'Повний пакет (2 сторони + коробка + підготовка)',
      twoSide: 'Фарбування 2 сторін',
      oneSide: 'Фарбування 1 сторони',
      rollerFinish: 'Валик (бюджет)',
      drawerSmall: 'Фасад ящика (малий)',
      drawerLarge: 'Фасад ящика (великий)',
      endPanel: 'Бічна панель',
      island: 'Остріг',
      diningChair: 'Стілець',
      nightstand: 'Тумбочка / Столик',
      dresser: 'Комод / Шафа',
      diningTable: 'Обідній стіл',
      wall1coat: 'Стіни — 1 шар (один колір)',
      wall2coat: 'Стіни — 2 шари (зміна кольору)',
      ceilSmooth: 'Стеля — гладка',
      ceilText: 'Стеля — текстурована',
      lvp: 'Вінілова підлога',
      laminate: 'Ламінат',
      demo: 'Демонтаж старої підлоги',
    }
  },

  // Service configurations with pricing options
  configs: {
    paint: {
      name: 'Interior Painting',
      icon: '🎨',
      options: [
        { id: 'wall1coat', label: 'Walls — 1 coat (same color)', price: 3.00, unit: '/sq ft', qty: 0 },
        { id: 'wall2coat', label: 'Walls — 2 coats (color change)', price: 4.00, unit: '/sq ft', qty: 0 },
        { id: 'ceilSmooth', label: 'Ceiling — smooth', price: 4.00, unit: '/sq ft', qty: 0 },
        { id: 'ceilText', label: 'Ceiling — textured', price: 4.50, unit: '/sq ft', qty: 0 },
      ],
    },
    floor: {
      name: 'Flooring',
      icon: '🏠',
      options: [
        { id: 'lvp', label: 'LVP / Luxury Vinyl', price: 3.00, unit: '/sq ft', qty: 0 },
        { id: 'laminate', label: 'Laminate Click-Lock', price: 3.00, unit: '/sq ft', qty: 0 },
        { id: 'demo', label: 'Demo Old Floor', price: 2.25, unit: '/sq ft', qty: 0 },
      ],
    },
  },

  currentLang: 'en',

  init() {
    this.detectLanguage();
    this.createStyles();
    this.createModal();
    this.attachListeners();
  },

  detectLanguage() {
    // Get language from multiple sources (priority order)
    let lang = 'en';

    // 1. Check localStorage
    const storageLang = localStorage.getItem('lang');
    if (storageLang && ['en', 'ru', 'es', 'uk'].includes(storageLang)) {
      lang = storageLang;
    }
    // 2. Check meta tag
    else {
      const metaLang = document.querySelector('meta[name="lang"]')?.content;
      if (metaLang && ['en', 'ru', 'es', 'uk'].includes(metaLang)) {
        lang = metaLang;
      }
      // 3. Check html lang attribute
      else {
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
          const langPrefix = htmlLang.split('-')[0];
          if (['en', 'ru', 'es', 'uk'].includes(langPrefix)) {
            lang = langPrefix;
          }
        }
      }
    }

    // 4. Watch for language changes
    const observer = new MutationObserver(() => {
      const newLang = localStorage.getItem('lang') || document.documentElement.lang?.split('-')[0] || 'en';
      if (['en', 'ru', 'es', 'uk'].includes(newLang) && newLang !== this.currentLang) {
        this.currentLang = newLang;
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });

    this.currentLang = lang;
  },

  createStyles() {
    // Add smooth animation styles and prevent jumping
    if (!document.getElementById('svcCalcStyles')) {
      const style = document.createElement('style');
      style.id = 'svcCalcStyles';
      style.textContent = `
        #svcCalcModal {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        #svcCalcModal.open {
          opacity: 1;
          visibility: visible;
        }

        #svcCalcModal.open + .svcCalcBackdrop {
          opacity: 1;
          visibility: visible;
        }

        .svcCalcBackdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.6);
          z-index: 9998;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        #svcCalcModalContent {
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        body.svcCalcOpen {
          overflow: hidden;
          padding-right: 15px;
        }

        @media (max-width: 768px) {
          #svcCalcModalContent {
            max-height: 90vh !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  },

  createModal() {
    const html = `
      <div id="svcCalcModal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      ">
        <div id="svcCalcModalContent" style="
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          pointer-events: auto;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 id="svcCalcTitle" style="margin:0;font-size:24px;font-weight:700;color:#1a1410;"></h2>
            <button id="svcCalcClose" style="
              background:none;border:none;font-size:24px;cursor:pointer;color:#999;
            ">&times;</button>
          </div>

          <div id="svcCalcOptions" style="margin-bottom:24px;"></div>

          <div style="
            padding:20px;background:#f5f0e8;border-radius:12px;text-align:center;
            border:1px solid #e8e0d0;
          ">
            <div id="svcCalcEstLabel" style="font-size:13px;color:#666;margin-bottom:8px;"></div>
            <div id="svcCalcTotal" style="
              font-size:36px;font-weight:700;color:#b8860b;font-family:var(--fs,'Playfair Display');
            ">$0</div>
            <div id="svcCalcMaterLabel" style="font-size:12px;color:#999;margin-top:6px;"></div>
          </div>

          <button id="svcCalcWa" style="
            width:100%;margin-top:20px;padding:12px;background:#25d366;color:#fff;
            border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;
            transition: background 0.2s ease;
          "
          onmouseover="this.style.background='#22c55e'"
          onmouseout="this.style.background='#25d366'"
          ></button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  attachListeners() {
    const modal = document.getElementById('svcCalcModal');
    const closeBtn = document.getElementById('svcCalcClose');
    const waBtn = document.getElementById('svcCalcWa');

    closeBtn.addEventListener('click', () => this.close());

    // Click on backdrop to close (prevent close when clicking content)
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'svcCalcModal') {
        this.close();
      }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        this.close();
      }
    });

    // Service card click handlers (skip image clicks for lightbox)
    document.querySelectorAll('[data-svc-calc]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Skip if clicking on image (let lightbox handle it)
        if (e.target.closest('.sph')) return;
        e.preventDefault();
        const svc = card.getAttribute('data-svc-calc');
        this.open(svc);
      });
    });

    waBtn.addEventListener('click', () => this.sendWhatsApp());
  },

  open(svc) {
    const config = this.configs[svc];
    if (!config) return;

    const modal = document.getElementById('svcCalcModal');
    const title = document.getElementById('svcCalcTitle');
    const optionsDiv = document.getElementById('svcCalcOptions');
    const waBtn = document.getElementById('svcCalcWa');
    const i18n = this.i18n[this.currentLang] || this.i18n.en;

    title.textContent = `${config.icon} ${config.name}`;

    // Update labels with current language
    document.getElementById('svcCalcEstLabel').textContent = i18n.estimatedCost;
    document.getElementById('svcCalcMaterLabel').textContent = i18n.materialsNotIncluded;
    waBtn.textContent = i18n.sendViaWhatsapp;

    optionsDiv.innerHTML = config.options
      .map((opt, i) => {
        // Get translated label or fall back to default
        const labelKey = this.getLabelKey(svc, opt.id);
        const translatedLabel = i18n[labelKey] || opt.label;

        return `
          <div style="margin-bottom:16px;">
            <label style="
              display:flex;align-items:center;gap:12px;cursor:pointer;
              padding:12px;background:#f9f6f1;border-radius:8px;
              transition: background 0.2s ease;
            "
            onmouseover="this.style.background='#f0ebe4'"
            onmouseout="this.style.background='#f9f6f1'"
            >
              <input type="number" class="svc-calc-qty" data-opt="${i}" value="${opt.qty || 0}"
                style="width:60px;padding:8px;border:1px solid #d0c5b9;border-radius:4px;font-size:14px;"
                min="0" />
              <span style="flex:1;font-size:14px;font-weight:500;color:#333;">${translatedLabel}</span>
              <span style="font-weight:600;color:#b8860b;white-space:nowrap;">$${opt.price.toFixed(2)}${opt.unit}</span>
            </label>
          </div>
        `;
      })
      .join('');

    // Attach qty change listeners
    optionsDiv.querySelectorAll('.svc-calc-qty').forEach(input => {
      input.addEventListener('input', () => this.updateTotal(svc));
    });

    this.currentSvc = svc;
    this.updateTotal(svc);

    // Smooth open animation
    modal.classList.remove('open');
    // Force reflow to restart animation
    void modal.offsetWidth;
    modal.classList.add('open');

    // Prevent body scroll when modal is open
    document.body.classList.add('svcCalcOpen');
  },

  getLabelKey(svc, optId) {
    // Map option IDs to i18n keys
    const labelMap = {
      kitch: {
        doorFull: 'fullPackage',
        door2side: 'twoSide',
        door1side: 'oneSide',
        doorRoller: 'rollerFinish',
        drawerSmall: 'drawerSmall',
        drawerLarge: 'drawerLarge',
        endPanel: 'endPanel',
        island: 'island',
      },
      furnp: {
        chair: 'diningChair',
        nightstand: 'nightstand',
        dresser: 'dresser',
        diningTable: 'diningTable',
      },
      paint: {
        wall1coat: 'wall1coat',
        wall2coat: 'wall2coat',
        ceilSmooth: 'ceilSmooth',
        ceilText: 'ceilText',
      },
      floor: {
        lvp: 'lvp',
        laminate: 'laminate',
        demo: 'demo',
      },
    };

    return labelMap[svc]?.[optId] || optId;
  },

  close() {
    const modal = document.getElementById('svcCalcModal');
    modal.classList.remove('open');
    document.body.classList.remove('svcCalcOpen');

    // Remove padding after transition completes
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(modal);
      if (computedStyle.opacity === '0') {
        document.body.style.paddingRight = '';
      }
    }, 300);
  },

  updateTotal(svc) {
    const config = this.configs[svc];
    const optionsDiv = document.getElementById('svcCalcOptions');
    let total = 0;

    optionsDiv.querySelectorAll('.svc-calc-qty').forEach((input, i) => {
      const qty = Math.max(0, parseInt(input.value) || 0);
      const opt = config.options[i];
      total += qty * opt.price;
    });

    document.getElementById('svcCalcTotal').textContent = `$${Math.round(total).toLocaleString()}`;
  },

  sendWhatsApp() {
    const svc = this.currentSvc;
    const config = this.configs[svc];
    const optionsDiv = document.getElementById('svcCalcOptions');
    const total = document.getElementById('svcCalcTotal').textContent;

    let desc = `${config.icon} ${config.name}\n`;
    optionsDiv.querySelectorAll('.svc-calc-qty').forEach((input, i) => {
      const qty = Math.max(0, parseInt(input.value) || 0);
      if (qty > 0) {
        const opt = config.options[i];
        desc += `• ${qty} × ${opt.label} = $${(qty * opt.price).toLocaleString()}\n`;
      }
    });
    desc += `\nTotal: ${total}`;

    const waUrl = `https://wa.me/12133611700?text=${encodeURIComponent(desc)}`;
    window.open(waUrl, '_blank');
  },
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ServiceCalcModal.init());
} else {
  ServiceCalcModal.init();
}
