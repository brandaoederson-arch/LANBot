(async () => {
    try {
        const url = 'https://versus.com/br/amd-ryzen-5-7600';
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = await res.text();
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const points = data.props?.pageProps?.entity?.points || data.props?.pageProps?.entity?.score;
            console.log('Points from __NEXT_DATA__:', points);
        } else {
            console.log('__NEXT_DATA__ not found');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
