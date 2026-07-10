import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useAppContext } from '@/src/contexts/AppContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface FeatureInfo {
  icon: string;
  title: string;
  isPremium?: boolean;
  whatIs: string;
  whatFor: string;
  howTo: string;
}

const features: FeatureInfo[] = [
  {
    icon: 'globe-outline',
    title: 'Camuflagem de Buscador (Navegador Falso)',
    whatIs: 'Um disfarce avançado que transforma a tela inicial de bloqueio em um buscador do Google simulado e perfeitamente funcional.',
    whatFor: 'Garante que qualquer pessoa que abrir o app ache que ele é apenas um navegador de internet comum, ocultando completamente o cofre.',
    howTo: 'Ative em Camuflagem & Disfarce. Defina uma palavra-chave secreta (padrão: "Batman"). Na tela inicial de busca, digite essa palavra exata na barra de pesquisa do Google e pressione Enter/Buscar para revelar o teclado invisível do cofre.'
  },
  {
    icon: 'calculator-outline',
    title: 'Calculadora Falsa',
    whatIs: 'Uma tela de bloqueio que se parece e funciona como uma calculadora real, resolvendo cálculos normais.',
    whatFor: 'Esconde a tela de login do cofre sob a fachada de um aplicativo de matemática insuspeito.',
    howTo: 'Selecione "Calculadora Falsa" em Camuflagem & Disfarce. Para abrir a senha do cofre, digite o seu PIN de 4 dígitos direto na calculadora e aperte o botão "=".'
  },
  {
    icon: 'alert-circle-outline',
    title: 'Falsa Falha no Sistema (Crash Disguise)',
    isPremium: true,
    whatIs: 'Uma tela de bloqueio simulada que exibe uma mensagem de falha do Android: "O aplicativo StashFlix parou de funcionar".',
    whatFor: 'Desestimula invasores fazendo-os crer que o aplicativo está quebrado e corrompido.',
    howTo: 'Selecione "Falsa Falha no Sistema (Crash)" em Camuflagem & Disfarce. Se clicarem em "Fechar app", o aplicativo fechará de verdade. Para acessar o teclado de PIN oculto, dê dois toques rápidos seguidos de um toque longo na palavra "Erro".'
  },
  {
    icon: 'lock-open-outline',
    title: 'Cofre Isca (Senha Falsa)',
    whatIs: 'Uma senha alternativa de 4 dígitos que abre um cofre secundário completamente separado e vazio.',
    whatFor: 'Ideal para situações de coação (quando você é forçado a abrir o cofre na frente de alguém), exibindo um ambiente falso sem suas mídias reais.',
    howTo: 'Defina a Senha Falsa nas configurações de Camuflagem. Digite este PIN secundário na tela de bloqueio para acessar a galeria isca.'
  },
  {
    icon: 'nuclear-outline',
    title: 'PIN de Autodestruição (Modo Kamikaze)',
    whatIs: 'Um código de emergência que destrói fisicamente todos os dados do cofre real em segundo plano.',
    whatFor: 'Proteção absoluta contra ameaças físicas diretas, destruindo os dados confidenciais de forma silenciosa e fingindo que abriu o cofre falso.',
    howTo: 'Defina um PIN Kamikaze em Camuflagem. Ao digitar esse PIN na tela de bloqueio, os arquivos criptografados serão deletados permanentemente e o app abrirá no cofre falso (isca) para despistar o invasor.'
  },
  {
    icon: 'camera-outline',
    title: 'Selfie de Intruso (Alerta de Invasão)',
    whatIs: 'Um sistema de captura fotográfica silenciosa que registra imagens de bisbilhoteiros utilizando a câmera frontal.',
    whatFor: 'Saber exatamente quem tentou abrir o seu cofre às escondidas e quando.',
    howTo: 'Ative "Alertas de Invasão" nos Ajustes. Se alguém errar o PIN 3 vezes consecutivas na tela de bloqueio, o app tira uma foto secreta da câmera frontal e a salva na pasta segura "INTRUSOS".'
  },
  {
    icon: 'trash-outline',
    title: 'Lixeira Inteligente',
    whatIs: 'Um diretório seguro e intermediário que armazena os arquivos deletados do cofre.',
    whatFor: 'Recuperar fotos ou vídeos apagados acidentalmente de forma rápida.',
    howTo: 'Mídias excluídas vão para a Lixeira do cofre. Acesse o menu lateral -> Lixeira para restaurá-las ao álbum de origem ou eliminá-las definitivamente do celular.'
  },
  {
    icon: 'cloud-upload-outline',
    title: 'Sincronização Cloud Descentralizada',
    isPremium: true,
    whatIs: 'Um sistema de backup que criptografa seus arquivos localmente e os envia de forma segura para servidores na nuvem.',
    whatFor: 'Evita a perda de suas mídias caso você perca, quebre ou troque de aparelho celular.',
    howTo: 'Ative nos Ajustes. O aplicativo otimizará as imagens localmente antes do upload para economizar internet e banda do usuário.'
  },
  {
    icon: 'image-outline',
    title: 'Fundo da Tela de Bloqueio Personalizado',
    isPremium: true,
    whatIs: 'Personalização visual que permite definir uma imagem da sua própria galeria como fundo da tela de bloqueio padrão.',
    whatFor: 'Melhorar a estética do aplicativo ao seu gosto pessoal.',
    howTo: 'Vá em Ajustes -> Fundo de Tela de Bloqueio e selecione uma foto de sua preferência (Requisito PRO).'
  },
  {
    icon: 'color-palette-outline',
    title: 'Personalização de Temas & Cores',
    whatIs: 'Configuração visual do aplicativo, incluindo Modo Escuro, Modo Claro e cores de destaque da interface.',
    whatFor: 'Ajustar o visual do cofre para combinar com sua preferência pessoal ou fadiga visual.',
    howTo: 'Acesse "Aparência" no menu lateral e selecione o tema de sua preferência (Modo Escuro, Modo Claro, Sistema) e escolha entre as diversas cores disponíveis.'
  },
  {
    icon: 'scan-outline',
    title: 'Auditoria de Risco (Scanner de Galeria)',
    whatIs: 'Um utilitário de segurança que faz uma varredura profunda na galeria pública do seu aparelho celular.',
    whatFor: 'Identificar possíveis mídias e fotos confidenciais que estão expostas no rolo da câmera do sistema e que deveriam ser guardadas no cofre.',
    howTo: 'Acesse "Auditoria de Risco" no painel principal ou no menu para iniciar a varredura. O app analisará e indicará a quantidade de arquivos que apresentam risco de exposição.'
  },
  {
    icon: 'eye-off-outline',
    title: 'Modo Fantasma (Ghost Mode)',
    isPremium: true,
    whatIs: 'Um recurso avançado de privacidade que oculta a tela da aplicação do menu de aplicativos recentes (multitarefa) do sistema operacional.',
    whatFor: 'Impedir que qualquer bisbilhoteiro veja o conteúdo ou saiba que o cofre estava aberto ao navegar pelos aplicativos recentes do celular.',
    howTo: 'Ative "Modo Fantasma" nas configurações do Sistema. Uma vez ativo, a tela do cofre ficará invisível ou preta no histórico de multitarefa.'
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Proteção Anti-Print',
    isPremium: true,
    whatIs: 'Bloqueio no nível do sistema operacional que impede capturas (screenshots) ou gravações de tela da aplicação.',
    whatFor: 'Garantir privacidade máxima, impedindo que outros aplicativos maliciosos ou usuários capturem imagens de dentro do seu cofre.',
    howTo: 'Ative "Proteção Anti-Print" nas configurações do Sistema. Qualquer tentativa de tirar print ou gravar a tela resultará em uma imagem preta ou bloqueio de captura pelo sistema.'
  },
  {
    icon: 'mic-outline',
    title: 'Microfone Espião (Áudio de Intruso)',
    isPremium: true,
    whatIs: 'Uma ferramenta que grava de forma oculta o áudio ambiente do aparelho celular.',
    whatFor: 'Capturar áudios e sons ao redor no momento em que alguém tenta invadir o seu cofre digitando a senha incorretamente.',
    howTo: 'Ative "Microfone Espião" nas configurações. Se o PIN for inserido incorretamente 3 vezes seguidas, o app grava silenciosamente 15 segundos do microfone e salva o áudio no menu "Alertas de Invasão".'
  },
  {
    icon: 'hourglass-outline',
    title: 'Autodestruição por Inatividade (Dead Man\'s Switch)',
    isPremium: true,
    whatIs: 'Um gatilho de segurança temporizado baseado em inatividade prolongada do aplicativo.',
    whatFor: 'Proteção extrema caso o celular seja perdido ou apreendido por terceiros por longos períodos de tempo.',
    howTo: 'Defina o "Tempo de Autodestruição" nas configurações de Sistema (7, 14 ou 30 dias). Se o aplicativo não for acessado dentro do prazo configurado, todo o conteúdo do cofre real será completamente apagado.'
  },
  {
    icon: 'apps-outline',
    title: 'Disfarce de Ícone do Aplicativo',
    isPremium: true,
    whatIs: 'Uma camuflagem estética que substitui o ícone e o nome do aplicativo na tela inicial do celular por ícones inofensivos.',
    whatFor: 'Fazer o aplicativo se disfarçar de Clima, Calculadora, Navegador Genérico, Bússola Web ou Buscador, sem levantar qualquer suspeita.',
    howTo: 'Acesse "Aparência" no menu lateral, role até "Ícone do Aplicativo" e escolha a fachada desejada. O ícone oficial (StashFlix) é gratuito, e as camuflagens de disfarce necessitam do plano PRO.'
  },
  {
    icon: 'grid-outline',
    title: 'Estilo do Teclado de Bloqueio',
    whatIs: 'Personalização do teclado numérico de desbloqueio da tela de PIN.',
    whatFor: 'Alterar a estética do teclado para maior estilo visual ou ergonomia.',
    howTo: 'Vá em "Aparência" no menu lateral e selecione o design desejado: Padrão (círculos clássicos) ou Geométrico (formato diamante cyberpunk).'
  },
  {
    icon: 'mail-outline',
    title: 'Email de Recuperação Seguro',
    whatIs: 'Um mecanismo de backup de credencial vinculado ao seu email.',
    whatFor: 'Garantir que você possa redefinir seu PIN principal com segurança caso o esqueça, enviando um código para seu email cadastrado.',
    howTo: 'Acesse "Email de Recuperação" no menu ou durante a configuração inicial do aplicativo para cadastrar seu endereço de email seguro.'
  }
];

