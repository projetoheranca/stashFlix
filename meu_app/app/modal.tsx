import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t } from "@/src/i18n";

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title"> {t('this_is_a_modal')} </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link"> {t('go_to_home_screen')} </ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
