/* eslint-disable @typescript-eslint/no-require-imports -- Shared Electron/Node startup helpers. */
const http = require('node:http');

function isWorkbenchURL(url, origin) {
  try { return new URL(url).origin === origin; }
  catch { return false; }
}

function isWorkbenchReady(appUrl, timeout = 1200) {
  return new Promise((resolve) => {
    const request = http.get(new URL('/api/health', appUrl), { timeout }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 4096) { request.destroy(); resolve(false); }
      });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(response.statusCode === 200 && data.service === 'atlas-workspace' && data.ready === true);
        } catch { resolve(false); }
      });
      response.on('error', () => resolve(false));
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
    const deadline = setTimeout(() => { request.destroy(); resolve(false); }, timeout);
    request.on('close', () => clearTimeout(deadline));
  });
}

module.exports = { isWorkbenchReady, isWorkbenchURL };
