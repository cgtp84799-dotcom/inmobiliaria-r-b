// scripts/migrate-property-status.js
//
// Migración one-shot: convierte status legacy en español a los valores
// canónicos del enum PROPERTY_STATUS (en inglés).
//
// Uso:
//   1. Descargar el service account JSON desde Firebase Console
//      → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.
//   2. Guardarlo como scripts/service-account.json (NO committear, está en .gitignore).
//   3. Ejecutar:  node scripts/migrate-property-status.js
//
// Es idempotente — correrlo varias veces no causa daño.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = join(__dirname, 'service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
} catch (err) {
  console.error(`No pude leer ${SA_PATH}.`);
  console.error('Descarga el service account desde Firebase Console y guárdalo en esa ruta.');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const STATUS_MAP = {
  disponible: 'published',
  available:  'published',
  active:     'published',
  reservada:  'reserved',
  vendida:    'sold',
  arrendada:  'rented',
  inactiva:   'inactive',
  borrador:   'draft',
};

async function run() {
  console.log('Iniciando migración de status...\n');
  const snap = await db.collection('properties').get();
  console.log(`Encontradas ${snap.size} propiedades. Analizando...`);

  let updated = 0;
  let skipped = 0;
  let firestoreOps = 0;
  let batch = db.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const raw = String(data.status || '').toLowerCase();
    const target = STATUS_MAP[raw];

    if (!target || target === data.status) {
      skipped++;
      continue;
    }

    console.log(`  ${docSnap.id}: "${data.status}" → "${target}"`);
    batch.update(docSnap.ref, { status: target });
    updated++;
    firestoreOps++;

    // Commit cada 400 ops para evitar el límite de 500/batch
    if (firestoreOps >= 400) {
      await batch.commit();
      batch = db.batch();
      firestoreOps = 0;
    }
  }

  if (firestoreOps > 0) {
    await batch.commit();
  }

  console.log(`\n✓ Migración completada.`);
  console.log(`  Actualizadas:    ${updated}`);
  console.log(`  Sin cambios:     ${skipped}`);
}

run().catch((err) => {
  console.error('\n✗ Error en migración:', err);
  process.exit(1);
});
