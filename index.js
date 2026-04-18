// ============================================================
// SERVIDOR HACHE BARBER — Motor de WhatsApp con Baileys
// ============================================================

// Fix para Node 18
const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const admin = require('firebase-admin');

// ── Firebase Admin ──────────────────────────────────────────
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

async function conectarWA() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      waListo = false;
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('Conexión cerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(conectarWA, 5000);
      }
    } else if (connection === 'open') {
      waListo = true;
      console.log('✅ WhatsApp conectado y listo');
      iniciarMotor();
    }
  });
}

function iniciarMotor() {
  console.log('🚀 Motor de cola iniciado');
  setInterval(procesarCola, 60 * 1000);
  procesarCola();
}

async function procesarCola() {
  if (!waListo) {
    console.log('⏳ WhatsApp no listo, esperando...');
    return;
  }

  const ahora = Date.now();

  try {
    const snapshot = await db
      .collection('tabano-difusion-cola')
      .where('estado', '==', 'pendiente')
      .where('horaProgramada', '<=', ahora)
      .limit(5)
      .get();

    if (snapshot.empty) {
      console.log('📭 Cola vacía');
      return;
    }

    for (const docSnap of snapshot.docs) {
      await procesarMensaje(docSnap);
      await esperar(30000 + Math.random() * 60000);
    }

  } catch (err) {
    console.error('❌ Error procesando cola:', err.message);
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
    console.log('✅ Enviado OK a', data.clienteNombre);

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
