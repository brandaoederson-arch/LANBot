const { SlashCommandBuilder } = require('discord.js');
const { updatePubgRanking } = require('../services/pubgRanking');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcar-ranking-pubg')
        .setDescription('Força a atualização imediata do ranking do clã no PUBG.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            await interaction.editReply('⏳ **Iniciando atualização manual do Ranking PUBG...** Consultando API da Krafton para todos os membros do clã (pode levar 1 a 2 min)...');
            
            await updatePubgRanking(interaction.client);

            await interaction.editReply('✅ **Ranking do PUBG atualizado com sucesso!** A tabela e os dados da IA foram atualizados.');
        } catch (error) {
            console.error('Erro no comando /forcar-ranking-pubg:', error);
            await interaction.editReply(`❌ **Erro ao atualizar ranking:**\n${error.message}`);
        }
    },
};
