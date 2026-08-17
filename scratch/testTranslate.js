const { fetchJson } = require('../services/http');

async function translateToPtBr(text) {
    if (!text || text.trim().length === 0) return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const data = await res.json();
        if (data && data[0]) {
            return data[0].map(item => item[0]).filter(Boolean).join('');
        }
    } catch (e) {
        console.log('⚠ Erro na tradução:', e.message);
    }
    return text;
}

(async () => {
    console.log('🔍 Testando tradução automática para PT-BR...');
    const originalTitle = "PUBG GLOBAL SERIES 7 FINAL STAGE DAY 2 IS LIVE";
    const originalDesc = "Hello, PUBG Esports fans! After two circuits in Seoul, the PUBG Global Series is moving to Shanghai, China. PGS Circuit 3, featuring PGS 7, PGS 8, and PGS 9, will take place across three weeks from August 5 to 23.";

    const translatedTitle = await translateToPtBr(originalTitle);
    const translatedDesc = await translateToPtBr(originalDesc);

    console.log('\n--- RESULTADO DA TRADUÇÃO ---');
    console.log('Original Title:', originalTitle);
    console.log('Translated Title:', translatedTitle);
    console.log('\nOriginal Desc:', originalDesc);
    console.log('Translated Desc:', translatedDesc);
})();
