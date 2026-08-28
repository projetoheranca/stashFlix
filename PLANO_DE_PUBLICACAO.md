# Timeline e Guia de Publicação - StashFlix (SafeVault)

Este documento detalha o passo a passo (Timeline) para o lançamento do aplicativo na **Google Play Store** e na **Apple App Store**, bem como a integração final do **RevenueCat** (Gateway de compras). 

Como você já possui a conta no **Google Play Console**, as documentações (site) e a conta inicial no **RevenueCat**, já pulamos várias etapas burocráticas!

---

## 📍 Timeline Geral de Publicação

### 🟢 FASE 1: Preparação do Ambiente e RevenueCat (Atual)
- [x] **Criar conta Google Play Console.**
- [x] **Criar site com Políticas de Privacidade, Termos e Exclusão de Conta.**
- [x] **Criar projeto no RevenueCat (Cadastro inicial feito).**
- [ ] **Criar conta Apple Developer:** Caso ainda não tenha, é necessário pagar a taxa anual ($99) na plataforma da Apple.
- [ ] **Gerar as Credenciais EAS (Expo):** Garantir que estamos logados no Expo CLI (`npx expo login`) para gerar as chaves de assinatura do app (Keystore do Android e Certificados da Apple).

---

### 🟡 FASE 2: Configuração In-App Purchases (Gateway nas Lojas)
Antes de mandarmos o app para revisão, as assinaturas precisam existir nas lojas.

#### No Google Play Console:
1. Acesse o menu **Monetizar > Produtos > Assinaturas**.
2. Crie a assinatura PRO (ex: `stashflix_pro_mensal` e `stashflix_pro_anual`).
3. Gere as credenciais de API (Service Account JSON) do Google Cloud vinculada ao Play Console.
4. **No RevenueCat:** Vá nas configurações do app Android, insira o JSON do Google e o pacote (`com.ksafe.vault`).

#### No App Store Connect (Apple):
1. Acesse **Features > In-App Purchases** e crie as assinaturas PRO.
2. Gere a **In-App Purchase Key** (Arquivo `.p8`) em *Users and Access*.
3. **No RevenueCat:** Vá nas configurações do app iOS, insira a Chave (p8), o Key ID, o Issuer ID e o Bundle ID (`com.ksafe.vault`).

*(Uma vez feito isso, as paywalls que criamos no app vão conseguir puxar os preços reais das lojas!)*

---

### 🟠 FASE 3: Fechamento das Builds de Produção (EAS Build)
Com os pacotes das lojas criados, precisamos gerar os arquivos que vão subir paras as lojas (AAB e IPA).

1. **Configurar o EAS:** Rodar `eas build:configure`.
2. **Build Android:** Rodar `eas build --platform android --profile production`. Isso vai gerar o arquivo `.aab` (Android App Bundle).
3. **Build iOS:** Rodar `eas build --platform ios --profile production`. Isso vai gerar o arquivo `.ipa` (iOS App).

---

### 🔴 FASE 4: Submissão - Google Play Store
1. **Criar o App:** No painel do Google Play, crie o app com o nome "StashFlix" (O disfarce).
2. **Listagem da Loja:** 
   - Fazer upload do ícone (512x512) e do Banner (1024x500).
   - Adicionar Screenshots (focando na interface de streaming para manter o disfarce, mas sem usar imagens com direitos autorais reais de filmes).
3. **Configuração do App (Compliance):**
   - Declarar Privacidade (linkar a página `privacy.html`).
   - Preencher questionário de Classificação de Conteúdo.
   - Declarar uso de permissões sensíveis (Câmera e Arquivos).
4. **Testes Fechados:** O Google agora exige que contas novas rodem o app em "Teste Fechado" com 20 testadores por 14 dias antes de lançar para o público geral.
5. **Aprovação e Produção:** Após os 14 dias, promover para produção.

---

### 🟣 FASE 5: Submissão - Apple App Store
A Apple é mais rigorosa com disfarces e permissões. Devemos ter cuidado.
1. **App Store Connect:** Criar o novo app lá dentro (`com.ksafe.vault`).
2. **Preencher Metadados:** Título, Subtítulo, Screenshots (tamanhos de 6.5" e 5.5").
3. **Declaração de Privacidade:** Responder ao questionário rigoroso sobre como tratamos dados, imagens e câmera (reforçar que tudo fica local e seguro).
4. **Notas para a Revisão (IMPORTANTE):**
   - Na hora de submeter, no campo "App Review Information", precisamos explicar detalhadamente para o revisor da Apple que **o app é um cofre disfarçado**.
   - Devemos enviar a eles qual é o **Gatilho e o PIN** de testes (ex: "Segure o botão X e digite 1234 para acessar o cofre real"). Se não dissermos isso, eles vão reprovar o app achando que é apenas um streaming falso sem conteúdo.
5. **Enviar para Revisão:** A Apple costuma responder em 24h a 48h.

---

## 🎯 Resumo de O que precisamos agora (Próximos Passos Imediatos):

Para avançarmos o projeto para a **FASE 2 / 3**, precisarei que você:
1. Me confirme se criaremos logo os produtos na **Play Store** (se você quiser, posso gerar os comandos para as credenciais).
2. Tenha as **Screenshots e Ícones** (as artes do StashFlix) prontas para subirmos no painel.

Se quiser começar agora a preparar as chaves e fazer a build de produção do Android (AAB), basta me avisar!
