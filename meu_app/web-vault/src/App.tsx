import { useState } from 'react';
import './App.css';

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
          <h2 className="brand">StashFlix Admin</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="icon">📊</span> Visão Geral
          </button>
          <button 
            className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="icon">👥</span> Usuários
          </button>
          <button 
            className={`nav-btn ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            <span className="icon">✉️</span> Disparos
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
            Sair do Painel
          </button>
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
            <span className="admin-name">Super Admin</span>
            <div className="admin-avatar">SA</div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              <div className="metric-card primary">
                <div className="metric-title">Cofres Ativos</div>
                <div className="metric-value">1,248</div>
                <div className="metric-trend positive">↑ 12% este mês</div>
              </div>
              <div className="metric-card secondary">
                <div className="metric-title">Armazenamento Cloud</div>
                <div className="metric-value">48.5 TB</div>
                <div className="metric-trend">Total alocado</div>
              </div>
              <div className="metric-card accent">
                <div className="metric-title">Assinantes PRO</div>
                <div className="metric-value">312</div>
                <div className="metric-trend positive">↑ 5% esta semana</div>
              </div>
              <div className="metric-card warning">
                <div className="metric-title">Alertas de Invasão</div>
                <div className="metric-value">84</div>
                <div className="metric-trend negative">Detectados hoje</div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="panel-card">
              <div className="panel-header">
                <h3>Base de Usuários</h3>
                <div className="search-box">
                  <input type="text" placeholder="Buscar por e-mail..." className="input-field" />
                </div>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>E-mail</th>
                      <th>Plano</th>
                      <th>Armazenamento</th>
                      <th>Último Login</th>
                      <th>Status</th>
                      <th>Ações</th>
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
                          <button className="action-btn">Ver</button>
                          <button className="action-btn text-danger">Bloquear</button>
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
                <h3>Nova Campanha / Alerta</h3>
              </div>
              <div className="form-group">
                <label>Público Alvo</label>
                <select 
                  className="input-field"
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                >
                  <option value="update">Todos (Aviso de Atualização)</option>
                  <option value="pro">Apenas Usuários PRO</option>
                  <option value="free">Promoção para Usuários FREE</option>
                  <option value="cancel">Aviso de Cancelamento/Inatividade</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assunto do E-mail</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Atualização Importante de Segurança"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Corpo da Mensagem (HTML suportado)</label>
                <textarea 
                  className="input-field textarea-field" 
                  placeholder="Escreva a mensagem aqui..."
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                ></textarea>
              </div>
              <div className="form-actions">
                <button className="btn-secondary">Salvar Rascunho</button>
                <button className="btn-primary" onClick={() => alert('E-mails disparados com sucesso!')}>
                  🚀 Disparar E-mails
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
