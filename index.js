const TelegramBot = require('node-telegram-bot-api');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8635626965:AAGtA8mKCx_8qt6kPRxE_qSBJ8c4JDDjvR0';
const HERNAN_ID = '8412020074';
const OPENROUTER_KEY = process.env.OR_KEY || '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';
const YT_API_KEY = process.env.YT_API_KEY || '';
const TVBOX_IP = process.env.TVBOX_IP || '';

// Modelos: principal y fallback gratuito
const MODELO_PRINCIPAL = 'x-ai/grok-3-mini';
const MODELO_FALLBACK = 'google/gemma-3-4b-it:free';
const MODELO_INTENT = 'x-ai/grok-3-mini'; // detecta intents de música

initializeApp({
  credential: cert({
    projectId: "agenda-tabano",
    clientEmail: "firebase-adminsdk-fbsvc@agenda-tabano.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4mdplxP3DjDLO\nuzhxnoh2gz5qqqq8/v3C2psxe8I4f7rRxacpM64iOE7g9m8bk+aQDsee6HwmPBQf\nbtjLFwrNOWMErKC6tim2ikBz9o+gfpO5JG90dG3L0WSg9SYlG4ve3/5Sv9e+x0jO\nu1dQWJfhqAxSgz81zKMojmhGCyNEj4Bghk8XyX36TpDWcbTMNbtfgOJzyVE5gHwp\nLk1T68/xR5vNAYLm1SftvWyrQZw/0Dt7GS7Gb7g0tdVpLISTKqRJbNe1jlZCVEwD\npd/TyytSG2rlzMWwSOCJ/c/dY4acJiDYJb30fEx5StVq+2976BuBD/aD/VaN/EBY\nR44DAJINAgMBAAECggEAEI4vwX/EuGRa7CJrQflTSLmlf+B1doSx0mdTksEEHpgJ\n86UzxCSv4b7GCDPhrAn8HABPU8eK1sz9iwIgbDpRTC1w3Wrz8TrEC+xjMmMy51Ri\nwDBt1HZaoHRTf4Hs3VgWl7Lj9pzg5umtdGjlwD1pxaGSFVZS9Wq4WTtIS7vU+mFz\nExnHJmqZExug0d52Ii8QFUaJrwhonZcjRBd/yBE7JJNPPbnDF5D7+EJOxwwcGOxr\ng6OzE0zEa9DYE3dvA26G1u6yXYfaKCSKSpQBkoxEyQJF/44tplw1lzKaBVKqohAu\nUOtrhK6DaxKn8pUWnlNIVJ761DuaG83sif841P/QSwKBgQDwk108eYr/uDKexxyH\nrXkwgsN9fb7iCTl3pRvJ0Vr4vjvUu7bemhucQ7cqp5GBJYaXcJSa8TGMtBmddcMT\n4VpemnIme3qgp/iTwzSc/S5byyNnSpLD+I+Qy8fNVBii+lU3oFvABNEUyDoiAdCm\npwc8UNKJZowPPModvGeHjLoYRwKBgQDEb8LbmTlw69Dm3btm5AO5FQfVT4Ao2IXg\nBx7eCcNKgBk4/I8N6JYceh9jV0xmaNF5AVcNWqPGu2vEbU1//ROTeeefpGM2a3vH\nny92minwa/CWZbXe78PEXjojYXloqedejaCjZpjPkUQjtZsxkMhzslP39knpMmZ/\nCbvLTazBCwKBgEPfr7xyJi9DjrSRRJFa9ggjvHfZVFN9esMwyAhGkr3/He5FD7D6\nFbQevrzADiM7rR9o2eRlDC/AWEG+ic1AFTj/phkJWW2eNlmqB1wLalrnkxN/TK0R\noZ+efr6FbXX93rEVAw3Hzh1o6E3T6UQ7d6UiwGOXlQhvhC6jiyoJIC/dAoGAO/9q\nw8n0CnJsVudoos+H95Ld1qA2o8MmeLuUCPtwY6PmkEpLo1Lj7oS6a4wxcKIZQN1Q\n6mpB1aRPESrVXf89aHD2dwMtrmR75QfQ5mfF4YIGdNlSCGqxH5wsI7xU6cvjODUH\n2ICwsc1Lw6Bna2cuYnAYR4c5Ifnb5ndhnYH2/usCgYEAqbQaWjhdmK1ia9mzRqza\ntK2m+z3cIiN1xG3DnQxdkqTUuvRTZp22r/ujgEsuiHIVfG+K5GzesezL1zLOAppH\nV7QuO0teYqMrF9F/YegcChPfFH2tqpVHlf3Gn6q43t+OajIOcEAaPYiIVGBsBcxk\nnFSSNtrLSzCvY8Ag+knFLBg=\n-----END PRIVATE KEY-----\n"
  })
});

