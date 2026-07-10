import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getTrashFiles, restoreFromTrash, emptyTrash } from '@/src/services/VaultService';
import { useAppContext } from '@/src/contexts/AppContext';

export default function TrashScreen() {
  const { activePalette: theme, isFakeVault } = useAppContext();
  const [trashFiles, setTrashFiles] = useState<any[]>([]);

  const loadTrash = async () => {
    const files = await getTrashFiles(isFakeVault);
    setTrashFiles(files);
  };

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [isFakeVault])
  );

  const handleRestore = async (uri: string) => {
    const success = await restoreFromTrash(uri, isFakeVault);
    if (success) {
      Alert.alert("Sucesso", "Arquivo restaurado para o álbum original.");
      loadTrash();
    }
  };

  const handleEmptyTrash = () => {
    Alert.alert(
      "Esvaziar Lixeira",
      "Isso apagará permanentemente todos os arquivos. Eles não poderão ser recuperados. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Esvaziar", style: "destructive", onPress: async () => {
            await emptyTrash(isFakeVault);
            loadTrash();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>LIXEIRA</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {trashFiles.length} itens ocupando espaço
        </Text>
      </View>

      <FlatList 
        data={trashFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.fileInfo}>
              <Text style={{ fontSize: 24, marginRight: 15 }}>🗑️</Text>
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.restoreBtn, { backgroundColor: theme.tint }]}
              onPress={() => handleRestore(item.uri)}
            >
              <Text style={styles.restoreText}>RESTAURAR</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          trashFiles.length > 0 ? (
            <View style={{ backgroundColor: '#1A0A0A', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#3A1010' }}>
              <Text style={{ color: '#FF0033', fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                ⚠️ Atenção: Os arquivos na lixeira não foram excluídos do servidor e continuam ocupando espaço do seu Backup em Nuvem.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 15 }}>✨</Text>
            <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Estou tão sozinha aqui....</Text>
          </View>
        }
      />

      {trashFiles.length > 0 && (
        <TouchableOpacity style={styles.emptyBtn} onPress={handleEmptyTrash}>
          <Text style={styles.emptyBtnText}>ESVAZIAR LIXEIRA</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 5 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginVertical: 6, borderWidth: 1 },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  fileName: { fontSize: 14, fontFamily: 'Inter_400Regular', flexShrink: 1 },
  restoreBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  restoreText: { color: '#000', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyBtn: { margin: 20, backgroundColor: '#FF0033', padding: 18, borderRadius: 12, alignItems: 'center' },
  emptyBtnText: { color: '#FFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, letterSpacing: 1 }
});
