const TelegramBot = require('node-telegram-bot-api');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

const TELEGRAM_TOKEN = '8635626965:AAGtA8mKCx_8qt6kPRxE_qSBJ8c4JDDjvR0';
const HERNAN_ID = '8412020074';
const OPENROUTER_KEY = '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';
const MODELO = 'x-ai/grok-3-mini';

initializeApp({
  credential: cert({
    projectId: "agenda-tabano",
    clientEmail: "firebase-adminsdk-fbsvc@agenda-tabano.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4mdplxP3DjDLO\nuzhxnoh2gz5qqqq8/v3C2psxe8I4f7rRxacpM64iOE7g9m8bk+aQDsee6HwmPBQf\nbtjLFwrNOWMErKC6tim2ikBz9o+gfpO5JG90dG3L0WSg9SYlG4ve3/5Sv9e+x0jO\nu1dQWJfhqAxSgz81zKMojmhGCyNEj4Bghk8XyX36TpDWcbTMNbtfgOJzyVE5gHwp\nLk1T68/xR5vNAYLm1SftvWyrQZw/0Dt7GS7Gb7g0tdVpLISTKqRJbNe1jlZCVEwD\npd/TyytSG2rlzMWwSOCJ/c/dY4acJiDYJb30fEx5StVq+2976BuBD/aD/VaN/EBY\nR44DAJINAgMBAAECggEAEI4vwX/EuGRa7CJrQflTSLmlf+B1doSx0mdTksEEHpgJ\n86UzxCSv4b7GCDPhrAn8HABPU8eK1sz9iwIgbDpRTC1w3Wrz8TrEC+xjMmMy51Ri\nwDBt1HZaoHRTf4Hs3VgWl7Lj9pzg5umtdGjlwD1pxaGSFVZS9Wq4WTtIS7vU+mFz\nExnHJmqZExug0d52Ii8QFUaJrwhonZcjRBd/yBE7JJNPPbnDF5D7+EJOxwwcGOxr\ng6OzE0zEa9DYE3dvA26G1u6yXYfaKCSKSpQBkoxEyQJF/44tplw1lzKaBVKqohAu\nUOtrhK6DaxKn8pUWnlNIVJ761DuaG83sif841P/QSwKBgQDwk108eYr/uDKexxyH\nrXkwgsN9fb7iCTl3pRvJ0Vr4vjvUu7bemhucQ7cqp5GBJYaXcJSa8TGMtBmddcMT\n4VpemnIme3qgp/iTwzSc/S5byyNnSpLD+I+Qy8fNVBii+lU3oFvABNEUyDoiAdCm\npwc8UNKJZowPPModvGeHjLoYRwKBgQDEb8LbmTlw69Dm3btm5AO5FQfVT4Ao2IXg\nBx7eCcNKgBk4/I8N6JYceh9jV0xmaNF5AVcNWqPGu2vEbU1//ROTeeefpGM2a3vH\nny92minwa/CWZbXe78PEXjojYXloqedejaCjZpjPkUQjtZsxkMhzslP39knpMmZ/\nCbvLTazBCwKBgEPfr7xyJi9DjrSRRJFa9ggjvHfZVFN9esMwyAhGkr3/He5FD7D6\nFbQevrzADiM7rR9o2eRlDC/AWEG+ic1AFTj/phkJWW2eNlmqB1wLalrnkxN/TK0R\noZ+efr6FbXX93rEVAw3Hzh1o6E3T6UQ7d6UiwGOXlQhvhC6jiyoJIC/dAoGAO/9q\nw8n0CnJsVudoos+H95Ld1qA2o8MmeLuUCPtwY6PmkEpLo1Lj7oS6a4wxcKIZQN1Q\n6mpB1aRPESrVXf89aHD2dwMtrmR75QfQ5mfF4YIGdNlSCGqxH5wsI7xU6cvjODUH\n2ICwsc1Lw6Bna2cuYnAYR4c5Ifnb5ndhnYH2/usCgYEAqbQaWjhdmK1ia9mzRqza\ntK2m+z3cIiN1xG3DnQxdkqTUuvRTZp22r/ujgEsuiHIVfG+K5GzesezL1zLOAppH\nV7QuO0teYqMrF9F/YegcChPfFH2tqpVHlf3Gn6q43t+OajIOcEAaPYiIVGBsBcxk\nnFSSNtrLSzCvY8Ag+knFLBg=\n-----END PRIVATE KEY-----\n"
  })
});

const db = getFirestore();
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

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

async function responderConIA(pregunta) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: 'system', content: 'Sos el asistente de Hernan, barbero. Respondé en castellano rioplatense, breve y directo. Tu nombre es TabanoBot.' },
          { role: 'user', content: pregunta }
        ]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    return 'Hubo un error, intentá de nuevo.';
  }
}

bot.on('message', async function(msg) {
  if (String(msg.chat.id) !== HERNAN_ID) return;
  if (!msg.text) return;
  const respuesta = await responderConIA(msg.text);
  await notificar(respuesta);
});

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
      const msg = d.texto || d.message || '';
      notificar('Mensaje de ' + nombre + ': ' + msg);
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

process.once('SIGTERM', function() { bot.stopPolling(); process.exit(0); });
process.once('SIGINT', function() { bot.stopPolling(); process.exit(0); });

console.log('TabanoBot arranco correctamente');
notificar('TabanoBot online. Estoy escuchando todo.');
