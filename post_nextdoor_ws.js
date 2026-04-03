const fs = require('fs');

const PAGE_ID = '985C57CDA356B837C219922CC3F17910';
const WS_URL = `ws://localhost:18800/devtools/page/${PAGE_ID}`;

let msgId = 1;
const callbacks = new Map();

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    callbacks.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    const timer = setTimeout(() => {
      if (callbacks.has(id)) {
        callbacks.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }
    }, 20000);
    callbacks.get(id).timer = timer;
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function evaluate(ws, expr) {
  const r = await sendCommand(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result.value;
}

async function screenshot(ws, path) {
  const ss = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path, Buffer.from(ss.data, 'base64'));
  console.log('Screenshot:', path);
}

async function clickElement(ws, selector) {
  const result = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `
      (function() {
        const el = document.querySelector('${selector}');
        if (el) {
          el.scrollIntoView();
          el.click();
          return 'clicked: ' + el.textContent.trim().substring(0, 50);
        }
        return 'NOT FOUND: ${selector}';
      })()
    `,
    returnByValue: true
  });
  return result.result.value;
}

async function main() {
  const ws = new WebSocket(WS_URL);

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        clearTimeout(cb.timer);
        callbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }
    } catch(e) {}
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', (e) => reject(new Error('WS error')));
  });

  console.log('Connected!');

  // Navigate to Nextdoor Page section (business page posts)
  const navResult = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `window.location.href = 'https://nextdoor.com/pages/posts/'`,
    returnByValue: true
  });
  await sleep(4000);

  const currentUrl = await evaluate(ws, 'window.location.href');
  console.log('URL after nav:', currentUrl);

  await screenshot(ws, '/tmp/nd_step1.png');

  ws.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
