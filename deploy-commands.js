require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

console.log(`📂 Arquivos de comando encontrados na pasta:`, commandFiles);

for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Comando carregado para registro: /${command.data.name}`);
    } else {
        console.log(`[AVISO] O comando em ${filePath} está sem a propriedade 'data' ou 'execute' necessária.`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Registrando ${commands.length} comando(s) slash no Discord...`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`🚀 Sucesso total! (${data.length} comandos sincronizados).`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();