export default function HelpScreen() {
  const { activePalette: theme } = useAppContext();
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          GUIA COMPLETO DE FUNCIONALIDADES DO STASHFLIX
        </Text>
      </View>

      <View style={styles.list}>
        {features.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setSelectedFeature(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.surfaceHighlight }]}>
              <Ionicons name={item.icon as any} size={24} color={item.isPremium ? '#FFD700' : theme.tint} />
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>
                {item.title} {item.isPremium && <Text style={{ color: '#FFD700', fontSize: 10 }}>[PRO]</Text>}
              </Text>
              <Text style={[styles.itemSub, { color: theme.textSecondary }]} numberOfLines={1}>
                Clique para ver os detalhes da função
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.border} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Detalhado da Função */}
      <Modal
        visible={selectedFeature !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedFeature(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {selectedFeature && (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name={selectedFeature.icon as any} size={32} color={selectedFeature.isPremium ? '#FFD700' : theme.tint} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedFeature.title}
                  </Text>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.tint }]}>O que é?</Text>
                    <Text style={[styles.sectionBody, { color: theme.text }]}>
                      {selectedFeature.whatIs}
                    </Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.tint }]}>Para que serve?</Text>
                    <Text style={[styles.sectionBody, { color: theme.text }]}>
                      {selectedFeature.whatFor}
                    </Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.tint }]}>Como usar?</Text>
                    <Text style={[styles.sectionBody, { color: theme.text }]}>
                      {selectedFeature.howTo}
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: selectedFeature.isPremium ? '#FFD700' : theme.tint }]}
                  onPress={() => setSelectedFeature(null)}
                >
                  <Text style={[styles.closeButtonText, { color: '#000' }]}>ENTENDIDO</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20 },
  subtitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 2, textAlign: 'center' },
  list: { paddingHorizontal: 20, gap: 15 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  itemSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '80%', borderRadius: 16, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
  modalTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', flex: 1 },
  modalScroll: { marginBottom: 20 },
  section: { marginBottom: 15 },
  sectionHeader: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  sectionBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  closeButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 }
});
