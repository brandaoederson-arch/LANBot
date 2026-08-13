const { handleSetupButtonClick, handleSetupModalSubmit, handleSetupSelectMenu } = require('../services/setupManager');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        // Trata clique nos botões do Setup
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('btn_cadastrar_setup')) {
                return await handleSetupButtonClick(interaction);
            }
        }

        // Trata envio dos formulários Modal do Setup
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modal_setup_')) {
                return await handleSetupModalSubmit(interaction);
            }
        }

        // Trata seleções das Listas Suspensas do Setup (se houver)
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('select_setup_')) {
                return await handleSetupSelectMenu(interaction);
            }
        }

        // Trata comandos de barra (/comando)
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Erro no comando /${interaction.commandName}:`, error);

            const errorMessage = {
                content: '❌ Erro ao executar comando.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage).catch(() => null);
            } else {
                await interaction.reply(errorMessage).catch(() => null);
            }
        }
    },
};