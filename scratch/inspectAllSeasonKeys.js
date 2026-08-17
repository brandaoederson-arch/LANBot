require('dotenv').config();
const { getCurrentSeasonId, getAccountId, getSeasonStats } = require('../services/pubgApi');

(async () => {
    try {
        const seasonId = await getCurrentSeasonId();
        const accountId = await getAccountId('Aquilliz');
        const url = `https://api.pubg.com/shards/steam/players/${accountId}/seasons/${seasonId}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        const data = await res.json();
        console.log('Full attributes keys:', Object.keys(data.data.attributes));
        console.log('gameModeStats keys:', Object.keys(data.data.attributes.gameModeStats));
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
