import { useState } from 'react';
import './App.css';
import { t } from "@/src/i18n";

interface User {
  id: string;
  email: string;
  plan: 'FREE' | 'PRO';
  storageUsed: string;
  lastLogin: string;
  status: 'Ativo' | 'Bloqueado';
}

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'emails'>('overview');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailType, setEmailType] = useState('update');

  const mockUsers: User[] = [
    { id: 'usr_1', email: 'cabelo@stashflix.com', plan: 'PRO', storageUsed: '1.5 GB', lastLogin: 'Agora', status: 'Ativo' },
    { id: 'usr_2', email: 'teste@gmail.com', plan: 'FREE', storageUsed: '25 MB', lastLogin: 'Ontem', status: 'Ativo' },
    { id: 'usr_3', email: 'suspeito@hack.net', plan: 'FREE', storageUsed: '0 MB', lastLogin: 'Há 5 dias', status: 'Bloqueado' },
  ];

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">S</div>
          <h2 className="brand"> {t('stashflix_admin')} </h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="icon">📊</span>  {t('viso_geral')} </button>
          <button 
            className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="icon">👥</span>  {t('usurios')} </button>
          <button 
            className={`nav-btn ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            <span className="icon">✉️</span>  {t('disparos')} </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
             {t('sair_do_painel')} </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <h1 className="page-title">
            {activeTab === 'overview' && 'Visão Geral do Sistema'}
            {activeTab === 'users' && 'Gerenciamento de Usuários'}
            {activeTab === 'emails' && 'Central de Comunicação'}
          </h1>
          <div className="admin-profile">
            <span className="admin-name"> {t('super_admin')} </span>
            <div className="admin-avatar"> {t('sa')} </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              <div className="metric-card primary">
                <div className="metric-title"> {t('cofres_ativos')} </div>
                <div className="metric-value">1,248</div>
                <div className="metric-trend positive"> {t('12_este_ms')} </div>
              </div>
              <div className="metric-card secondary">
                <div className="metric-title"> {t('armazenamento_cloud')} </div>
                <div className="metric-value"> {t('485_tb')} </div>
                <div className="metric-trend"> {t('total_alocado')} </div>
              </div>
              <div className="metric-card accent">
                <div className="metric-title"> {t('assinantes_pro')} </div>
                <div className="metric-value">312</div>
                <div className="metric-trend positive"> {t('5_esta_semana')} </div>
              </div>
              <div className="metric-card warning">
                <div className="metric-title"> {t('alertas_de_invaso')} </div>
                <div className="metric-value">84</div>
                <div className="metric-trend negative"> {t('detectados_hoje')} </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="panel-card">
              <div className="panel-header">
                <h3> {t('base_de_usurios')} </h3>
                <div className="search-box">
                  <input type="text" placeholder="Buscar por e-mail..." className="input-field" />
                </div>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th> {t('id')} </th>
                      <th> {t('email')} </th>
                      <th> {t('plano_1')} </th>
                      <th> {t('armazenamento')} </th>
                      <th> {t('ltimo_login')} </th>
                      <th> {t('status')} </th>
                      <th> {t('aes')} </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUsers.map(user => (
                      <tr key={user.id}>
                        <td className="text-muted">{user.id}</td>
                        <td className="font-medium">{user.email}</td>
                        <td>
                          <span className={`badge ${user.plan === 'PRO' ? 'badge-pro' : 'badge-free'}`}>
                            {user.plan}
                          </span>
                        </td>
                        <td>{user.storageUsed}</td>
                        <td>{user.lastLogin}</td>
                        <td>
                          <span className={`status-dot ${user.status === 'Ativo' ? 'status-active' : 'status-blocked'}`}></span>
                          {user.status}
                        </td>
                        <td>
                          <button className="action-btn"> {t('ver')} </button>
                          <button className="action-btn text-danger"> {t('bloquear')} </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="panel-card email-composer">
              <div className="panel-header">
                <h3> {t('nova_campanha__alerta')} </h3>
              </div>
              <div className="form-group">
                <label> {t('pblico_alvo')} </label>
                <select 
                  className="input-field"
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                >
                  <option value="update"> {t('todos_aviso_de_atualizao')} </option>
                  <option value="pro"> {t('apenas_usurios_pro')} </option>
                  <option value="free"> {t('promoo_para_usurios_free')} </option>
                  <option value="cancel"> {t('aviso_de_cancelamentoinat')} </option>
                </select>
              </div>
              <div className="form-group">
                <label> {t('assunto_do_email')} </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Atualização Importante de Segurança"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label> {t('corpo_da_mensagem_html_su')} </label>
                <textarea 
                  className="input-field textarea-field" 
                  placeholder="Escreva a mensagem aqui..."
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                ></textarea>
              </div>
              <div className="form-actions">
                <button className="btn-secondary"> {t('salvar_rascunho')} </button>
                <button className="btn-primary" onClick={() => alert('E-mails disparados com sucesso!')}>
                   {t('disparar_emails')} </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
