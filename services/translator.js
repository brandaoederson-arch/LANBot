const { fetchJson } = require('./http');

/**
 * Traduz qualquer texto para Português do Brasil (PT-BR) automaticamente.
 * Se o texto já estiver em Português ou houver falha de rede, retorna o texto limpo.
 */
async function translateToPtBr(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return text || '';
    }

    try {
        const cleanInput = text.trim();
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(cleanInput)}`;

        const data = await fetchJson(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            },
            timeout: 5000,
            retries: 2
        });

        if (data && Array.isArray(data[0])) {
            const translatedSegments = data[0].map(item => item && item[0]).filter(Boolean);
            if (translatedSegments.length > 0) {
                return translatedSegments.join('');
            }
        }
    } catch (error) {
        console.log('⚠ Tradutor: Erro ao traduzir texto, usando original:', error.message);
    }

    return text;
}

module.exports = {
    translateToPtBr
};
