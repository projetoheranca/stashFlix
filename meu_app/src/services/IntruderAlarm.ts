/**
 * IntruderAlarm — Componente de alarme sonoro 100% independente.
 *
 * Dispara quando o usuário erra o PIN 3+ vezes.
 * NÃO depende de gravação de vídeo, foto ou áudio espião.
 * Usa sons LOCAIS do bundle para funcionar offline e sem 404.
 */
import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import * as SecureStore from '@/src/services/SecureStoreManager';

// ─── Mapa de sons locais (bundled no app) ─────────────────────────────────────
// Arquivos em assets/sounds/ em formato .mp3 (funciona em iOS e Android).
// O Metro bundler resolve os require() estáticos no build — sem URL externa.
const SOUND_FILES: Record<string, any> = {
  sirene_policial:                require('@/assets/sounds/alarm_police.mp3'),
  'digital_watch_alarm_long.ogg': require('@/assets/sounds/alarm_default.mp3'),
  'spaceship_alarm.ogg':          require('@/assets/sounds/alarm_spaceship.mp3'),
  'alarm_clock.ogg':              require('@/assets/sounds/alarm_clock.mp3'),
  'dosimeter_alarm.ogg':          require('@/assets/sounds/alarm_dosimeter.mp3'),
};

// Som fallback caso a chave salva não exista no mapa
const FALLBACK_SOUND = require('@/assets/sounds/alarm_default.mp3');

let activeSound: Audio.Sound | null = null;
let activeVibration = false;

/**
 * Toca o aviso de invasão.
 * Chama este método ao detectar 3+ erros de PIN.
 * O som para automaticamente após `durationMs` milissegundos.
 */
export async function triggerIntruderAlarm(durationMs = 15000): Promise<void> {
  try {
    // Lê preferência do usuário
    const enabled = await SecureStore.getItemAsync('alarm_siren_enabled');
    if (enabled !== 'true') return;

    const soundKey = await SecureStore.getItemAsync('alarm_siren_sound');
    const soundSource = (soundKey && SOUND_FILES[soundKey]) ? SOUND_FILES[soundKey] : FALLBACK_SOUND;

    // Para qualquer alarme anterior ainda tocando
    await stopIntruderAlarm();

    // Configura canal de áudio para playback em modo de emergência
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,        // Toca mesmo no modo silencioso
      staysActiveInBackground: true,
      shouldDuckAndroid: false,           // Não abaixa outros sons
      playThroughEarpieceAndroid: false,  // Alto-falante principal (mais alto)
    });

    const { sound } = await Audio.Sound.createAsync(
      soundSource,
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    activeSound = sound;

    // Vibração pulsante de emergência
    Vibration.vibrate([300, 150, 300, 150], true);
    activeVibration = true;

    // Para automaticamente após a duração configurada
    setTimeout(() => stopIntruderAlarm(), durationMs);
  } catch (e) {
    console.warn('[IntruderAlarm] Falha ao disparar alarme:', e);
  }
}

/**
 * Para o alarme manualmente (útil quando o app é desbloqueado com sucesso).
 */
export async function stopIntruderAlarm(): Promise<void> {
  try {
    if (activeSound) {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
      activeSound = null;
    }
    if (activeVibration) {
      Vibration.cancel();
      activeVibration = false;
    }
    // Restaura modo de áudio normal
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });
  } catch {}
}
