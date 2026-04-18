// ============================================================
// SERVIDOR HACHE BARBER — Motor de WhatsApp
// ============================================================

const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const admin = require('firebase-admin');
const http = require('http');
const qrcode = require('qrcode');

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

// ── Estado global ────────────────────────────────────────────
let sock = null;
let waListo = false;
let qrActual = null;
let qrImagenBase64 = null;

// ── Servidor HTTP para mostrar el QR ────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.url === '/qr') {
    if (qrImagenBase64) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <head><title>Hache Barber QR</title></head>
        <body style="background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
          <h2 style="color:#fff;font-family:sans-serif;">Escaneá este QR con WhatsApp</h2>
          <img src="${qrImagenBase64}" style="width:300px;height:300px"/>
          <p style="color:#aaa;font-family:sans-serif;">Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
        </body>
        </html>
      `);
    } else if (waListo) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="background:#000;color:#0f0;font-family:sans-serif;text-align:center;padding-top:100px"><h1>✅ WhatsApp ya está conectado</h1></body></html>');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;padding-top:100px"><h1>⏳ Esperando QR... Recargá en unos segundos</h1></body></html>');
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hache Barber Servidor OK');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Servidor web corriendo en puerto ${PORT}`);
  console.log(`📱 Para ver el QR entrá a la URL del servicio + /qr`);
});

// ── Conectar WhatsApp ────────────────────────────────────────
async function conectarWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console),
    },
    printQRInTerminal: true,
    browser: ['Hache Barber', 'Chrome', '22.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrActual = qr;
      console.log('══════════════════════════════════════');
      console.log('QR LISTO — Entrá a la URL + /qr para escanearlo');
      console.log('══════════════════════════════════════');
      try {
        qrImagenBase64 = await qrcode.toDataURL(qr);
      } catch (e) {
        console.log('Error generando imagen QR:', e.message);
      }
    }

    if (connection === 'close') {
      waListo = false;
      qrActual = null;
      qrImagenBase64 = null;
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('Conexión cerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(conectarWA, 5000);
      }
    } else if (connection === 'open') {
      waListo = true;
      qrActual = null;
      qrImagenBase64 = null;
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
