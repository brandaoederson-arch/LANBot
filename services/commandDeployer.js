const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function deploySlashCommands(client) {
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }

        const clientId = process.env.CLIENT_ID || client.user.id;
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        console.log(`📡 Sincronizando ${commands.length} comando(s) slash na API do Discord...`);

        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log(`🚀 ${data.length} comando(s) slash sincronizados com sucesso no Discord!`);
    } catch (error) {
        console.error('⚠ Erro ao sincronizar comandos slash com o Discord:', error.message);
    }
}

module.exports = {
    deploySlashCommands
};
