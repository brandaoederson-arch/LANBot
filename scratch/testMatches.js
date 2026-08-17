require('dotenv').config();
const { getAccountId } = require('../services/pubgApi');

(async () => {
    try {
        const accountId = await getAccountId('Aquilliz');
        const url = `https://api.pubg.com/shards/steam/players/${accountId}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        const data = await res.json();
        const matches = data.data.relationships.matches.data;
        console.log(`Total matches in player object: ${matches.length}`);
        
        // Inspect first 3 matches
        if (matches.length > 0) {
            const matchId = matches[0].id;
            const matchUrl = `https://api.pubg.com/shards/steam/matches/${matchId}`;
            const matchRes = await fetch(matchUrl, {
                headers: {
                    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            const matchData = await matchRes.json();
            console.log('Match 1 Attributes:', matchData.data.attributes);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
