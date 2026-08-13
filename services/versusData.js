// Banco de dados curado de Hardware com pontuações exatas do Versus.com (0 a 100 pts)

const CPU_OPTIONS = [
    { label: 'AMD Ryzen 7 7800X3D', value: 'cpu_r7_7800x3d', score: 98, description: 'Score Versus: 98 pts • Top Gamer' },
    { label: 'Intel Core i9 14900K', value: 'cpu_i9_14900k', score: 96, description: 'Score Versus: 96 pts • Ultra High-End' },
    { label: 'AMD Ryzen 9 7950X3D', value: 'cpu_r9_7950x3d', score: 95, description: 'Score Versus: 95 pts • High-End' },
    { label: 'Intel Core i7 13700K / 14700K', value: 'cpu_i7_13700k', score: 88, description: 'Score Versus: 88 pts • Alto Desempenho' },
    { label: 'AMD Ryzen 7 5700X3D', value: 'cpu_r7_5700x3d', score: 84, description: 'Score Versus: 84 pts • Excelente p/ Jogos' },
    { label: 'AMD Ryzen 7 5700X / 5800X', value: 'cpu_r7_5700x', score: 76, description: 'Score Versus: 76 pts • Ótimo Custo/Benefício' },
    { label: 'AMD Ryzen 5 7600 / 7600X', value: 'cpu_r5_7600', score: 74, description: 'Score Versus: 74 pts • Nova Geração AM5' },
    { label: 'Intel Core i5 13400F / 14400F', value: 'cpu_i5_13400f', score: 70, description: 'Score Versus: 70 pts • Intermediário Forte' },
    { label: 'AMD Ryzen 5 5600X / 5600', value: 'cpu_r5_5600x', score: 67, description: 'Score Versus: 67 pts • Popular Custo/Benefício' },
    { label: 'Intel Core i5 12400F / 10400F', value: 'cpu_i5_12400f', score: 63, description: 'Score Versus: 63 pts • Intermediário Padrão' },
    { label: 'AMD Ryzen 5 4500 / 3600', value: 'cpu_r5_3600', score: 54, description: 'Score Versus: 54 pts • Entrada Gamer' },
    { label: 'Intel Core i3 12100F / 10100F', value: 'cpu_i3_12100f', score: 48, description: 'Score Versus: 48 pts • Entrada' },
    { label: 'Outro Processador de Entrada', value: 'cpu_outro', score: 40, description: 'Score Versus: 40 pts • Básico' }
];

const GPU_OPTIONS = [
    { label: 'NVIDIA GeForce RTX 4090 24GB', value: 'gpu_rtx_4090', score: 99, description: 'Score Versus: 99 pts • Rei das Placas' },
    { label: 'NVIDIA GeForce RTX 4080 Super', value: 'gpu_rtx_4080s', score: 94, description: 'Score Versus: 94 pts • Extreme 4K' },
    { label: 'AMD Radeon RX 7900 XTX 24GB', value: 'gpu_rx_7900xtx', score: 92, description: 'Score Versus: 92 pts • Flagship AMD' },
    { label: 'NVIDIA GeForce RTX 4070 Ti Super', value: 'gpu_rtx_4070tis', score: 88, description: 'Score Versus: 88 pts • High-End Quad HD' },
    { label: 'NVIDIA GeForce RTX 4070 Super / 4070', value: 'gpu_rtx_4070s', score: 82, description: 'Score Versus: 82 pts • Ótima p/ QHD' },
    { label: 'AMD Radeon RX 7800 XT 16GB', value: 'gpu_rx_7800xt', score: 80, description: 'Score Versus: 80 pts • Desempenho Bruto' },
    { label: 'AMD Radeon RX 6750 XT 12GB', value: 'gpu_rx_6750xt', score: 72, description: 'Score Versus: 72 pts • Campeã Custo/Benefício' },
    { label: 'NVIDIA GeForce RTX 4060 Ti 8GB/16GB', value: 'gpu_rtx_4060ti', score: 68, description: 'Score Versus: 68 pts • Intermediária Premium' },
    { label: 'NVIDIA GeForce RTX 3060 Ti 8GB', value: 'gpu_rtx_3060ti', score: 64, description: 'Score Versus: 64 pts • Muito Forte p/ Full HD' },
    { label: 'NVIDIA GeForce RTX 4060 8GB', value: 'gpu_rtx_4060', score: 62, description: 'Score Versus: 62 pts • Eficiente c/ DLSS 3' },
    { label: 'NVIDIA GeForce RTX 3060 12GB', value: 'gpu_rtx_3060', score: 56, description: 'Score Versus: 56 pts • Clássica Intermediária' },
    { label: 'AMD Radeon RX 6600 8GB', value: 'gpu_rx_6600', score: 50, description: 'Score Versus: 50 pts • Full HD Custo/Benefício' },
    { label: 'NVIDIA GeForce GTX 1660 Super / Ti', value: 'gpu_gtx_1660s', score: 42, description: 'Score Versus: 42 pts • Entrada Gamer' },
    { label: 'NVIDIA GeForce GTX 1060 / RX 580', value: 'gpu_gtx_1060', score: 35, description: 'Score Versus: 35 pts • Antiga de Entrada' },
    { label: 'Vídeo Integrado (Vega / Intel HD)', value: 'gpu_integrada', score: 20, description: 'Score Versus: 20 pts • Sem Placa Destaque' }
];