const db = getFirestore();
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ─────────────────────────────────────────
// MÓDULO YOUTUBE
// ─────────────────────────────────────────

async function buscarYoutube(query) {
  if (!YT_API_KEY) return null;
  try {
    const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&q=' +
      encodeURIComponent(query) + '&key=' + YT_API_KEY;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    const item = data.items[0];
    return {
      videoId: item.id.videoId,
      titulo: item.snippet.title,
      url: 'https://www.youtube.com/watch?v=' + item.id.videoId
    };
  } catch (e) {
    console.error('Error YouTube API:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────
// MÓDULO ADB → TV BOX
// ─────────────────────────────────────────

async function adbConectar() {
  if (!TVBOX_IP) return false;
  try {
    await execAsync('adb connect ' + TVBOX_IP, { timeout: 5000 });
    return true;
  } catch (e) {
    console.error('ADB connect error:', e.message);
    return false;
  }
}

async function lanzarYouTube(videoId) {
  if (!TVBOX_IP) return false;
  try {
    await adbConectar();
    // Abre YouTube con el video directo
    const cmd = 'adb -s ' + TVBOX_IP + ' shell am start -a android.intent.action.VIEW ' +
      '-d "https://www.youtube.com/watch?v=' + videoId + '" ' +
      'com.google.android.youtube';
    await execAsync(cmd, { timeout: 8000 });
    return true;
  } catch (e) {
    console.error('ADB launch error:', e.message);
    return false;
  }
}

async function adbPausar() {
  if (!TVBOX_IP) return false;
  try {
    await adbConectar();
    // Envía tecla MEDIA_PLAY_PAUSE
    await execAsync('adb -s ' + TVBOX_IP + ' shell input keyevent 85', { timeout: 5000 });
    return true;
  } catch (e) { return false; }
}

async function adbDetener() {
  if (!TVBOX_IP) return false;
  try {
    await adbConectar();
    await execAsync('adb -s ' + TVBOX_IP + ' shell am force-stop com.google.android.youtube', { timeout: 5000 });
    return true;
  } catch (e) { return false; }
}

async function adbVolumen(subir) {
  if (!TVBOX_IP) return false;
  try {
    await adbConectar();
    // 24 = VOLUME_UP, 25 = VOLUME_DOWN
    const keycode = subir ? 24 : 25;
    // Lo manda 3 veces para que se note
    for (let i = 0; i < 3; i++) {
      await execAsync('adb -s ' + TVBOX_IP + ' shell input keyevent ' + keycode, { timeout: 3000 });
    }
    return true;
  } catch (e) { return false; }
}

async function adbSiguiente() {
  if (!TVBOX_IP) return false;
  try {
    await adbConectar();
    await execAsync('adb -s ' + TVBOX_IP + ' shell input keyevent 87', { timeout: 5000 });
    return true;
  } catch (e) { return false; }
}

// ─────────────────────────────────────────
// MÓDULO IA — con fallback automático
// ─────────────────────────────────────────

async function llamarIA(messages, modelo) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: modelo, messages, max_tokens: 300 })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  return data.choices[0].message.content;
}

