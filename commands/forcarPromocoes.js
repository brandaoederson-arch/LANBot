const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkDealsNow } = require('../services/gameDealsWatcher');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcar-promocoes')
        .setDescription('Força a busca imediata de promoções e jogos grátis na Steam e Epic Games.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const count = await checkDealsNow(interaction.client);

            if (count > 0) {
                await interaction.editReply({
                    content: `✅ **Varredura concluída com sucesso!** ${count} nova(s) promoção(ões)/jogo(s) grátis publicado(s).`
                });
            } else {
                await interaction.editReply({
                    content: 'ℹ️ **Varredura concluída.** Nenhuma promoção nova encontrada no momento.'
                });
            }
        } catch (error) {
            console.error('⚠ Erro no comando /forcar-promocoes:', error);
            await interaction.editReply({
                content: `❌ **Erro ao buscar promoções:** ${error.message}`
            });
        }
    }
};
