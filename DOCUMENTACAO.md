# Documentação Completa do Projeto - StashFlix (SafeVault)

Este documento serve como guia definitivo para o projeto, detalhando a arquitetura, as lógicas de front-end, back-end, infraestrutura e fluxos principais. Ele foi desenhado para nortear novos desenvolvedores e guiar futuras manutenções.

---

## 1. Visão Geral do Projeto

O projeto é um aplicativo de **Cofre Seguro (Vault) disfarçado de um aplicativo de streaming de filmes chamado "StashFlix"**. O objetivo é oferecer aos usuários um local seguro e oculto para guardar fotos e vídeos sensíveis, protegidos por PIN, biometria e criptografia.

O ecossistema do projeto é dividido em 3 frentes principais:
1. **Aplicativo Mobile (`/meu_app`)**: O app em si, disfarçado (Front-end mobile).
2. **Painel Administrativo (`/admin-panel`)**: Dashboard para gestão de usuários e métricas (Back-end/Admin).
3. **Site Institucional (`/website`)**: Landing page, termos de uso, política de privacidade e exclusão de conta (Landing/Compliance).

---

## 2. Aplicativo Mobile (`/meu_app`)

O núcleo do projeto. Desenvolvido com **React Native (Expo)** e **TypeScript**.

### 2.1 Stack Tecnológica (Mobile)
- **Framework:** Expo SDK 54+ (React Native 0.81+).
- **Roteamento:** Expo Router (Roteamento baseado em arquivos na pasta `/app`).
- **Estilização:** NativeWind v4 (Tailwind CSS para React Native) + Reanimated para animações fluidas.
- **Armazenamento Seguro:** `expo-secure-store` para guardar o PIN real, o PIN falso (decoy) e chaves de criptografia.
- **Sistema de Arquivos e Mídia:** `expo-file-system`, `expo-media-library` e `react-native-nitro-modules` para mover/criptografar mídias da galeria para o diretório privado do app.
- **Câmera:** `expo-camera` para tirar foto de intrusos (Intruder Alarm).
- **Pagamentos/Assinatura:** `react-native-purchases` (RevenueCat) para gerenciar o plano PRO (Backup na Nuvem).

### 2.2 Estrutura de Diretórios e Fluxos
- `app/`: Contém as rotas do Expo Router.
  - `disguise.tsx` e `decoy.tsx`: Telas do disfarce (cara de app de streaming).
  - `setup-pin.tsx` e `confirm-pin.tsx`: Configuração e validação de segurança.
  - `(drawer)/`: Navegação principal dentro do cofre após validação bem-sucedida.
  - `paywall.tsx`: Tela de conversão para assinatura PRO.
- `src/services/`: Toda a lógica de negócios pesada.
  - `VaultService.ts`: Lógica principal de ocultação de mídias e criptografia.
  - `IntruderAlarm.ts`: Dispara a câmera silenciosamente se a senha for errada repetidas vezes.
  - `SecureStoreManager.ts`: Abstração para ler/gravar tokens e PINs no Keychain/Keystore do SO.
  - `ApiService.ts` e `FirebaseDB.ts`: Comunicação com o Firebase (autenticação e cloud backup).

### 2.3 Lógica de Disfarce e Segurança
- O app abre mostrando uma interface de streaming (StashFlix). Existe um "gatilho" secreto (ex: segurar um botão específico ou digitar um código no campo de busca) que abre a tela de inserção de PIN.
- **Decoy Mode (Modo Falso):** Se o usuário for forçado a abrir o app, ele pode digitar um "PIN Falso". O app abrirá um cofre vazio ou com arquivos irrelevantes, protegendo o cofre principal.