async function responderConIA(pregunta) {
  const messages = [
    { role: 'system', content: 'Sos TabanoBot, asistente de Hernán. Respondé en castellano rioplatense, breve y directo.' },
    { role: 'user', content: pregunta }
  ];
  try {
    return await llamarIA(messages, MODELO_PRINCIPAL);
  } catch (e) {
    console.log('Modelo principal falló, usando fallback gratuito:', e.message);
    try {
      return await llamarIA(messages, MODELO_FALLBACK);
    } catch (e2) {
      return 'No pude responder ahora, intentá de nuevo en un momento.';
    }
  }
}

// ─────────────────────────────────────────
// MÓDULO INTENT — detecta comandos de música
// ─────────────────────────────────────────

async function detectarIntentMusica(texto) {
  const prompt = `Analizá este mensaje y respondé SOLO con JSON, sin texto extra.

Mensaje: "${texto}"

Devolvé:
{
  "esMusica": true/false,
  "accion": "reproducir" | "pausar" | "detener" | "siguiente" | "volumen_subir" | "volumen_bajar" | null,
  "query": "texto para buscar en YouTube o null"
}

Ejemplos:
- "poneme Tini" → {"esMusica":true,"accion":"reproducir","query":"Tini"}
- "poneme música electrónica" → {"esMusica":true,"accion":"reproducir","query":"música electrónica mix"}
- "pause" → {"esMusica":true,"accion":"pausar","query":null}
- "pará la música" → {"esMusica":true,"accion":"detener","query":null}
- "siguiente" → {"esMusica":true,"accion":"siguiente","query":null}
- "subí el volumen" → {"esMusica":true,"accion":"volumen_subir","query":null}
- "bajá el volumen" → {"esMusica":true,"accion":"volumen_bajar","query":null}
- "qué hora es" → {"esMusica":false,"accion":null,"query":null}`;

  try {
    const respuesta = await llamarIA(
      [{ role: 'user', content: prompt }],
      MODELO_INTENT
    );
    const limpio = respuesta.replace(/```json|```/g, '').trim();
    return JSON.parse(limpio);
  } catch (e) {
    // Si falla la detección, asumir que no es música
    return { esMusica: false, accion: null, query: null };
  }
}

// ─────────────────────────────────────────
// HANDLER DE MENSAJES PRINCIPAL
// ─────────────────────────────────────────

bot.on('message', async function(msg) {
  if (String(msg.chat.id) !== HERNAN_ID) return;
  if (!msg.text) return;

  const texto = msg.text;

  // Detectar si es comando de música
  const intent = await detectarIntentMusica(texto);

  if (intent.esMusica) {
    if (!TVBOX_IP) {
      await notificar('⚠️ TV Box no configurado. Agregá TVBOX_IP en las variables de Render.');
      return;
    }

    if (intent.accion === 'reproducir' && intent.query) {
      await notificar('🔍 Buscando "' + intent.query + '"...');
      const video = await buscarYoutube(intent.query);
      if (!video) {
        await notificar('❌ No encontré nada para "' + intent.query + '"');
        return;
      }
      const ok = await lanzarYouTube(video.videoId);
      if (ok) {
        await notificar('▶️ Reproduciendo: ' + video.titulo);
      } else {
        await notificar('❌ No pude conectarme al TV Box. Verificá que ADB esté activo y la IP sea correcta.');
      }
      return;
    }

    if (intent.accion === 'pausar') {
      const ok = await adbPausar();
      await notificar(ok ? '⏸ Pausado.' : '❌ No pude pausar.');
      return;
    }

    if (intent.accion === 'detener') {
      const ok = await adbDetener();
      await notificar(ok ? '⏹ Detenido.' : '❌ No pude detener.');
      return;
    }

    if (intent.accion === 'siguiente') {
      const ok = await adbSiguiente();
      await notificar(ok ? '⏭ Siguiente.' : '❌ No pude pasar al siguiente.');
      return;
    }

    if (intent.accion === 'volumen_subir') {
      const ok = await adbVolumen(true);
      await notificar(ok ? '🔊 Volumen subido.' : '❌ No pude cambiar el volumen.');
      return;
    }

    if (intent.accion === 'volumen_bajar') {
      const ok = await adbVolumen(false);
      await notificar(ok ? '🔉 Volumen bajado.' : '❌ No pude cambiar el volumen.');
      return;
    }
  }

  // Si no es música → respuesta IA normal (con fallback automático)
  const respuesta = await responderConIA(texto);
  await notificar(respuesta);
});

