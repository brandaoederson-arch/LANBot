const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('🔍 Testando carregamento de todos os comandos em commands/...');
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            console.log(`Carregando: ${file}`);
            const command = require(`../commands/${file}`);
            if (!command.data || !command.data.name) {
                throw new Error(`Comando invalido no arquivo ${file}: data ou data.name faltando`);
            }
            console.log(` ✅ OK: /${command.data.name}`);
        }
        console.log(`\n🎉 Todos os ${commandFiles.length} comandos carregaram sem erros!`);
    } catch (e) {
        console.log(`❌ ERRO NO CARREGAMENTO: ${e.message}`);
        console.log(e.stack);
    }
})();