### 2.4 Funcionalidades do App (Features)
- **Modo Disfarce (Disguise Mode):** Interface idêntica a um app de streaming (StashFlix) para esconder a verdadeira finalidade do app.
- **Cofre Seguro (Vault):** Criptografia avançada e ocultação de fotos, vídeos e documentos confidenciais no armazenamento local do dispositivo.
- **Senha Falsa / Cofre Falso (Decoy PIN):** Permite configurar uma segunda senha que abre um cofre vazio ou com conteúdos não sensíveis. Ideal para situações de coação (ex: assaltos ou parceiros bisbilhoteiros).
- **Alerta de Intruso (Intruder Alarm):** Tira uma foto silenciosamente (usando a câmera frontal) de qualquer pessoa que errar o PIN e registra o horário da tentativa, salvando no log interno.
- **Backup na Nuvem (Cloud Sync - Plano PRO):** Sincronização segura via Firebase Storage dos arquivos criptografados para não perder nada caso o aparelho seja formatado ou roubado.
- **Ícone e Nome Disfarçados:** Na tela do celular, o app aparece apenas como "StashFlix" com ícone de streaming, não chamando nenhuma atenção.
- **Pagamentos / Assinaturas in-app:** Integração via RevenueCat (Paywall) para gerenciar upgrade e liberação de funções premium e maior espaço em nuvem.

---

## 3. Painel Administrativo (`/admin-panel`)

Painel web restrito aos donos do app para controle total da operação.

### 3.1 Stack Tecnológica (Admin)
- **Framework:** Next.js (App Router, v16+) com React 19.
- **Linguagem:** TypeScript.
- **Estilização:** Tailwind CSS v4 com PostCSS.
- **Interface:** Layout dark theme, focado em dashboards (Sci-fi/Hacker style).

### 3.2 Funcionalidades
- **Métricas Globais:** Visualização de Usuários Ativos, Armazenamento Cloud utilizado vs Cota, Receita Recorrente (MRR das assinaturas PRO) e alertas de Violação de PIN (Intrusos detectados hoje).
- **Gestão de Usuários:** Listagem de usuários (ID, E-mail, Plano Free/PRO, Status). Permite banir usuários suspeitos ou ver uso de cloud.
- **Sistema Transacional (E-mails):** Interface desenhada para disparar comunicados em massa, respostas de suporte e recuperação de senha.

---

## 4. Site / Landing Page (`/website`)

Um site estático voltado para aprovação nas lojas (App Store / Google Play) e marketing básico.

### 4.1 Stack Tecnológica (Site)
- **Framework:** Vite + HTML5 Clássico + CSS Vanilla.
- **Pacotes:** Node/NPM puramente para build.

### 4.2 Estrutura
- `index.html`: Página inicial de vendas do app.
- `privacy.html`: Política de Privacidade (Obrigatório para as lojas de apps, explica o uso da Câmera e Storage local).
- `terms.html`: Termos de Uso.
- `support.html`: Central de suporte ao usuário.
- `exclusaodeconta.html`: Fluxo para LGPD / GDPR (exigência da Apple e Google para apps com login).

---

## 5. Back-end e Infraestrutura

A infraestrutura do aplicativo é fortemente baseada no ecossistema serverless do Google (Firebase) e RevenueCat.

1. **Autenticação (Firebase Auth):** Gerencia os logins dos usuários que desejam fazer backup na nuvem.
2. **Banco de Dados (Firestore / RTDB):** Salva os metadados dos usuários, configurações de conta, histórico de alertas de invasão (logs). Regras de segurança rigorosas (`firestore.rules`).
3. **Storage (Firebase Storage):** Hospeda o backup criptografado das fotos e vídeos para usuários do plano PRO.
4. **Assinaturas (RevenueCat):** Centraliza os webhooks de pagamento (App Store / Google Play) e libera o status PRO para o Firebase e App.

---

## 6. Scripts Auxiliares

Na raiz do repositório (`/meu_app` e raiz principal), existem diversos scripts Python (`fix_*.py`, `inject_*.py`, `clean_*.py`) e scripts `.js` que servem para automatizar manutenção:
- Injeção de componentes.
- Limpeza de cache.
- Ajustes rápidos de layout ou tipagem.

## 7. Próximos Passos & Manutenção Futura
Consulte sempre o arquivo `BACKLOG.md` na raiz para o roadmap do produto (ex: temas Cyberpunk, partículas, etc). 
A prioridade arquitetural deve ser sempre manter o módulo do Cofre (`VaultService.ts`) isolado do módulo de UI para garantir que vazamentos de memória no React não exponham chaves criptográficas.

---
**Criado por Antigravity AI** - *Guia definitivo do repositório STASHLYFLIX.*
