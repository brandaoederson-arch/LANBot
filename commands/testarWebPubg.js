const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkPubgWebNews } = require('../services/pubgWebSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testar-web-pubg')
        .setDescription('Testa e força a busca imediata de notícias do pubg.com e pubgesports.com nos 6 canais.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            await checkPubgWebNews(interaction.client);
            await interaction.editReply({
                content: '✅ **Varredura do pubg.com e pubgesports.com executada com sucesso!** Verifique os 6 canais de notícias.'
            });
        } catch (error) {
            console.error('⚠ Erro no comando /testar-web-pubg:', error);
            await interaction.editReply({
                content: `❌ **Erro ao executar a busca de notícias web:** ${error.message}`
            });
        }
    }
};
