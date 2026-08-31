import React, { useEffect, useState } from 'react';
import { t } from "@/src/i18n";

function App() {
  const [stats, setStats] = useState({
    total_users: 0,
    pro_users: 0,
    total_files: 0,
    storage_used_mb: 0,
    server_status: 'Offline',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erro ao conectar com o backend Go:', error);
        setStats(s => ({ ...s, server_status: 'Offline (Desconectado)' }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', backgroundColor: '#1A1B1E', color: '#C1C2C5', minHeight: '100vh' }}>
      <h1 style={{ color: '#6C63FF' }}> {t('safevault_admin_panel')} </h1>
      <p> {t('painel_de_controle_em_tem')} </p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#25262B', borderRadius: '8px' }}>
        <h2> {t('estatsticas_do_sistema')} </h2>
        <ul>
          <li> {t('status_do_servidor')} <span style={{ color: stats.server_status.includes('Online') ? '#40C057' : '#FA5252', fontWeight: 'bold' }}>{stats.server_status}</span></li>
          <li style={{ marginTop: '1rem' }}> {t('total_de_usurios')} <strong>{stats.total_users}</strong></li>
          <li> {t('usurios_com_plano_provip')} <strong style={{ color: '#FFD43B' }}>{stats.pro_users}</strong></li>
          <li> {t('total_de_arquivos_em_nuve')} <strong>{stats.total_files}</strong></li>
          <li> {t('armazenamento_utilizado')} <strong>{stats.storage_used_mb.toFixed(2)}  {t('mb')} </strong></li>
        </ul>
      </div>
    </div>
  );
}

export default App;
