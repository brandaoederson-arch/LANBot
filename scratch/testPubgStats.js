require('dotenv').config();
const { getCurrentSeasonId, getAccountId, getSeasonStats } = require('../services/pubgApi');

(async () => {
    try {
        const seasonId = await getCurrentSeasonId();
        console.log('Current Season ID:', seasonId);

        const accountId = await getAccountId('Aquilliz');
        console.log('Account ID Aquilliz:', accountId);

        const stats = await getSeasonStats(accountId, seasonId);
        console.log('Available gameModes in stats:', Object.keys(stats));
        console.log('squad stats:', stats.squad);
    } catch (e) {
        console.error('Error testing PUBG API:', e.message);
    }
})();
