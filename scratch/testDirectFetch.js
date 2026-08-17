const reportLinks = require('../config/pubgReportLinks.json');

(async () => {
    console.log('Testing direct API fetch for pubg.report...');
    for (const [playerName, profileUrl] of Object.entries(reportLinks)) {
        const accountId = profileUrl.split('/players/')[1];
        if (!accountId) continue;

        const apiUrl = `https://api.pubg.report/v1/players/${accountId}/streams`;
        try {
            const res = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) {
                console.log(`❌ ${playerName}: HTTP ${res.status}`);
                continue;
            }
            const json = await res.json();
            let count = 0;
            for (const events of Object.values(json)) {
                if (Array.isArray(events)) count += events.length;
            }
            console.log(`✅ ${playerName}: ${count} evento(s) de stream encontrado(s).`);
        } catch (e) {
            console.log(`❌ ${playerName}: ${e.message}`);
        }
    }
})();
