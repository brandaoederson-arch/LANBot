const { Events } = require('discord.js');
const { startGameDealsWatcher } = require('../services/gameDealsWatcher');
const { startPubgRankingScheduler } = require('../services/pubgRanking');
const { startClipWatcher } = require('../services/clipWatcher');
const { startNewsWatcher } = require('../services/newsWatcher');
const { startPubgNewsSystem } = require('../services/pubgNewsSystem');
const { startPubgWebSystem } = require('../services/pubgWebSystem');
const { startTikTokWatcher } = require('../services/tiktokWatcher');
const { sendOrUpdateSetupPanel } = require('../services/setupManager');
const { sendOrUpdateRolesPanel } = require('../services/rolesManager');
const { sendOrUpdateRadioPanel } = require('../services/radioManager');
const { deploySlashCommands } = require('../services/commandDeployer');
const { sendLog } = require('../services/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🤖 LANBot online como ${client.user.tag}`);

        await sendLog(client, {
            type: 'info',
            title: '🟢 Bot Do A LAN está online',
            description: `Conectado como **${client.user.tag}**.`
        });

        console.log('📡 Registrando/Sincronizando Comandos Slash no Discord...');
        await deploySlashCommands(client).catch(err => console.log('⚠ Erro ao sincronizar comandos:', err.message));

        console.log('🎮 Iniciando Game Deals Watcher...');
        startGameDealsWatcher(client);

        console.log('📰 Iniciando News Watcher (Notícias Gerais de Games & Hardware)...');
        startNewsWatcher(client);

        console.log('🔫 Iniciando Sistema de Notícias PUBG (Steam + Criadores)...');
        startPubgNewsSystem(client);

        console.log('🌐 Iniciando PUBG Web System (pubg.com + pubgesports.com -> 6 Canais)...');
        startPubgWebSystem(client);

        console.log('🏆 Iniciando PUBG Ranking Scheduler...');
        startPubgRankingScheduler(client);

        console.log('🎥 Iniciando Clip Watcher & TikTok Watcher...');
        startClipWatcher(client);
        startTikTokWatcher(client);

        console.log('💻 Atualizando Painel do Canal #setup...');
        await sendOrUpdateSetupPanel(client).catch(err => console.log('⚠ Erro no painel de setup:', err.message));

        console.log('🎭 Atualizando Painel do Canal #cargos...');
        await sendOrUpdateRolesPanel(client).catch(err => console.log('⚠ Erro no painel de cargos:', err.message));

        console.log('📻 Atualizando Painel do Canal #radio...');
        await sendOrUpdateRadioPanel(client).catch(err => console.log('⚠ Erro no painel de rádio:', err.message));
    },
};