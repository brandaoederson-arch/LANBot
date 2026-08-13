const { SlashCommandBuilder } = require('discord.js');
const { checkClips, updateExistingClipMessages, autoCleanExpiredClips } = require('../services/clipWatcher');
const ids = require('../config/ids.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcar-clipes')
        .setDescription('Força a verificação, limpeza e atualização dos clipes do PUBG Report.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            await interaction.editReply('🎥 **Varredura do PUBG Report iniciada!** Verificando clipes, organizando layout e limpando VODs expirados...');
            
            const totalNovos = await checkClips(interaction.client);
            await updateExistingClipMessages(interaction.client);
            const totalDeletados = await autoCleanExpiredClips(interaction.client);

            const clipsChannelId = ids.channels.clipes || '1528963592693612665';

            let msg = `✅ **Varredura concluída!** O canal <#${clipsChannelId}> foi limpo e organizado!`;
            if (totalNovos > 0) msg += `\n🔥 **${totalNovos} novo(s) clipe(s)** publicado(s).`;
            if (totalDeletados > 0) msg += `\n🧹 **${totalDeletados} clipe(s) antigo(s)/expirado(s)** removido(s) para manter o canal limpo.`;

            await interaction.editReply(msg);
        } catch (error) {
            console.error('Erro no comando /forcar-clipes:', error);
            await interaction.editReply(`❌ **Erro ao verificar clipes:**\n${error.message}`);
        }
    },
};
