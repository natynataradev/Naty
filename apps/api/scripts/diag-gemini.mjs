// Diagnóstico: lista modelos disponibles y prueba payloads mínimos.
// Ejecutar con: node scripts/diag-gemini.mjs <API_KEY>
const key = process.argv[2];
if (!key) {
  console.error('Uso: node scripts/diag-gemini.mjs <GEMINI_API_KEY>');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json' };

async function tryRequest(url, body) {
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text: text.slice(0, 300) };
}

async function listModels() {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  if (!r.ok) {
    console.log('No pude listar modelos:', r.status, (await r.text()).slice(0, 200));
    return [];
  }
  const data = await r.json();
  return (data.models || []).map((m) => m.name).filter((n) => /gemini/i.test(n));
}

const minimalPayload = {
  contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }],
};

const withSystemField = {
  systemInstruction: { parts: [{ text: 'Responde solo: OK' }] },
  contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
};

const withSystemSnake = {
  system_instruction: { parts: [{ text: 'Responde solo: OK' }] },
  contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
};

const candidates = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];

async function testModel(name, version = 'v1') {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${key}`;
  console.log(`\n=== ${version} / ${name} ===`);
  const a = await tryRequest(url, minimalPayload);
  console.log('  payload mínimo          :', a.status, a.ok ? 'OK' : a.text);
  if (!a.ok) return;
  const b = await tryRequest(url, withSystemField);
  console.log('  + systemInstruction     :', b.status, b.ok ? 'OK' : b.text);
  const c = await tryRequest(url, withSystemSnake);
  console.log('  + system_instruction    :', c.status, c.ok ? 'OK' : c.text);
}

(async () => {
  console.log('--- Modelos disponibles para esta API key ---');
  const models = await listModels();
  if (models.length === 0) {
    console.log('(no se pudo listar; probando candidatos manualmente)');
  } else {
    console.log(models.join('\n'));
  }

  console.log('\n--- Pruebas de payload (solo en modelos candidatos) ---');
  for (const m of candidates) {
    await testModel(m, 'v1');
  }
})();