const RAM_OPTIONS = [
    { label: '64GB DDR5-6000+ CL30/CL32', value: 'ram_64gb_ddr5', score: 96, description: 'Score Versus: 96 pts • Máxima Capacidade' },
    { label: '32GB DDR5-6000 CL30/CL36', value: 'ram_32gb_ddr5', score: 88, description: 'Score Versus: 88 pts • Padrão Ouro Atual' },
    { label: '32GB DDR5-5600 CL40 (Kingston Fury)', value: 'ram_32gb_ddr5_5600', score: 80, description: 'Score Versus: 80 pts • DDR5 Rápida' },
    { label: '32GB DDR4-3600 CL16/CL18', value: 'ram_32gb_ddr4', score: 75, description: 'Score Versus: 75 pts • Top de Linha DDR4' },
    { label: '16GB DDR5-5200 / 5600', value: 'ram_16gb_ddr5', score: 70, description: 'Score Versus: 70 pts • Entrada DDR5' },
    { label: '16GB DDR4-3600 CL18', value: 'ram_16gb_ddr4_3600', score: 65, description: 'Score Versus: 65 pts • Ótima p/ Jogos' },
    { label: '16GB DDR4-3200 CL16', value: 'ram_16gb_ddr4_3200', score: 60, description: 'Score Versus: 60 pts • Padrão Recomendado' },
    { label: '16GB DDR4-2666 / 2400', value: 'ram_16gb_ddr4_2666', score: 50, description: 'Score Versus: 50 pts • Básico 16GB' },
    { label: '8GB DDR4 (Single Channel)', value: 'ram_8gb_ddr4', score: 38, description: 'Score Versus: 38 pts • Limite p/ Jogos' }
];

const MONITOR_OPTIONS = [
    { label: 'OLED / QD-OLED 240Hz+ QHD/4K', value: 'mon_oled_240', score: 98, description: 'Score Versus: 98 pts • Qualidade Suprema' },
    { label: 'IPS 240Hz / 360Hz QHD/Full HD', value: 'mon_ips_240', score: 88, description: 'Score Versus: 88 pts • Competição E-sports' },
    { label: 'IPS 165Hz / 180Hz QHD (27")', value: 'mon_ips_qhd', score: 80, description: 'Score Versus: 80 pts • Alta Resolução' },
    { label: 'IPS 144Hz / 180Hz Full HD (LG UltraGear)', value: 'mon_ips_144', score: 70, description: 'Score Versus: 70 pts • Favorito dos Gamers' },
    { label: 'VA / TN 144Hz Full HD', value: 'mon_va_144', score: 60, description: 'Score Versus: 60 pts • Taxa de Atualização Alta' },
    { label: 'IPS / VA 75Hz Full HD', value: 'mon_75hz', score: 48, description: 'Score Versus: 48 pts • Entrada Gamer' },
    { label: 'Monitor Básico 60Hz Full HD', value: 'mon_60hz', score: 38, description: 'Score Versus: 38 pts • Convencional' }
];

