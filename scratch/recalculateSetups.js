const fs = require('fs');
const path = require('path');
const { calculateSetupVersusScore } = require('../services/versusScore');

const SETUPS_FILE = path.join(__dirname, '../data/memberSetups.json');

(async () => {
    try {
        if (!fs.existsSync(SETUPS_FILE)) {
            console.log('Nenhum setup cadastrado.');
            return;
        }

        const setups = JSON.parse(fs.readFileSync(SETUPS_FILE, 'utf8'));
        console.log('Re-calculando setups salvos com a busca oficial do Versus.com...');

        for (const [userId, item] of Object.entries(setups)) {
            const rawData = {
                cpu: item.cpu?.name || item.cpu,
                gpu: item.gpu?.name || item.gpu,
                ram: item.ram?.name || item.ram,
                monitor: item.monitor?.name || item.monitor,
                mouse: item.mouse?.name || item.mouse,
                teclado: item.teclado?.name || item.teclado,
                headset: item.headset?.name || item.headset
            };

            const scoreData = await calculateSetupVersusScore(rawData);
            setups[userId] = {
                username: item.username,
                ...scoreData,
                updatedAt: new Date().toISOString()
            };

            console.log(`✅ ${item.username}: CPU [${scoreData.cpu.score} pts] | GPU [${scoreData.gpu.score} pts] => Média: ${scoreData.averageScore} Pts`);
        }

        fs.writeFileSync(SETUPS_FILE, JSON.stringify(setups, null, 4));
        console.log('🎉 Todos os setups foram atualizados com notas reais do Versus.com!');
    } catch (e) {
        console.error('Err:', e.message);
    }
})();
