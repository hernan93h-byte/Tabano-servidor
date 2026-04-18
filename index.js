// ============================================================
// SERVIDOR HACHE BARBER — Motor de WhatsApp
// ============================================================
// Lee la cola de mensajes de Firebase y los manda por WhatsApp
// ============================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');

// ── Firebase Admin ──────────────────────────────────────────
// Las credenciales vienen de variables de entorno en Railway
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

// ── Estado del cliente WhatsApp ──────────────────────────────
let waListo = false;

// ── Cliente WhatsApp ─────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'hache-barber' }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  console.log('══════════════════════════════════════');
  console.log('ESCANEA ESTE QR CON WHATSAPP:');
  console.log('══════════════════════════════════════');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  waListo = true;
  console.log('✅ WhatsApp conectado y listo');
  // Arrancar el motor de cola
  iniciarMotor();
});

client.on('disconnected', (reason) => {
  waListo = false;
  console.log('❌ WhatsApp desconectado:', reason);
});

client.initialize();

// ── Motor principal ──────────────────────────────────────────
function iniciarMotor() {
  console.log('🚀 Motor de cola iniciado');
  // Revisar la cola cada 60 segundos
  setInterval(procesarCola, 60 * 1000);
  // También procesar ahora mismo al arrancar
  procesarCola();
}

async function procesarCola() {
  if (!waListo) {
    console.log('⏳ WhatsApp no listo, esperando...');
    return;
  }

  const ahora = Date.now();

  try {
    // Buscar mensajes pendientes cuya hora programada ya pasó
    const snapshot = await db
      .collection('tabano-difusion-cola')
      .where('estado', '==', 'pendiente')
      .where('horaProgramada', '<=', ahora)
      .limit(5)
      .get();

    if (snapshot.empty) {
      console.log('📭 Cola vacía o sin mensajes para ahora');
      return;
    }

    console.log(`📬 Encontré ${snapshot.size} mensajes para enviar`);

    for (const docSnap of snapshot.docs) {
      await procesarMensaje(docSnap);
      // Esperar entre mensajes (delay anti-ban: entre 30 y 90 segundos)
      const delay = 30000 + Math.random() * 60000;
      await esperar(delay);
    }

  } catch (err) {
    console.error('❌ Error procesando cola:', err.message);
  }
}

async function procesarMensaje(docSnap) {
  const data = docSnap.data();
  const docId = docSnap.id;

  console.log(`📤 Enviando a ${data.clienteNombre} (${data.clienteWA})`);

  // Marcar como "enviando" para no procesarlo dos veces
  await db.collection('tabano-difusion-cola').doc(docId).update({
    estado: 'enviando'
  });

  try {
    // Normalizar número: solo dígitos, agregar @c.us
    const numero = data.clienteWA.replace(/\D/g, '') + '@c.us';

    await client.sendMessage(numero, data.textoFinal);

    // Mover al historial
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

    // Borrar de la cola
    await db.collection('tabano-difusion-cola').doc(docId).delete();

    console.log(`✅ Enviado OK a ${data.clienteNombre}`);

  } catch (err) {
    console.error(`❌ Error enviando a ${data.clienteNombre}:`, err.message);

    // Marcar como error en la cola
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
