// Script de build para exportar schemas ao frontend.
const fs = require('fs');
const path = require('path');
const { clienteSchema } = require('../validators/clienteValidator');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function writeJsonSchema(schema, nome) {
  const outDir = path.join(__dirname, '..', 'public', 'validation');
  ensureDir(outDir);
  const jsonPath = path.join(outDir, `${nome}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(schema));
  return jsonPath;
}

function writeJsModule(schema, nome) {
  const outDir = path.join(__dirname, '..', 'public', 'js', 'shared');
  ensureDir(outDir);
  const jsPath = path.join(outDir, `${nome}-schema.js`);
  const content = `// Arquivo gerado automaticamente. NÃO editar manualmente.\nexport const ${nome}Schema = ${JSON.stringify(schema, null, 2)};\n`;
  fs.writeFileSync(jsPath, content);
  return jsPath;
}

function main(){
  const schema = clienteSchema; // já sem funções
  writeJsonSchema(schema, 'cliente-schema');
  writeJsModule(schema, 'cliente');
  console.log('[build-schemas] Schemas gerados com sucesso.');
}

main();
