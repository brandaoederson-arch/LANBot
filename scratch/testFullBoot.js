const fs = require('fs');
const path = require('path');

console.log('🔍 Testando sintaxe e carregamento de TODOS os arquivos...');

['commands', 'events', 'services', 'config'].forEach(dir => {
    const dirPath = path.join(__dirname, `../${dir}`);
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js') || f.endsWith('.json'));
        files.forEach(f => {
            try {
                require(`../${dir}/${f}`);
                console.log(`  ✅ ${dir}/${f} ok`);
            } catch (e) {
                console.log(`  ❌ ERRO em ${dir}/${f}: ${e.message}`);
                console.log(e.stack);
            }
        });
    }
});

console.log('\n🎉 Verificação de código concluída!');
