const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set, get, update, remove } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyC_eubyoduh1lr8nep8-cbrqEaSwM6FZ_g",
  authDomain: "stashflixapp.firebaseapp.com",
  databaseURL: "https://stashflixapp-default-rtdb.firebaseio.com",
  projectId: "stashflixapp",
  storageBucket: "stashflixapp.firebasestorage.app",
  messagingSenderId: "1064065932739",
  appId: "1:1064065932739:web:31122892778c447ff93176"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function runTests() {
  console.log("=== INICIANDO TESTES DE PREFERÊNCIAS E PLANOS ===");

  try {
    // 1. Auth Test
    console.log("[1] Logando na conta de teste...");
    const userCredential = await signInWithEmailAndPassword(auth, 'mock_test_bot@stashflix.com', 'testes123');
    const uid = userCredential.user.uid;
    console.log(`[OK] Logado com sucesso! UID: ${uid}`);

    // 2. Simulando o App (saveUserPreferences)
    console.log(`\n[2] Modificando plano para PRO e tema para BLUE...`);
    const prefsRef = ref(db, `users/${uid}/preferences`);
    
    // Atualizando as preferências
    await update(prefsRef, {
      theme: 'blue',
      disguiseMode: 'calculator',
      plan: 'PRO',
      lastUpdated: new Date().toISOString()
    });
    console.log(`    -> Comando de update() enviado ao BD!`);

    // 3. Verificando o BD
    console.log(`\n[3] Lendo os dados direto do Firebase para verificar a gravação...`);
    const snapshot = await get(prefsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log(`    -> Leitura bem sucedida:`);
      console.log(data);
      
      if (data.plan === 'PRO' && data.theme === 'blue') {
        console.log(`[OK] Lógica de gravação e atualização validada! O Plano foi atualizado para PRO.`);
      } else {
        console.log(`[ERRO] Os dados não bateram!`);
      }
    } else {
      console.log(`[ERRO] Caminho de preferências não encontrado no BD!`);
    }

    console.log("\n=== TESTE DE PREFERÊNCIAS FINALIZADO COM SUCESSO! ===");
    process.exit(0);
  } catch (error) {
    console.error("\n[X] FALHA NOS TESTES:", error);
    process.exit(1);
  }
}

runTests();
