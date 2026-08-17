const { searchVersusItem } = require('../services/versusScore');

(async () => {
    console.log('--- Testando Setup Aquilliz ---');
    const cpu1 = await searchVersusItem('AMD Ryzen 5 7600');
    const gpu1 = await searchVersusItem('RTX 4060 Ti');
    console.log('Aquilliz CPU:', cpu1.name, cpu1.score, 'pts | GPU:', gpu1.name, gpu1.score, 'pts');

    console.log('\n--- Testando Setup Zezinho ---');
    const cpu2 = await searchVersusItem('AMD Ryzen 7 5700X');
    const gpu2 = await searchVersusItem('RTX 2060');
    console.log('Zezinho CPU:', cpu2.name, cpu2.score, 'pts | GPU:', gpu2.name, gpu2.score, 'pts');

    console.log('\n--- Testando Setup Gabriel ---');
    const cpu3 = await searchVersusItem('AMD Ryzen 5 5500');
    const gpu3 = await searchVersusItem('RTX 4060');
    console.log('Gabriel CPU:', cpu3.name, cpu3.score, 'pts | GPU:', gpu3.name, gpu3.score, 'pts');
})();
