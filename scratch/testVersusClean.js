const { fetchJson } = require('../services/http');

function cleanHardwareQuery(str) {
    if (!str) return '';
    return str
        .replace(/(\d+(\.\d+)?\s*(ghz|mhz|gb|mb|tb))/gi, '')
        .replace(/(turbo|cores|threads|gigabyte|nvidia|geforce|asus|rog|strix|msi|evga|zotac|galax|pny|xfx|sapphire|powercolor|asrock|rgb|dlss|ray\s*tracing|branco|black|white|oc|edition)/gi, '')
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

(async () => {
    const testCases = [
        'AMD Ryzen 5 7600 / 7600X',
        '4060 ti rog strix',
        'AMD Ryzen 7 5700x',
        'RTX2060',
        'AMD Ryzen 5 5500 3.6GHz (4.2GHz Turbo), 6-Cores 12-Threads,',
        'RTX 4060 AERO OC Gigabyte NVIDIA GeForce, 8GB GDDR6, RGB, DLSS, Ray Tracing, Branco'
    ];

    for (const raw of testCases) {
        const cleaned = cleanHardwareQuery(raw) || raw;
        const url = `https://versus.com/api/search?q=${encodeURIComponent(cleaned)}&lang=br`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const data = await res.json();
            const top = data[0];
            const pts = top?.pts || 0;
            const score = pts > 0 ? Math.max(15, Math.min(99, Math.round(pts / 57.5))) : 0;
            console.log(`RAW: "${raw.slice(0, 35)}..." => CLEANED: "${cleaned}" => FOUND: "${top?.name}" => PTS: ${pts} => SCORE: ${score}`);
        } catch (e) {
            console.error('Err:', e.message);
        }
    }
})();
