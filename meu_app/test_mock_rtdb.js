const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyC_eubyoduh1lr8nep8-cbrqEaSwM6FZ_g",
  authDomain: "stashflixapp.firebaseapp.com",
  databaseURL: "https://stashflixapp-default-rtdb.firebaseio.com",
  projectId: "stashflixapp",
  storageBucket: "stashflixapp.firebasestorage.app",
  messagingSenderId: "1064065932739",
  appId: "1:1064065932739:web:31122892778c447ff93176",
  measurementId: "G-NMQ2R9RJ0X"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

const mockData = {
  "7aSKRxYJBdQazjm6PxGELT4qis33": {
    "createdAt": "2026-05-06T16:40:43.992Z",
    "email": "mayketibia2@gmail.com",
    "planTier": "premium",
    "security": { "pin": "7777" },
    "updatedAt": "2026-05-06T17:39:06.475Z",
    "status": "active",
    "preferences": {
      "anti_invasion_activated_at": "2026-07-12T15:00:00.000Z",
      "breakin_alerts": "true"
    }
  },
  "RzfhdHAPgKZ5Z1QUbsHSoVZW4LI2": {
    "createdAt": "2026-04-20T17:22:38.398Z",
    "email": "maykedefigueiredo@gmail.com",
    "security": { "pin": "1509" },
    "updatedAt": "2026-04-20T18:28:21.317Z",
    "status": "active",
    "preferences": {
      "breakin_alerts": "false"
    }
  }
};

async function run() {
  console.log('Iniciando MOCK do Realtime Database...');
  try {
    const usersRef = ref(rtdb, 'users');
    await set(usersRef, mockData);
    console.log('Dados mockados cadastrados com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao cadastrar mock:', err);
    process.exit(1);
  }
}

run();