// ─────────────────────────────────────────
// LISTENERS FIREBASE (Hache Barber — sin cambios)
// ─────────────────────────────────────────

function formatearCuerpo(texto) {
  if (!texto) return '';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return texto.replace(/(\d{4})-(\d{2})-(\d{2})/g, function(match, y, m, d) {
    return parseInt(d) + ' de ' + meses[parseInt(m) - 1];
  });
}

async function notificar(texto) {
  try {
    await bot.sendMessage(HERNAN_ID, texto);
  } catch (e) {
    console.error('Error notificando:', e.message);
  }
}

let primeraVezNotif = true;
db.collection('tabano-notif').onSnapshot(function(snapshot) {
  if (primeraVezNotif) { primeraVezNotif = false; return; }
  snapshot.docChanges().forEach(function(change) {
    if (change.type === 'added') {
      const d = change.doc.data();
      const titulo = d.titulo || d.title || 'Notificacion';
      const cuerpo = formatearCuerpo(d.cuerpo || d.body || d.mensaje || '');
      notificar(titulo + '\n' + cuerpo);
    }
  });
});

let apptsPrevios = null;
db.collection('tabano').doc('appts').onSnapshot(function(snap) {
  const data = snap.data();
  if (!data) return;
  const turnos = data.list || data.turnos || [];
  if (apptsPrevios === null) { apptsPrevios = turnos; return; }

  const idsAnteriores = {};
  apptsPrevios.forEach(function(t) { idsAnteriores[t.id] = true; });
  const nuevos = turnos.filter(function(t) { return !idsAnteriores[t.id]; });

  nuevos.forEach(function(t) {
    const nombre = t.clienteNombre || t.nombre || 'Cliente';
    const cuerpo = formatearCuerpo((t.fecha || '') + ' ' + (t.hora || ''));
    const servicio = t.servicio || t.svc || '';
    notificar('Turno nuevo: ' + nombre + '\n' + cuerpo + '\n' + servicio);
  });

  apptsPrevios = turnos;
});

let primeraVezMsgs = true;
db.collection('tabano-msgs').onSnapshot(function(snapshot) {
  if (primeraVezMsgs) { primeraVezMsgs = false; return; }
  snapshot.docChanges().forEach(function(change) {
    if (change.type === 'added') {
      const d = change.doc.data();
      if (d.de === 'hernan' || d.sender === 'barber') return;
      const nombre = d.clienteNombre || d.nombre || 'Cliente';
      const msgtxt = d.texto || d.message || '';
      notificar('Mensaje de ' + nombre + ': ' + msgtxt);
    }
  });
});

let primeraVezRegistros = true;
db.collection('tabano-registros').onSnapshot(function(snapshot) {
  if (primeraVezRegistros) { primeraVezRegistros = false; return; }
  snapshot.docChanges().forEach(function(change) {
    if (change.type === 'added') {
      const d = change.doc.data();
      const nombre = d.nombre || d.name || 'Nuevo cliente';
      notificar('Cliente nuevo en la app: ' + nombre);
    }
  });
});

// Servidor HTTP para que Render no mate el proceso por inactividad
const http = require('http');
http.createServer(function(req, res) { res.end('ok'); }).listen(process.env.PORT || 3000);

process.once('SIGTERM', function() { bot.stopPolling(); process.exit(0); });
process.once('SIGINT', function() { bot.stopPolling(); process.exit(0); });

console.log('TabanoBot arranco correctamente');
notificar('TabanoBot online ✅ — YouTube + TV Box activo.');
