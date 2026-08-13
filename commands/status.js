const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWatcherStatus } = require('../services/rssWatcher');
const { getApiStatus } = require('../services/pubgApi');
const { getDealsStatus } = require('../services/gameDealsWatcher');

function formatUptime(seconds) {

    const dias = Math.floor(seconds / 86400);
    const horas = Math.floor((seconds % 86400) / 3600);
    const minutos = Math.floor((seconds % 3600) / 60);

    const partes = [];

    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    partes.push(`${minutos}min`);

    return partes.join(' ');

}


function formatDate(date) {

    if (!date) {
        return 'Ainda não verificado';
    }

    return new Date(date).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });

}


module.exports = {

    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Mostra o status atual do LANBot e dos serviços integrados.'),

    async execute(interaction) {

        await interaction.deferReply();

        const memoria = process.memoryUsage();
        const memoriaMB = (memoria.rss / 1024 / 1024).toFixed(1);
        const uptimeTexto = formatUptime(process.uptime());

        const watcherStatus = getWatcherStatus();
        const pubgStatus = getApiStatus();
        const dealsStatus = getDealsStatus();

        const youtubeEmoji = !watcherStatus.lastCheckTime
            ? '⚪'
            : (watcherStatus.ok ? '🟢' : '🟡');

        const youtubeTexto = !watcherStatus.lastCheckTime
            ? `${youtubeEmoji} Ainda não verificado`
            : `${youtubeEmoji} ${watcherStatus.totalFeeds - watcherStatus.failedFeeds.length}/${watcherStatus.totalFeeds} canais ok\nÚltima verificação: ${formatDate(watcherStatus.lastCheckTime)}`;

        const pubgEmoji = !pubgStatus.configured
            ? '⚪'
            : (pubgStatus.lastError ? '🔴' : (pubgStatus.lastSuccessTime ? '🟢' : '⚪'));

        const pubgTexto = !pubgStatus.configured
            ? `${pubgEmoji} PUBG_API_KEY não configurada`
            : `${pubgEmoji} Última requisição bem-sucedida: ${formatDate(pubgStatus.lastSuccessTime)}${pubgStatus.lastError ? `\nÚltimo erro: ${pubgStatus.lastError}` : ''}`;

        const steamEmoji = !dealsStatus.steam.time
            ? '⚪'
            : (dealsStatus.steam.ok ? '🟢' : '🔴');

        const steamTexto = `${steamEmoji} Última verificação: ${formatDate(dealsStatus.steam.time)}${dealsStatus.steam.error ? `\nErro: ${dealsStatus.steam.error}` : ''}`;

        const epicEmoji = !dealsStatus.epic.time
            ? '⚪'
            : (dealsStatus.epic.ok ? '🟢' : '🔴');

        const epicTexto = `${epicEmoji} Última verificação: ${formatDate(dealsStatus.epic.time)}${dealsStatus.epic.error ? `\nErro: ${dealsStatus.epic.error}` : ''}`;

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('📊 Status do LANBot')
            .addFields(
                { name: '⏱️ Uptime', value: uptimeTexto, inline: true },
                { name: '💾 Memória em uso', value: `${memoriaMB} MB`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: '📺 YouTube RSS', value: youtubeTexto },
                { name: '🎮 PUBG API', value: pubgTexto },
                { name: '🛒 Steam', value: steamTexto },
                { name: '🛒 Epic Games', value: epicTexto }
            )
            .setFooter({ text: 'Status baseado na última verificação de cada serviço' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    },

};