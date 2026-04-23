const TelegramBot = require('node-telegram-bot-api');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

// ─── CREDENCIALES ───────────────────────────────────────────
const TELEGRAM_TOKEN = '8635626965:AAGtA8mKCx_8qt6kPRxE_qSBJ8c4JDDjvR0';
const HERNAN_ID = '8412020074';
const OPENROUTER_KEY = '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';
const MODELO = 'x-ai/grok-3-mini';

// ─── FIREBASE ───────────────────────────────────────────────
initializeApp({
  credential: cert({
    projectId: "agenda-tabano",
    clientEmail: "firebase-adminsdk-fbsvc@agenda-tabano.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4mdplxP3DjDLO\nuzhxnoh2gz5qqqq8/v3C2psxe8I4f7rRxacpM64iOE7g9m8bk+aQDsee6HwmPBQf\nbtjLFwrNOWMErKC6tim2ikBz9o+gfpO5JG90dG3L0WSg9SYlG4ve3/5Sv9e+x0jO\nu1dQWJfhqAxSgz81zKMojmhGCyNEj4Bghk8XyX36TpDWcbTMNbtfgOJzyVE5gHwp\nLk1T68/xR5vNAYLm1SftvWyrQZw/0Dt7GS7Gb7g0tdVpLISTKqRJbNe1jlZCVEwD\npd/TyytSG2rlzMWwSOCJ/c/dY4acJiDYJb30fEx5StVq+2976BuBD/aD/VaN/EBY\nR44DAJINAgMBAAECggEAEI4vwX/EuGRa7CJrQflTSLmlf+B1doSx0mdTksEEHpgJ\n86UzxCSv4b7GCDPhrAn8HABPU8eK1sz9iwIgbDpRTC1w3Wrz8TrEC+xjMmMy51Ri\nwDBt1HZaoHRTf4Hs3VgWl7Lj9pzg5umtdGjlwD1pxaGSFVZS9Wq4WTtIS7vU+mFz\nExnHJmqZExug0d52Ii8QFUaJrwhonZcjRBd/yBE7JJNPPbnDF5D7+EJOxwwcGOxr\ng6OzE0zEa9DYE3dvA26G1u6yXYfaKCSKSpQBkoxEyQJF/44tplw1lzKaBVKqohAu\nUOtrhK6DaxKn8pUWnlNIVJ761DuaG83sif841P/QSwKBgQDwk108eYr/uDKexxyH\nrXkwgsN9fb7iCTl3pRvJ0Vr4vjvUu7bemhucQ7cqp5GBJYaXcJSa8TGMtBmddcMT\n4VpemnIme3qgp/iTwzSc/S5byyNnSpLD+I+Qy8fNVBii+lU3oFvABNEUyDoiAdCm\npwc8UNKJZowPPModvGeHjLoYRwKBgQDEb8LbmTlw69Dm3btm5AO5FQfVT4Ao2IXg\nBx7eCcNKgBk4/I8N6JYceh9jV0xmaNF5AVcNWqPGu2vEbU1//ROTeeefpGM2a3vH\nny92minwa/CWZbXe78PEXjojYXloqedejaCjZpjPkUQjtZsxkMhzslP39knpMmZ/\nCbvLTazBCwKBgEPfr7xyJi9DjrSRRJFa9ggjvHfZVFN9esMwyAhGkr3/He5FD7D6\nFbQevrzADiM7rR9o2eRlDC/AWEG+ic1AFTj/phkJWW2eNlmqB1wLalrnkxN/TK0R\noZ+efr6FbXX93rEVAw3Hzh1o6E3T6UQ7d6UiwGOXlQhvhC6jiyoJIC/dAoGAO/9q\nw8n0CnJsVudoos+H95Ld1qA2o8MmeLuUCPtwY6PmkEpLo1Lj7oS6a4wxcKIZQN1Q\n6mpB1aRPESrVXf89aHD2dwMtrmR75QfQ5mfF4YIGdNlSCGqxH5wsI7xU6cvjODUH\n2ICwsc1Lw6Bna2cuYnAYR4c5Ifnb5ndhnYH2/usCgYEAqbQaWjhdmK1ia9mzRqza\ntK2m+z3cIiN1xG3DnQxdkqTUuvRTZp22r/ujgEsuiHIVfG+K5GzesezL1zLOAppH\nV7QuO0teYqMrF9F/YegcChPfFH2tqpVHlf3Gn6q43t+OajIOcEAaPYiIVGBsBcxk\nnFSSNtrLSzCvY8Ag+knFLBg=\n-----END PRIVATE KEY-----\n"
  })
});

