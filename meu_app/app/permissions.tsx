import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import * as MediaLibrary from 'expo-media-library';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';

export default function PermissionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [permission, requestPermission] = useCameraPermissions();

  const handleRequestPermission = async () => {
    try {
      // 1. Pede permissão de câmera (necessária para anti-invasão)
      if (!permission?.granted) {
        await requestPermission();
      }
      
      // 2. Pede permissão de microfone para o Alarme e SpyMic
      await Audio.requestPermissionsAsync();

      // 3. Pede permissão de Arquivos/Galeria
      let mediaStatus = await MediaLibrary.getPermissionsAsync();
      if (!mediaStatus.granted && mediaStatus.canAskAgain) {
        mediaStatus = await MediaLibrary.requestPermissionsAsync();
      }
      
      if (mediaStatus.granted) {
        // Todas as permissões cruciais foram concedidas, avança!
        router.push('/setup-pin');
      } else {
        // Se a permissão foi negada permanentemente, manda para as configurações do Android/iOS
        Alert.alert(
          'Permissão Necessária',
          'Para proteger e ocultar seus arquivos, o StashFlix precisa de acesso à Galeria. Toque em "Configurações" e conceda a permissão de Arquivos e Mídia.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (e) {
      // Falback genérico caso a API do sistema falhe
      Alert.alert(
        'Erro de Permissão',
        'Não foi possível solicitar as permissões. Por favor, acesse as configurações do seu aparelho e libere manualmente.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configurações', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.surfaceHighlight }]}>
          <Text style={{ fontSize: 50 }}>📸</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Permissão de Acesso</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Para mover suas fotos e vídeos para o cofre seguro, precisamos de permissão para ler e modificar a sua galeria.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>O que faremos:</Text>
          <Text style={[styles.cardItem, { color: theme.textSecondary }]}>✓ Ler mídias para importação</Text>
          <Text style={[styles.cardItem, { color: theme.textSecondary }]}>✓ Apagar da galeria original (após o cofre)</Text>
          <Text style={[styles.cardItem, { color: theme.textSecondary }]}>✗ NUNCA enviaremos seus dados para servidores públicos sem sua autorização</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Conceder Acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push('/setup-pin')}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Pular por enquanto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardItem: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 30,
    paddingBottom: 50,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
});
