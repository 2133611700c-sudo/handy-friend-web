import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const {
  getPricingSourceVersion,
  getCanonicalPriceMatrix,
  getService
} = require('../lib/price-registry.js');

const details = {
  tv_mounting: {
    standard: getService('tv_mounting')?.base_prices?.standard ?? 105,
    hidden_wire: getService('tv_mounting')?.base_prices?.hidden_wire ?? 185
  },
  furniture_assembly: {
    small_item: getService('furniture_assembly')?.base_prices?.small_item ?? 75,
    dresser: getService('furniture_assembly')?.base_prices?.dresser ?? 95,
    bed_frame: getService('furniture_assembly')?.base_prices?.bed_frame ?? 115,
    pax_hourly: getService('furniture_assembly')?.base_prices?.pax_hourly ?? 50
  },
  art_mirrors: {
    up_to_5_pieces: getService('art_mirrors')?.base_prices?.up_to_5_pieces ?? 95,
    curtain_first: getService('art_mirrors')?.base_prices?.curtain_first ?? 75,
    curtain_each: getService('art_mirrors')?.base_prices?.curtain_each ?? 30
  },
  interior_painting: {
    wall_1coat: getService('interior_painting')?.base_prices?.wall_1coat ?? 3.0,
    wall_2coats: getService('interior_painting')?.base_prices?.wall_2coats ?? 3.75,
    ceiling_smooth: getService('interior_painting')?.base_prices?.ceiling_smooth ?? 3.75,
    ceiling_textured: getService('interior_painting')?.base_prices?.ceiling_textured ?? 4.25,
    baseboard: getService('interior_painting')?.base_prices?.baseboard ?? 3.0,
    crown_ornate: getService('interior_painting')?.base_prices?.crown_ornate ?? 3.75,
    door_casing_side: getService('interior_painting')?.base_prices?.door_casing_side ?? 30,
    baseboard_install: getService('interior_painting')?.base_prices?.baseboard_install ?? 2.5,
    door_slab: getService('interior_painting')?.base_prices?.door_slab ?? 65,
    prep: 0.65,
    wallpaper: 1.25,
    mold: 1.5
  },
  flooring: {
    laminate: getService('flooring')?.base_prices?.laminate ?? 3.0,
    lvp: getService('flooring')?.base_prices?.lvp ?? 3.0,
    demo: getService('flooring')?.base_prices?.demo ?? 1.5,
    underlayment: getService('flooring')?.base_prices?.underlayment ?? 0.5,
    transition: getService('flooring')?.base_prices?.transition ?? 30,
    baseboard_remove_reinstall: 2.0,
    door_undercut: 30,
    spot_leveling: 60
  },
  kitchen_cabinet_painting: {
    full_package: getService('kitchen_cabinet_painting')?.base_prices?.full_package ?? 75,
    spray_both_sides: getService('kitchen_cabinet_painting')?.base_prices?.spray_both_sides ?? 70,
    spray_one_side: getService('kitchen_cabinet_painting')?.base_prices?.spray_one_side ?? 40,
    roller_budget: getService('kitchen_cabinet_painting')?.base_prices?.roller_budget ?? 7.25,
    drawer_small: getService('kitchen_cabinet_painting')?.base_prices?.drawer_small ?? 25,
    drawer_large: getService('kitchen_cabinet_painting')?.base_prices?.drawer_large ?? 35,
    end_panel: getService('kitchen_cabinet_painting')?.base_prices?.end_panel ?? 50,
    island: getService('kitchen_cabinet_painting')?.base_prices?.island ?? 175,
    interior_section: getService('kitchen_cabinet_painting')?.base_prices?.interior_section ?? 30,
    heavy_degreasing: 10,
    oak_grain_filling: 35,
    two_tone: 125,
    glass_masking: 10,
    hardware_hole_filling: 10,
    topcoat_upgrade: 15,
    deep_repair: 20,
    remove_contact_paper_hourly: 50,
    caulking: 1.25
  },
  furniture_painting: {
    chair: getService('furniture_painting')?.base_prices?.chair ?? 40,
    nightstand: getService('furniture_painting')?.base_prices?.nightstand ?? 65,
    dresser: getService('furniture_painting')?.base_prices?.dresser ?? 170,
    dining_table: getService('furniture_painting')?.base_prices?.dining_table ?? 130,
    builtin_lf: getService('furniture_painting')?.base_prices?.builtin_lf ?? 60
  },
  plumbing: {
    faucet: getService('plumbing')?.base_prices?.faucet ?? 115,
    shower_head: getService('plumbing')?.base_prices?.shower_head ?? 60,
    toilet_tank: getService('plumbing')?.base_prices?.toilet_tank ?? 95,
    recaulk: getService('plumbing')?.base_prices?.recaulk ?? 110
  },
  electrical: {
    light_fixture: getService('electrical')?.base_prices?.light_fixture ?? 95,
    outlet_switch_first: getService('electrical')?.base_prices?.outlet_switch_first ?? 75,
    smart_device: getService('electrical')?.base_prices?.smart_device ?? 85,
    outlet_switch_additional: getService('electrical')?.base_prices?.outlet_switch_additional ?? 30
  }
};

const browserRegistry = {
  version: getPricingSourceVersion(),
  canonical: getCanonicalPriceMatrix(),
  details,
  combos: [
    {
      key: 'paint_flooring_combo',
      svcs: ['🎨 Paint 300sf', '🏠 Floor 200sf'],
      orig: 1500,
      price: 1200,
      save: 300
    },
    {
      key: 'cabinet_furniture_combo',
      svcs: ['🍳 Kitchen 15 doors', '🎨 Furniture Painting 2 pcs'],
      orig: 715,
      price: 572,
      save: 143
    }
  ]
};

const out = `/* Auto-generated from lib/price-registry.js. Do not edit manually. */\nwindow.HF_PRICE_REGISTRY = ${JSON.stringify(browserRegistry, null, 2)};\n`;
const outPath = path.resolve(__dirname, '../assets/js/price-registry.browser.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log(`Generated ${outPath}`);
