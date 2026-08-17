const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    getVoiceConnection 
} = require('@discordjs/voice');

// Voice Player State
let activePlayer = null;
let activeConnection = null;

function initWebServer(client) {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.json());
    
    // Serve static files from public directory
    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));

    // ==========================================
    // API Endpoints
    // ==========================================

    // Bot status
    app.get('/api/status', (req, res) => {
        const isReady = client && client.user;
        res.json({
            online: !!isReady,
            botTag: isReady ? client.user.tag : null,
            guildsCount: isReady ? client.guilds.cache.size : 0
        });
    });

    // Get Voice Channels in Guilds
    app.get('/api/channels', (req, res) => {
        if (!client || !client.user) {
            return res.json([]);
        }

        const voiceChannels = [];
        client.guilds.cache.forEach(guild => {
            guild.channels.cache.forEach(channel => {
                // ChannelType 2 = GuildVoice, 13 = GuildStageVoice
                if (channel.type === 2 || channel.type === 13) {
                    voiceChannels.push({
                        id: channel.id,
                        name: channel.name,
                        guildId: guild.id,
                        guildName: guild.name
                    });
                }
            });
        });

        res.json(voiceChannels);
    });

    // Play Radio Stream in Discord Voice Channel
    app.post('/api/voice/play', async (req, res) => {
        const { channelId, stationUrl, stationName } = req.body;

        if (!channelId || !stationUrl) {
            return res.status(400).json({ success: false, message: 'ID do canal e URL da rádio são obrigatórios.' });
        }

        if (!client || !client.user) {
            return res.status(503).json({ success: false, message: 'O LANBot não está online no momento.' });
        }

        try {
            // Find channel
            let channel = client.channels.cache.get(channelId);
            if (!channel) {
                channel = await client.channels.fetch(channelId).catch(() => null);
            }

            if (!channel) {
                return res.status(440).json({ success: false, message: 'Canal de voz não encontrado.' });
            }

            // Connect to Voice Channel
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            // Create Audio Resource from stream URL
            const resource = createAudioResource(stationUrl, {
                inlineVolume: true
            });

            if (resource.volume) {
                resource.volume.setVolume(0.8);
            }

            // Create or reuse Audio Player
            if (!activePlayer) {
                activePlayer = createAudioPlayer();
                activePlayer.on('error', error => {
                    console.log('⚠ [Audio Player Error]:', error.message);
                });
            }

            activePlayer.play(resource);
            connection.subscribe(activePlayer);
            activeConnection = connection;

            console.log(`📡 LANBot transmitindo rádio "${stationName || 'Rádio Mundial'}" no canal #${channel.name}`);

            res.json({
                success: true,
                message: `Transmitindo "${stationName || 'Rádio'}" em #${channel.name}`,
                channelName: channel.name
            });
        } catch (err) {
            console.error('⚠ Erro ao conectar canal de voz do Discord:', err);
            res.status(500).json({ success: false, message: 'Erro ao iniciar transmissão no áudio do Discord: ' + err.message });
        }
    });

    // Stop Discord Voice Transmission
    app.post('/api/voice/stop', (req, res) => {
        try {
            if (activePlayer) {
                activePlayer.stop();
            }
            if (activeConnection) {
                activeConnection.destroy();
                activeConnection = null;
            }
            res.json({ success: true, message: 'Transmissão no Discord encerrada.' });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });

    // Fallback Radio-Browser Stations Proxy
    app.get('/api/stations/popular', (req, res) => {
        const apiUrl = 'https://de1.api.radio-browser.info/json/stations/search?limit=250&has_geo_info=true&hidebroken=true&order=clickcount&reverse=true';
        
        https.get(apiUrl, (apiRes) => {
            let body = '';
            apiRes.on('data', chunk => body += chunk);
            apiRes.on('end', () => {
                try {
                    const stations = JSON.parse(body);
                    const filtered = stations.filter(s => s.geo_lat && s.geo_long);
                    res.json(filtered);
                } catch (e) {
                    res.json([]);
                }
            });
        }).on('error', () => {
            res.json([]);
        });
    });

    // Catch-all route to serve index.html
    app.use((req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    // Start Express Server
    app.listen(PORT, () => {
        console.log(`🌐 Servidor Web & Dashboard 3D ativo na porta ${PORT}`);
        console.log(`🔗 Acesse no navegador: http://localhost:${PORT}`);
    });
}

module.exports = { initWebServer };
