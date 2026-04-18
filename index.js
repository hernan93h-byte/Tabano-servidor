// ============================================================
// SERVIDOR HACHE BARBER — Motor de WhatsApp con Pairing Code
// ============================================================

const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const admin = require('firebase-admin');
const http = require('http');

// ── Firebase ─────────────────────────────────────────────────
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'agenda-tabano'
});

const db = admin.firestore();

let sock = null;
let waListo = false;
let codigoPairing = null;

// Número del chip (sin + y sin espacios)
const NUMERO_CHIP = '5492215869334';

// ── Servidor HTTP ────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (waListo) {
    res.end('<html><body style="background:#000;color:#0f0;font-family:sans-serif;text-align:center;padding-top:100px"><h1>✅ WhatsApp conectado</h1></body></html>');
  } else if (codigoPairing) {
    res.end(`<html><body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px">
      <h2>Código para vincular WhatsApp:</h2>
      <h1 style="color:#ff0;font-size:80px;letter-spacing:20px">${codigoPairing}</h1>
      <p>Abrí WhatsApp en el chip → Dispositivos vinculados → Vincular con número de teléfono</p>
    </body></html>`);
  } else {
    res.end('<html><body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px"><h1>⏳ Generando código... Recargá en unos segundos</h1></body></html>');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Servidor web en puerto ${PORT}`);
});

// ── Conectar WhatsApp ────────────────────────────────────────
async function conectarWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console),
    },
    printQRInTerminal: false,
    browser: ['Hache Barber', 'Chrome', '22.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  // Pedir código de pairing cuando esté conectando
  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const codigo = await sock.requestPairingCode(NUMERO_CHIP);
        codigoPairing = codigo;
        console.log('══════════════════════════════════════');
        console.log(`CÓDIGO DE VINCULACIÓN: ${codigo}`);
        console.log('Abrí WhatsApp → Dispositivos vinculados → Vincular con número');
        console.log('══════════════════════════════════════');
      } catch (e) {
        console.log('Error pidiendo código:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      waListo = false;
      codigoPairing = null;
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('Conexión cerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(conectarWA, 5000);
      }
    } else if (connection === 'open') {
      waListo = true;
      codigoPairing = null;
      console.log('✅ WhatsApp conectado y listo');
      iniciarMotor();
    }
  });
}

// ── Motor de cola ────────────────────────────────────────────
function iniciarMotor() {
  console.log('🚀 Motor de cola iniciado');
  setInterval(procesarCola, 60 * 1000);
  procesarCola();
}

async function procesarCola() {
  if (!waListo) return;
  const ahora = Date.now();
  try {
    const snapshot = await db
      .collection('tabano-difusion-cola')
      .where('estado', '==', 'pendiente')
      .where('horaProgramada', '<=', ahora)
      .limit(5)
      .get();
    if (snapshot.empty) return;
    for (const docSnap of snapshot.docs) {
      await procesarMensaje(docSnap);
      await esperar(30000 + Math.random() * 60000);
    }
  } catch (err) {
    console.error('❌ Error cola:', err.message);
  }
}

async function procesarMensaje(docSnap) {
  const data = docSnap.data();
  const docId = docSnap.id;
  await db.collection('tabano-difusion-cola').doc(docId).update({ estado: 'enviando' });
  try {
    const numero = data.clienteWA.replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(numero, { text: data.textoFinal });
    await db.collection('tabano-difusion-historial').add({
      clienteId: data.clienteId || '',
      clienteNombre: data.clienteNombre,
      clienteWA: data.clienteWA,
      tipo: data.tipo,
      textoFinal: data.textoFinal,
      chipUsado: 'chip1',
      resultado: 'ok',
      tsEnviado: Date.now(),
      tsProgramado: data.horaProgramada,
      simulado: false
    });
    await db.collection('tabano-difusion-cola').doc(docId).delete();
    console.log('✅ Enviado a', data.clienteNombre);
  } catch (err) {
    console.error('❌ Error enviando:', err.message);
    await db.collection('tabano-difusion-cola').doc(docId).update({
      estado: 'error',
      intentos: (data.intentos || 0) + 1,
      ultimoError: err.message
    });
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('🔄 Iniciando servidor Hache Barber...');
conectarWA();
