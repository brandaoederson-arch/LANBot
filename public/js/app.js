/* ==========================================================================
   LANBot Radio 3D — Main Client Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    const state = {
        globe: null,
        stations: [],
        currentStation: null,
        favorites: JSON.parse(localStorage.getItem('lanbot_radio_favs') || '[]'),
        audio: new Audio(),
        audioCtx: null,
        analyser: null,
        source: null,
        isPlaying: false,
        activeGenre: 'all',
        botStatus: false
    };

    // DOM Elements
    const elements = {
        globeContainer: document.getElementById('globe-container'),
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        clearSearch: document.getElementById('clear-search'),
        btnRandom: document.getElementById('btn-random'),
        btnFavToggle: document.getElementById('btn-favorites-toggle'),
        favCount: document.getElementById('fav-count'),
        discordStatusBadge: document.getElementById('discord-status-badge'),
        genreTags: document.querySelectorAll('.tag-btn'),
        sidebar: document.getElementById('sidebar'),
        sidebarTitle: document.getElementById('sidebar-title'),
        closeSidebar: document.getElementById('close-sidebar'),
        stationList: document.getElementById('station-list'),
        playerStationName: document.getElementById('player-station-name'),
        playerCountry: document.getElementById('player-country'),
        playerCodec: document.getElementById('player-codec'),
        playerBitrate: document.getElementById('player-bitrate'),
        btnPlayPause: document.getElementById('btn-play-pause'),
        btnMute: document.getElementById('btn-mute'),
        volumeSlider: document.getElementById('volume-slider'),
        btnFavCurrent: document.getElementById('btn-fav-current'),
        voiceChannelSelect: document.getElementById('voice-channel-select'),
        btnDiscordTransmit: document.getElementById('btn-discord-transmit'),
        canvasVisualizer: document.getElementById('audio-visualizer')
    };

    // CORS Proxy for audio streams if needed
    state.audio.crossOrigin = 'anonymous';

    /* ==========================================================================
       1. Globe Initialization (Globe.gl + Three.js)
       ========================================================================== */
    function initGlobe() {
        if (!window.Globe) {
            console.error('Globe.gl library not loaded.');
            return;
        }

        state.globe = Globe()
            (elements.globeContainer)
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
            .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
            .pointOfView({ lat: -14.235, lng: -51.925, altitude: 2.2 }, 0) // Centered on Brazil
            .pointLat('geo_lat')
            .pointLng('geo_long')
            .pointColor(() => '#00f3ff')
            .pointAltitude(0.02)
            .pointRadius(0.4)
            .pointResolution(12)
            .pointsMerge(false)
            .onPointClick(station => playStation(station))
            .onPointHover(station => {
                elements.globeContainer.style.cursor = station ? 'pointer' : 'default';
            });

        // Add glowing pulse animation rings to active/hovered station
        state.globe
            .ringsData([])
            .ringColor(() => '#a855f7')
            .ringMaxRadius(3)
            .ringPropagationSpeed(2)
            .ringRepeatPeriod(1000);

        // Adjust globe size on resize
        window.addEventListener('resize', () => {
            state.globe.width(elements.globeContainer.clientWidth);
            state.globe.height(elements.globeContainer.clientHeight);
        });

        updateFavCount();
        fetchPopularStations();
        checkBotStatus();
        fetchVoiceChannels();
    }

    /* ==========================================================================
       2. Fetch Radio Stations (Radio-Browser API)
       ========================================================================== */
    async function fetchPopularStations() {
        try {
            // Radio-Browser API mirror
            const res = await fetch('https://de1.api.radio-browser.info/json/stations/search?limit=300&has_geo_info=true&hidebroken=true&order=clickcount&reverse=true');
            const data = await res.json();
            
            // Filter valid lat/lng
            state.stations = data.filter(s => s.geo_lat && s.geo_long && !isNaN(parseFloat(s.geo_lat)) && !isNaN(parseFloat(s.geo_long)));
            
            // Load stations onto Globe
            state.globe.pointsData(state.stations);
            console.log(`🌐 Carregadas ${state.stations.length} rádios no Globo 3D.`);
        } catch (err) {
            console.warn('Falha ao buscar rádios no espelho primário, usando fallback backend...', err);
            fetchStationsFallback();
        }
    }

    async function fetchStationsFallback() {
        try {
            const res = await fetch('/api/stations/popular');
            if (res.ok) {
                const data = await res.json();
                state.stations = data;
                state.globe.pointsData(state.stations);
            }
        } catch (e) {
            console.error('Erro no fallback de rádios:', e);
        }
    }

    /* ==========================================================================
       3. Station Playback & Audio Visualizer
       ========================================================================== */
    function playStation(station) {
        if (!station || !station.url_resolved) return;
        
        state.currentStation = station;
        
        // Update UI Info
        elements.playerStationName.textContent = station.name || 'Estação de Rádio';
        elements.playerCountry.innerHTML = `<i class="fa-solid fa-location-dot text-gold"></i> ${station.country || 'Global'} ${station.state ? '• ' + station.state : ''}`;
        
        if (station.codec) {
            elements.playerCodec.textContent = station.codec.toUpperCase();
            elements.playerCodec.classList.remove('hidden');
        } else {
            elements.playerCodec.classList.add('hidden');
        }
        
        if (station.bitrate) {
            elements.playerBitrate.textContent = `${station.bitrate} kbps`;
            elements.playerBitrate.classList.remove('hidden');
        } else {
            elements.playerBitrate.classList.add('hidden');
        }

        // Fav button state
        const isFav = state.favorites.some(f => f.stationuuid === station.stationuuid);
        elements.btnFavCurrent.classList.toggle('active', isFav);
        elements.btnFavCurrent.querySelector('i').className = isFav ? 'fa-solid fa-star' : 'fa-regular fa-star';

        // Rotate globe to station coordinates
        state.globe.pointOfView({
            lat: parseFloat(station.geo_lat),
            lng: parseFloat(station.geo_long),
            altitude: 1.5
        }, 1200);

        // Highlight with pulse ring on globe
        state.globe.ringsData([{
            lat: parseFloat(station.geo_lat),
            lng: parseFloat(station.geo_long)
        }]);

        // Enable Play & Discord button
        elements.btnPlayPause.disabled = false;
        elements.btnDiscordTransmit.disabled = false;

        // Play audio
        state.audio.src = station.url_resolved;
        state.audio.play()
            .then(() => {
                state.isPlaying = true;
                updatePlayPauseUI(true);
                initAudioVisualizer();
            })
            .catch(err => {
                console.warn('Erro ao tocar rádio (tentando URL secundária):', err);
                state.audio.src = station.url;
                state.audio.play().then(() => {
                    state.isPlaying = true;
                    updatePlayPauseUI(true);
                }).catch(e => {
                    alert('Não foi possível reproduzir o stream ao vivo desta rádio. Tente outra!');
                    updatePlayPauseUI(false);
                });
            });
    }

    function togglePlayPause() {
        if (!state.audio.src) return;
        if (state.isPlaying) {
            state.audio.pause();
            state.isPlaying = false;
            updatePlayPauseUI(false);
        } else {
            state.audio.play().then(() => {
                state.isPlaying = true;
                updatePlayPauseUI(true);
            });
        }
    }

    function updatePlayPauseUI(playing) {
        const icon = elements.btnPlayPause.querySelector('i');
        if (playing) {
            icon.className = 'fa-solid fa-pause';
        } else {
            icon.className = 'fa-solid fa-play';
        }
    }

    /* Web Audio API Spectrum Visualizer */
    function initAudioVisualizer() {
        if (state.audioCtx) return; // AudioContext initialized once
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContext();
            state.analyser = state.audioCtx.createAnalyser();
            state.analyser.fftSize = 64;
            
            state.source = state.audioCtx.createMediaElementSource(state.audio);
            state.source.connect(state.analyser);
            state.analyser.connect(state.audioCtx.destination);
            
            drawVisualizer();
        } catch (e) {
            console.log('Visualizer audio context note:', e);
        }
    }

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        if (!state.analyser) return;

        const canvas = elements.canvasVisualizer;
        const ctx = canvas.getContext('2d');
        const bufferLength = state.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        state.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;

            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#00f3ff');
            gradient.addColorStop(1, '#a855f7');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

            x += barWidth;
        }
    }

    /* ==========================================================================
       4. Search & Favorites
       ========================================================================== */
    elements.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 0) {
            elements.clearSearch.classList.remove('hidden');
            performSearch(query);
        } else {
            elements.clearSearch.classList.add('hidden');
            elements.searchResults.classList.add('hidden');
        }
    });

    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.clearSearch.classList.add('hidden');
        elements.searchResults.classList.add('hidden');
    });

    async function performSearch(query) {
        try {
            const matches = state.stations.filter(s => 
                (s.name && s.name.toLowerCase().includes(query)) ||
                (s.country && s.country.toLowerCase().includes(query)) ||
                (s.tags && s.tags.toLowerCase().includes(query))
            ).slice(0, 10);

            if (matches.length === 0) {
                elements.searchResults.innerHTML = '<div class="search-item"><span class="search-item-title">Nenhuma rádio encontrada</span></div>';
            } else {
                elements.searchResults.innerHTML = matches.map(s => `
                    <div class="search-item" data-id="${s.stationuuid}">
                        <div class="search-item-info">
                            <span class="search-item-title">${escapeHtml(s.name)}</span>
                            <span class="search-item-meta">${escapeHtml(s.country || 'Mundo')} ${s.tags ? '• ' + escapeHtml(s.tags.slice(0, 30)) : ''}</span>
                        </div>
                        <i class="fa-solid fa-circle-play text-primary"></i>
                    </div>
                `).join('');

                // Click event on search items
                elements.searchResults.querySelectorAll('.search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const uuid = item.dataset.id;
                        const target = state.stations.find(s => s.stationuuid === uuid);
                        if (target) {
                            playStation(target);
                            elements.searchResults.classList.add('hidden');
                        }
                    });
                });
            }

            elements.searchResults.classList.remove('hidden');
        } catch (e) {
            console.error('Erro na busca:', e);
        }
    }

    // Genre Filter Click
    elements.genreTags.forEach(tag => {
        tag.addEventListener('click', () => {
            elements.genreTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            const genre = tag.dataset.genre;
            
            if (genre === 'all') {
                state.globe.pointsData(state.stations);
            } else {
                const filtered = state.stations.filter(s => 
                    (s.tags && s.tags.toLowerCase().includes(genre)) ||
                    (s.country && s.country.toLowerCase().includes(genre))
                );
                state.globe.pointsData(filtered);
                showSidebarList(`Rádios: ${tag.textContent}`, filtered);
            }
        });
    });

    // Random Station ("Surpreenda-me")
    elements.btnRandom.addEventListener('click', () => {
        if (state.stations.length === 0) return;
        const randomIndex = Math.floor(Math.random() * state.stations.length);
        const randomStation = state.stations[randomIndex];
        playStation(randomStation);
    });

    // Favorites Management
    elements.btnFavCurrent.addEventListener('click', () => {
        if (!state.currentStation) return;
        const existsIndex = state.favorites.findIndex(f => f.stationuuid === state.currentStation.stationuuid);
        if (existsIndex >= 0) {
            state.favorites.splice(existsIndex, 1);
            elements.btnFavCurrent.classList.remove('active');
            elements.btnFavCurrent.querySelector('i').className = 'fa-regular fa-star';
        } else {
            state.favorites.push(state.currentStation);
            elements.btnFavCurrent.classList.add('active');
            elements.btnFavCurrent.querySelector('i').className = 'fa-solid fa-star';
        }
        localStorage.setItem('lanbot_radio_favs', JSON.stringify(state.favorites));
        updateFavCount();
    });

    elements.btnFavToggle.addEventListener('click', () => {
        showSidebarList('⭐ Minhas Rádios Favoritas', state.favorites);
    });

    function updateFavCount() {
        elements.favCount.textContent = state.favorites.length;
    }

    function showSidebarList(title, list) {
        elements.sidebarTitle.innerHTML = `<i class="fa-solid fa-list"></i> ${escapeHtml(title)}`;
        if (list.length === 0) {
            elements.stationList.innerHTML = '<div class="station-card"><div class="station-card-info"><span class="station-card-title">Nenhuma rádio cadastrada</span></div></div>';
        } else {
            elements.stationList.innerHTML = list.map(s => `
                <div class="station-card" data-id="${s.stationuuid}">
                    <div class="station-card-info">
                        <span class="station-card-title">${escapeHtml(s.name)}</span>
                        <span class="station-card-country">${escapeHtml(s.country || 'Global')}</span>
                    </div>
                    <i class="fa-solid fa-play text-primary"></i>
                </div>
            `).join('');

            elements.stationList.querySelectorAll('.station-card').forEach(card => {
                card.addEventListener('click', () => {
                    const target = list.find(s => s.stationuuid === card.dataset.id);
                    if (target) playStation(target);
                });
            });
        }
        elements.sidebar.classList.remove('hidden');
    }

    elements.closeSidebar.addEventListener('click', () => {
        elements.sidebar.classList.add('hidden');
    });

    /* ==========================================================================
       5. Discord Bot Integration (Voice Transmit & Status)
       ========================================================================== */
    async function checkBotStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                state.botStatus = data.online;
                if (data.online) {
                    elements.discordStatusBadge.className = 'status-indicator online';
                    elements.discordStatusBadge.querySelector('.status-label').textContent = 'LANBot Online';
                }
            }
        } catch (e) {
            elements.discordStatusBadge.className = 'status-indicator offline';
            elements.discordStatusBadge.querySelector('.status-label').textContent = 'Bot Offline';
        }
    }

    async function fetchVoiceChannels() {
        try {
            const res = await fetch('/api/channels');
            if (res.ok) {
                const channels = await res.json();
                elements.voiceChannelSelect.innerHTML = '<option value="">Selecione o Canal de Voz...</option>' + 
                    channels.map(c => `<option value="${c.id}">🔊 ${escapeHtml(c.name)} (${escapeHtml(c.guildName)})</option>`).join('');
            }
        } catch (e) {
            console.log('Voice channels note:', e);
        }
    }

    elements.btnDiscordTransmit.addEventListener('click', async () => {
        if (!state.currentStation) return;
        const channelId = elements.voiceChannelSelect.value;
        if (!channelId) {
            alert('Por favor, selecione um canal de voz do Discord na lista ao lado!');
            return;
        }

        elements.btnDiscordTransmit.disabled = true;
        elements.btnDiscordTransmit.querySelector('span').textContent = 'Conectando...';

        try {
            const res = await fetch('/api/voice/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: channelId,
                    stationName: state.currentStation.name,
                    stationUrl: state.currentStation.url_resolved || state.currentStation.url
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`📡 Transmitindo "${state.currentStation.name}" no canal de voz do Discord!`);
            } else {
                alert(`Aviso: ${data.message || 'Não foi possível transmitir no Discord.'}`);
            }
        } catch (err) {
            alert('Erro de conexão ao enviar áudio para o LANBot.');
        } finally {
            elements.btnDiscordTransmit.disabled = false;
            elements.btnDiscordTransmit.querySelector('span').textContent = 'Tocar no Discord';
        }
    });

    // Volume & Play listeners
    elements.btnPlayPause.addEventListener('click', togglePlayPause);
    elements.volumeSlider.addEventListener('input', (e) => {
        state.audio.volume = e.target.value;
    });

    elements.btnMute.addEventListener('click', () => {
        state.audio.muted = !state.audio.muted;
        elements.btnMute.querySelector('i').className = state.audio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });

    // Helper: HTML Escaping
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    // Init App
    initGlobe();
});
