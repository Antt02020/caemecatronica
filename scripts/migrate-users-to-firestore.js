// scripts/migrate-users-to-firestore.js
//
// ⚠️ REQUISITO PREVIO:
// Descargar el archivo Service Account Key (JSON) de la consola de Firebase:
// Firebase Console > Project Settings > Service Accounts > Generate new private key.
// Guardar el archivo como 'firebase-service-account.json' en la raíz del proyecto.
// ❗️ IMPORTANTE: Este archivo contiene credenciales sensibles y NO debe subirse al repositorio.
//    Asegúrate de que 'firebase-service-account.json' esté en tu archivo .gitignore.
//
// Para ejecutar este script de migración, corre:
// node scripts/migrate-users-to-firestore.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const dbJsonPath = path.join(__dirname, '..', 'db.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Error: No se encontró el archivo de credenciales de Firebase en:");
    console.error(`   ${serviceAccountPath}`);
    console.error("\nPor favor descárgalo desde la consola de Firebase y guárdalo ahí para continuar.");
    process.exit(1);
}

if (!fs.existsSync(dbJsonPath)) {
    console.error(`❌ Error: No se encontró el archivo de base de datos local en: ${dbJsonPath}`);
    process.exit(1);
}

// Inicializar el SDK de Administración de Firebase
admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
});

const auth = admin.auth();
const db = admin.firestore();

async function migrate() {
    try {
        console.log("Reading db.json...");
        const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
        const users = dbData.users || [];

        console.log(`Found ${users.length} users to migrate.\n`);
        let successCount = 0;
        let skipCount = 0;

        for (const u of users) {
            const email = u.email.trim();
            const password = u.password || 'TEMPORAL_CAMBIAR';
            const role = (u.role === 'administrador') ? 'admin' : 'student';
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Estudiante';

            console.log(`Processing: ${email}...`);

            let firebaseUser;
            try {
                // Crear usuario en Firebase Authentication
                firebaseUser = await auth.createUser({
                    email: email,
                    password: password,
                    displayName: name
                });
                console.log(`  ✅ User created in Auth (UID: ${firebaseUser.uid})`);
            } catch (err) {
                if (err.code === 'auth/email-already-exists') {
                    // Si ya existe, lo buscamos para migrar/actualizar el perfil de Firestore
                    firebaseUser = await auth.getUserByEmail(email);
                    console.log(`  ⚠️ User already exists in Auth. Updating profile in Firestore (UID: ${firebaseUser.uid})`);
                    skipCount++;
                } else {
                    console.error(`  ❌ Error creating user in Auth:`, err.message);
                    continue;
                }
            }

            // Mapear coursesUnlocked en base al plan del usuario y purchasedCareers
            const coursesUnlocked = [];
            if (u.plan === 'Premium') {
                coursesUnlocked.push('electronica', 'mecatronica');
            } else if (u.plan === 'Profesional') {
                if (u.career && u.career.toLowerCase() === 'electrónica') {
                    coursesUnlocked.push('electronica');
                } else if (u.career && u.career.toLowerCase() === 'mecatrónica') {
                    coursesUnlocked.push('mecatronica');
                }
            } else if (u.plan === 'Básico') {
                if (u.purchasedModules && u.purchasedModules.some(m => m.startsWith('elec-'))) {
                    coursesUnlocked.push('electronica');
                }
                if (u.purchasedModules && u.purchasedModules.some(m => m.startsWith('meca-'))) {
                    coursesUnlocked.push('mecatronica');
                }
            }

            const profileData = {
                uid: firebaseUser.uid,
                email: email,
                name: name,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                role: role,
                career: u.career || 'Ninguna',
                plan: u.plan || 'None',
                status: u.status || 'Activo',
                purchasedModules: u.purchasedModules || [],
                purchasedCareers: u.purchasedCareers || [],
                coursesUnlocked: coursesUnlocked,
                createdAt: new Date().toISOString()
            };

            // Escribir en Firestore
            await db.collection('users').doc(firebaseUser.uid).set(profileData);
            console.log(`  ✅ Profile document set in Firestore`);
            successCount++;
        }

        console.log("\n==================================================");
        console.log("Migration complete!");
        console.log(`- Users successfully processed/created: ${successCount}`);
        console.log(`- Existing users updated: ${skipCount}`);
        console.log("==================================================");

    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrate();
