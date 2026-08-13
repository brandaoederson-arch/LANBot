require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Proteção global contra crashes causados por erros de rede ou interações expiradas do Discord
process.on('unhandledRejection', (reason, promise) => {
    console.log('⚠ [Anti-Crash] Rejeição não tratada capturada:', reason?.message || reason);
});

process.on('uncaughtException', (err, origin) => {
    console.log('⚠ [Anti-Crash] Exceção não capturada:', err?.message || err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log('⚠ [Anti-Crash] Monitor de exceção:', err?.message || err);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

client.on('error', (err) => {
    console.log('⚠ [Discord Client Error]:', err.message);
});

// =========================
// Carrega os comandos
// =========================
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

console.log(`✅ ${client.commands.size} comando(s) carregado(s).`);

// =========================
// Carrega os eventos
// =========================
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

console.log('📂 Eventos encontrados:', eventFiles);

for (const file of eventFiles) {

    const event = require(`./events/${file}`);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }

    console.log(`✅ Evento carregado: ${event.name}`);
}

// =========================
// Login
// =========================
client.login(process.env.TOKEN);