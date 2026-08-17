(async () => {
    const url = 'https://api.pubg.report/v1/players/account.06567143ae6c47d699ddc640156f827b/streams';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    console.log('JSON structure:', JSON.stringify(data, null, 2).slice(0, 1500));
})();