const db = getFirestore();
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ─── FUNCIÓN: mandar mensaje a Hernán ───────────────────────
async function notificar(texto) {
  try {
    await bot.sendMessage(HERNAN_ID, texto, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Error mandando mensaje:', e.message);
  }
}

// ─── FUNCIÓN: responder con IA ───────────────────────────────
async function responderConIA(pregunta) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          {
            role: 'system',
            content: 'Sos el asistente de Hernán, barbero. Respondé en castellano rioplatense, de forma breve y directa. Tu nombre es TabanoBot.'
          },
          { role: 'user', content: pregunta }
        ]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No pude responder, intentá de nuevo.';
  } catch (e) {
    console.error('Error IA:', e.message);
    return 'Hubo un error con la IA, intentá de nuevo.';
  }
}

// ─── ESCUCHAR MENSAJES DE HERNÁN ─────────────────────────────
bot.on('message', async (msg) => {
  if (String(msg.chat.id) !== HERNAN_ID) return;
  const texto = msg.text;
  if (!texto) return;

  await bot.sendChatAction(HERNAN_ID, 'typing');
  const respuesta = await responderConIA(texto);
  await notificar(respuesta);
});

// ─── ESCUCHAR: colección tabano-notif ────────────────────────
db.collection('tabano-notif').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const d = change.doc.data();
      // Solo notificar docs nuevos (últimos 10 segundos)
      const ahora = Date.now();
      const ts = d.ts || d.timestamp?.toMillis?.() || 0;
      if (ahora - ts > 10000) return;

      const msg = d.mensaje || d.message || d.texto || d.title || '🔔 Nueva notificación';
      notificar(`🔔 *Notificación*\n${msg}`);
    }
  });
});

// ─── ESCUCHAR: turnos nuevos (tabano/appts) ──────────────────
let apptsPrevios = null;

db.collection('tabano').doc('appts').onSnapshot(async snap => {
  const data = snap.data();
  if (!data) return;

  const turnos = data.list || data.turnos || [];

  if (apptsPrevios === null) {
    apptsPrevios = turnos;
    return;
  }

  // Detectar turnos nuevos
  const idsAnteriores = new Set(apptsPrevios.map(t => t.id));
  const nuevos = turnos.filter(t => !idsAnteriores.has(t.id));

  for (const t of nuevos) {
    const nombre = t.clienteNombre || t.nombre || 'Cliente';
    const fecha = t.fecha || '';
    const hora = t.hora || '';
    const servicio = t.servicio || t.svc || '';
    notificar(`📅 *Turno nuevo agendado*\n👤 ${nombre}\n🕐 ${fecha} ${hora}\n✂️ ${servicio}`);
  }

  // Detectar cancelaciones
  const idsNuevos = new Set(turnos.map(t => t.id));
  const cancelados = apptsPrevios.filter(t => !idsNuevos.has(t.id) && t.estado !== 'atendido');
  for (const t of cancelados) {
    const nombre = t.clienteNombre || t.nombre || 'Cliente';
    const fecha = t.fecha || '';
    const hora = t.hora || '';
    notificar(`❌ *Turno cancelado*\n👤 ${nombre}\n🕐 ${fecha} ${hora}`);
  }

  // Detectar solapamientos
  const porFechaHora = {};
  for (const t of turnos) {
    if (t.estado === 'cancelado') continue;
    const clave = `${t.fecha}_${t.hora}`;
    if (!porFechaHora[clave]) porFechaHora[clave] = [];
    porFechaHora[clave].push(t);
  }
  for (const [clave, lista] of Object.entries(porFechaHora)) {
    if (lista.length > 1) {
      const [fecha, hora] = clave.split('_');
      const nombres = lista.map(t => t.clienteNombre || t.nombre || '?').join(', ');
      notificar(`⚠️ *Solapamiento de turnos*\n🕐 ${fecha} ${hora}\n👥 ${nombres}`);
    }
  }

  apptsPrevios = turnos;
});

// ─── ESCUCHAR: mensajes nuevos de clientes ───────────────────
db.collection('tabano-msgs').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const d = change.doc.data();
      const ahora = Date.now();
      const ts = d.ts || d.timestamp?.toMillis?.() || 0;
      if (ahora - ts > 10000) return;
      if (d.de === 'hernán' || d.de === 'hernan' || d.sender === 'barber') return;

      const nombre = d.clienteNombre || d.nombre || 'Cliente';
      const msg = d.texto || d.message || d.msg || '(sin texto)';
      notificar(`💬 *Mensaje nuevo*\n👤 ${nombre}\n"${msg}"`);
    }
  });
});

// ─── ESCUCHAR: clientes nuevos ───────────────────────────────
db.collection('tabano-registros').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const d = change.doc.data();
      const ahora = Date.now();
      const ts = d.ts || d.timestamp?.toMillis?.() || 0;
      if (ahora - ts > 10000) return;

      const nombre = d.nombre || d.name || 'Nuevo cliente';
      notificar(`👤 *Cliente nuevo en la app*\n${nombre} se registró recién.`);
    }
  });
});

console.log('🦞 TabanoBot arrancó correctamente');
notificar('🦞 *TabanoBot online*\nEstoy escuchando todo. Te aviso de cualquier novedad.');
    
