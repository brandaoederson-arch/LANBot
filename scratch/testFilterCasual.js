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
        console.log(`Total matches in history for Aquilliz: ${matches.length}`);

        const matchTypesCount = {};
        
        // Sample 20 recent matches
        for (let i = 0; i < Math.min(20, matches.length); i++) {
            const mId = matches[i].id;
            const mRes = await fetch(`https://api.pubg.com/shards/steam/matches/${mId}`, {
                headers: { 'Authorization': `Bearer ${process.env.PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
            });
            const mData = await mRes.json();
            const type = mData.data.attributes.matchType;
            matchTypesCount[type] = (matchTypesCount[type] || 0) + 1;
            await new Promise(r => setTimeout(r, 600));
        }

        console.log('Match types in sample:', matchTypesCount);
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
