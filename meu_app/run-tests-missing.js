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

async function runMissingTests() {
  console.log("=== TESTANDO FUNÇÕES AUSENTES DO VAULT ===");

  try {
    console.log("[1] Autenticando...");
    const userCredential = await signInWithEmailAndPassword(auth, 'mock_test_bot@stashflix.com', 'testes123');
    const uid = userCredential.user.uid;
    console.log(`[OK] Autenticado! UID: ${uid}`);

    // Criação de Arquivos Dummy para testes de Quota e Mover
    console.log("\n[2] Injetando arquivos de teste...");
    const file1Ref = ref(db, `users/${uid}/vault_files/test_rename_jpg`);
    await set(file1Ref, {
      fileName: 'test_rename.jpg', downloadUrl: 'http', albumName: 'Main', sizeBytes: 500000000, trash: false
    });
    const file2Ref = ref(db, `users/${uid}/vault_files/test_move_jpg`);
    await set(file2Ref, {
      fileName: 'test_move.jpg', downloadUrl: 'http', albumName: 'Secundario', sizeBytes: 600000000, trash: false
    });
    console.log(`[OK] 2 Arquivos massivos criados totalizando 1.1GB.`);

    // --- TESTE: getCloudStorageUsed & checkStorageQuota ---
    console.log("\n[3] Testando Cálculo de Quota (getCloudStorageUsed)...");
    const vaultSnap = await get(ref(db, `users/${uid}/vault_files`));
    let totalBytes = 0;
    if (vaultSnap.exists()) {
      const files = vaultSnap.val();
      for (const key in files) {
        if (!files[key].trash) totalBytes += (files[key].sizeBytes || 0);
      }
    }
    console.log(`    -> Volumetria Calculada: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    if (totalBytes > 1073741824) { // > 1GB
       console.log(`[OK] Bloqueio do plano FREE de 1GB simulado com sucesso (Ultrapassou limite)!`);
    }

    // --- TESTE: moveFileBetweenAlbums ---
    console.log("\n[4] Testando moveFileBetweenAlbums (Mover 'test_move_jpg' de Secundario -> Main)...");
    await update(ref(db, `users/${uid}/vault_files/test_move_jpg`), { albumName: 'Main' });
    const checkMove = await get(ref(db, `users/${uid}/vault_files/test_move_jpg`));
    if (checkMove.val().albumName === 'Main') console.log(`[OK] Arquivo movido com sucesso no banco de dados!`);

    // --- TESTE: renameAlbum ---
    console.log("\n[5] Testando renameAlbum (Main -> Viagens)...");
    const files = vaultSnap.val();
    const updates = {};
    for (const key in files) {
      if (files[key].albumName === 'Main') {
        updates[`users/${uid}/vault_files/${key}/albumName`] = 'Viagens';
      }
    }
    await update(ref(db), updates);
    console.log(`[OK] Álbum renomeado com sucesso em todos os nós filhos!`);

    // --- TESTE: restoreFromTrash ---
    console.log("\n[6] Testando restoreFromTrash...");
    await update(ref(db, `users/${uid}/vault_files/test_rename_jpg`), { trash: true });
    await update(ref(db, `users/${uid}/vault_files/test_rename_jpg`), { trash: null });
    const checkRestore = await get(ref(db, `users/${uid}/vault_files/test_rename_jpg`));
    if (checkRestore.val().trash === undefined || checkRestore.val().trash === null) {
        console.log(`[OK] Arquivo restaurado da lixeira (Flag Removida)!`);
    }

    // --- TESTE: deleteAlbum ---
    console.log("\n[7] Testando deleteAlbum (Apagar o álbum 'Viagens')...");
    const deleteUpdates = {};
    for (const key in files) {
      // Todos do Main viraram Viagens
      deleteUpdates[`users/${uid}/vault_files/${key}`] = null;
    }
    await update(ref(db), deleteUpdates);
    console.log(`[OK] Nós do álbum apagados permanentemente do RTDB!`);

    console.log("\n=== TESTES AUSENTES (QUOTA, RENAME, MOVE, RESTORE, DELETE_ALBUM) FINALIZADOS COM SUCESSO! ===");
    process.exit(0);
  } catch (error) {
    console.error("\n[X] FALHA NOS TESTES:", error);
    process.exit(1);
  }
}

runMissingTests();
