const { EmbedBuilder } = require('discord.js');
const ids = require('../config/ids.json');

const LOGS_CHANNEL_ID = ids.channels.logs;

const LOG_COLORS = {
    info: 0x3498DB,
    error: 0xE74C3C,
    warning: 0xF1C40F
};

async function sendLog(client, { type = 'info', title, description }) {

    try {

        const channel = await client.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);

        if (!channel) {
            console.log('⚠ Canal de logs não encontrado.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(LOG_COLORS[type] || LOG_COLORS.info)
            .setTitle(title)
            .setTimestamp();

        if (description) {
            embed.setDescription(description);
        }

        await channel.send({ embeds: [embed] });

    } catch (error) {

        console.log('⚠ Erro ao enviar log para o Discord.');
        console.log(error.message);

    }

}

module.exports = { sendLog };