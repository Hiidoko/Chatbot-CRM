// Utilidades de rede (chatbot e CRM)
export async function fetchWithRetry(url, { retries=3, backoff=400, factor=2, jitter=true, ...opts } = {}) {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        let data; try { data = JSON.parse(txt); } catch {}
        const err = new Error(data?.message || txt || `HTTP ${res.status}`);
        err.status = res.status; throw err;
      }
      const ct = res.headers.get('content-type')||'';
      if (ct.includes('application/json')) return res.json();
      return res.text();
    } catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      const delay = backoff * Math.pow(factor, attempt-1) * (jitter ? (0.75 + Math.random()*0.5) : 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
