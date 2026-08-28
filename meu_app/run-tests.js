const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set, get, update, remove } = require('firebase/database');
const { getStorage, ref: storageRef, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

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
const storage = getStorage(app);

async function runTests() {
  console.log("=== INICIANDO TESTES DO MOTOR CLOUD (STASHFLIX) ===");

  try {
    // 1. Auth Test
    console.log("[1] Autenticando usuário de Teste via Email/Senha...");
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, 'mock_test_bot@stashflix.com', 'testes123');
      console.log(`[OK] Nova conta de teste criada! UID: ${userCredential.user.uid}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        userCredential = await signInWithEmailAndPassword(auth, 'mock_test_bot@stashflix.com', 'testes123');
        console.log(`[OK] Usuário de teste já existia. Logado! UID: ${userCredential.user.uid}`);
      } else {
        throw e;
      }
    }
    const uid = userCredential.user.uid;
    console.log(`[OK] Usuário logado: ${uid}`);

    // 2. Storage & RTDB Upload Test (Mocking Image, Video, Audio)
    const mockFiles = [
      { name: 'test_image.jpg', type: 'image/jpeg', size: 1024, album: 'Fotos' },
      { name: 'test_video.mp4', type: 'video/mp4', size: 5048576, album: 'Videos' },
      { name: 'test_audio.mp3', type: 'audio/mpeg', size: 512000, album: 'Main' }
    ];

    for (const file of mockFiles) {
      console.log(`\n[2] Testando upload de ${file.name} (${file.type})...`);
      
      // Mock File Data (Uint8Array)
      const mockData = new Uint8Array(file.size);
      
      // Upload to Storage
      const sRef = storageRef(storage, `users/${uid}/vault/${file.name}`);
      console.log(`    -> Enviando bytes para Firebase Storage...`);
      const snapshot = await uploadBytes(sRef, mockData, { contentType: file.type });
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`    -> [OK] Storage Uploaded! URL: ${downloadURL.substring(0, 50)}...`);

      // Save to RTDB (ApiService / VaultService behavior)
      console.log(`    -> Salvando metadados no Realtime Database...`);
      const safeFilename = file.name.replace(/\./g, '_');
      const dbFileRef = ref(db, `users/${uid}/vault_files/${safeFilename}`);
      
      await set(dbFileRef, {
        fileName: file.name,
        downloadUrl: downloadURL,
        albumName: file.album,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString()
      });
      console.log(`    -> [OK] Metadados salvos no RTDB!`);
    }

    // 3. Fetching / Catalog Test
    console.log("\n[3] Testando Listagem de Álbuns e Arquivos...");
    const vaultRef = ref(db, `users/${uid}/vault_files`);
    const vaultSnap = await get(vaultRef);
    
    if (vaultSnap.exists()) {
      const data = vaultSnap.val();
      const filesCount = Object.keys(data).length;
      console.log(`[OK] Catálogo lido com sucesso! Total de arquivos: ${filesCount}`);
      console.log(data);
    } else {
      console.log("[ERRO] Nenhum dado encontrado no RTDB.");
    }

    // 4. Moving to Trash Test
    console.log("\n[4] Testando mover arquivo para lixeira...");
    const testTrashFile = mockFiles[0].name.replace(/\./g, '_');
    await update(ref(db, `users/${uid}/vault_files/${testTrashFile}`), { trash: true });
    
    const trashSnap = await get(ref(db, `users/${uid}/vault_files/${testTrashFile}`));
    if (trashSnap.val().trash === true) {
      console.log(`[OK] Arquivo movido para a lixeira!`);
    }

    // 5. Cleanup Test (Empty Trash & Nuke)
    console.log("\n[5] Limpando dados de teste do Storage e RTDB...");
    for (const file of mockFiles) {
      // Remove do Storage
      try {
        await deleteObject(storageRef(storage, `users/${uid}/vault/${file.name}`));
        console.log(`    -> Removido do Storage: ${file.name}`);
      } catch(e) {
        console.log(`    -> Erro ao remover ${file.name}: ${e.message}`);
      }
    }
    // Remove do DB
    await remove(ref(db, `users/${uid}/vault_files`));
    console.log(`[OK] RTDB Limpo!`);

    console.log("\n=== TESTES FINALIZADOS COM SUCESSO! ===");
    process.exit(0);
  } catch (error) {
    console.error("\n[X] FALHA NOS TESTES:", error);
    process.exit(1);
  }
}

runTests();
