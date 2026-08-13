// services/http.js
// Helper simples de fetch com timeout + retry + respeito ao Retry-After.
// Usa global fetch se disponível, senão tenta usar undici.fetch (já presente via discord.js).

const { setTimeout: wait } = require('timers/promises');

function getFetch() {
    if (typeof globalThis.fetch === 'function') return globalThis.fetch;
    try {
        // undici está presente como dependência via discord.js
        // ele exporta fetch compatível com WHATWG
        const { fetch } = require('undici');
        return fetch;
    } catch (err) {
        throw new Error('fetch não disponível no ambiente Node e undici não pôde ser carregado.');
    }
}

/**
 * Faz fetch e retorna JSON, com timeout e retries.
 * options:
 *  - method, headers, body, etc (passados para fetch)
 *  - timeout (ms) default 8000
 *  - retries default 3
 *  - retryOn: array de status para retry automático (default [429, 500, 502, 503, 504])
 */
async function fetchJson(url, options = {}) {
    const fetchFn = getFetch();
    const timeout = options.timeout ?? 8000;
    const retries = options.retries ?? 3;
    const retryOn = options.retryOn ?? [429, 500, 502, 503, 504];

    let attempt = 0;
    let lastError = null;

    while (attempt <= retries) {
        attempt += 1;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetchFn(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'User-Agent': options.userAgent || 'GameDealsWatcher/1.0 (+https://github.com/)',
                    Accept: 'application/json, text/plain, */*',
                    ...(options.headers || {})
                }
            });

            clearTimeout(timer);

            // Se retornar Retry-After, e for 429, respeitamos
            if (res.status === 429) {
                const ra = res.headers?.get ? res.headers.get('retry-after') : null;
                const waitMs = ra ? (isNaN(Number(ra)) ? 1000 : Math.ceil(Number(ra) * 1000)) : Math.min(2000 * attempt, 10000);
                await wait(waitMs);
                lastError = new Error(`HTTP ${res.status} (429) - tentativa ${attempt}`);
                if (attempt > retries) throw lastError;
                continue;
            }

            // retryOn statuses
            if (retryOn.includes(res.status) && attempt <= retries) {
                const backoff = Math.min(500 * 2 ** attempt, 5000);
                await wait(backoff);
                lastError = new Error(`HTTP ${res.status} - tentativa ${attempt}`);
                if (attempt > retries) throw lastError;
                continue;
            }

            // Se não é OK, lançamos erro
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status} - ${text.slice(0, 200)}`);
            }

            // tenta parsear JSON
            const txt = await res.text();
            try {
                return JSON.parse(txt);
            } catch (errJson) {
                // se não for JSON, devolve texto cru
                return txt;
            }

        } catch (err) {
            clearTimeout(timer);
            lastError = err;
            // AbortError ou fetch erro de rede -> retry se houver tentativas
            if (attempt > retries) break;
            // backoff antes de tentar de novo
            const backoff = Math.min(500 * 2 ** attempt, 5000);
            await wait(backoff);
            continue;
        }
    }

    throw lastError || new Error('Erro desconhecido no fetchJson');
}

module.exports = { fetchJson };