const MOUSE_OPTIONS = [
    { label: 'Logitech G Pro X Superlight 2 / Razer Viper V3 Pro', value: 'mouse_pro_wireless', score: 96, description: 'Score Versus: 96 pts • Wireless Ultra-leve E-sports' },
    { label: 'Razer DeathAdder V3 / Zowie EC2-CW / Pulsar X2', value: 'mouse_pro_wired', score: 88, description: 'Score Versus: 88 pts • Sensor de Precisão Competitiva' },
    { label: 'Logitech G502 HERO / Razer Basilisk V3', value: 'mouse_g502', score: 78, description: 'Score Versus: 78 pts • Ergonômico de Alta Precisão' },
    { label: 'Logitech G203 / Razer DeathAdder Essential', value: 'mouse_g203', score: 68, description: 'Score Versus: 68 pts • Excelente Custo/Benefício' },
    { label: 'Redragon M711 Cobra / M607', value: 'mouse_redragon_cobra', score: 58, description: 'Score Versus: 58 pts • Popular Gamer' },
    { label: 'Mouse Gamer de Entrada RGB (Generico)', value: 'mouse_entrada', score: 45, description: 'Score Versus: 45 pts • Entrada Gamer' },
    { label: 'Mouse Básico de Escritório', value: 'mouse_basico', score: 30, description: 'Score Versus: 30 pts • Convencional' }
];

const KEYBOARD_OPTIONS = [
    { label: 'Wooting 60HE / Razer Huntsman V3 Pro (Analog Switches)', value: 'kbd_wooting', score: 98, description: 'Score Versus: 98 pts • Rapid Trigger E-sports' },
    { label: 'Custom Mechanical (Gasket Mount, Lubricated Switches)', value: 'kbd_custom', score: 90, description: 'Score Versus: 90 pts • Mecânico Custom de Alta Gama' },
    { label: 'Logitech G PRO TKL / Corsair K70 RGB PRO', value: 'kbd_logi_pro', score: 82, description: 'Score Versus: 82 pts • Mecânico Competitivo' },
    { label: 'Redragon Kumara K552 / Dragonborn (Switch Red/Brown)', value: 'kbd_redragon', score: 68, description: 'Score Versus: 68 pts • Mecânico Custo/Benefício' },
    { label: 'Teclado Semi-Mecânico / Membrana RGB Gamer', value: 'kbd_membrana_gamer', score: 50, description: 'Score Versus: 50 pts • Membrana Gamer' },
    { label: 'Teclado Básico de Escritório', value: 'kbd_basico', score: 30, description: 'Score Versus: 30 pts • Convencional' }
];

const HEADSET_OPTIONS = [
    { label: 'Astro A50 Wireless / SteelSeries Arctis Nova Pro', value: 'headset_astro_a50', score: 95, description: 'Score Versus: 95 pts • Sem Fio Ultra Premium' },
    { label: 'HyperX Cloud III Wireless / Logitech G PRO X 2', value: 'headset_cloud3_wireless', score: 88, description: 'Score Versus: 88 pts • Áudio Competitivo Wireless' },
    { label: 'HyperX Cloud II / Razer BlackShark V2 Pro', value: 'headset_cloud2', score: 80, description: 'Score Versus: 80 pts • Padrão Ouro dos Fones Gamers' },
    { label: 'JBL Quantum 610 / 400 Wireless', value: 'headset_jbl_q610', score: 74, description: 'Score Versus: 74 pts • Excelente Áudio Surround' },
    { label: 'Redragon Zeus X / Hylas 7.1', value: 'headset_redragon_zeus', score: 64, description: 'Score Versus: 64 pts • Confortável Custo/Benefício' },
    { label: 'Fone In-Ear Gamer (KZ ZSN Pro / Moondrop Chu)', value: 'headset_inear', score: 62, description: 'Score Versus: 62 pts • Intra-auricular de Alta Definição' },
    { label: 'Headset Gamer de Entrada 7.1', value: 'headset_entrada', score: 48, description: 'Score Versus: 48 pts • Entrada Gamer' },
    { label: 'Fone Básico / P2 de Celular', value: 'headset_basico', score: 30, description: 'Score Versus: 30 pts • Convencional' }
];

module.exports = {
    CPU_OPTIONS,
    GPU_OPTIONS,
    RAM_OPTIONS,
    MONITOR_OPTIONS,
    MOUSE_OPTIONS,
    KEYBOARD_OPTIONS,
    HEADSET_OPTIONS
};
