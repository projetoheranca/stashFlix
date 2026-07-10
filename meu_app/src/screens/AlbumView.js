import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { importToAlbum, getAlbumFiles, exportFromVault } from '../services/VaultService';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export default function AlbumView({ route, navigation }) {
  const { albumName, isDecoy } = route.params;
  const [vaultFiles, setVaultFiles] = useState([]);
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadVault();
    }, [albumName])
  );

  const loadVault = async () => {
    const files = await getAlbumFiles(albumName, isDecoy);
    setVaultFiles(files);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        await importToAlbum(sourceUri, albumName, isDecoy);
        Alert.alert('Sucesso', 'Mídia ofuscada e movida para a pasta com segurança.');
        loadVault();
      } catch (e) {
        Alert.alert('Erro', 'Falha ao processar a importação.');
      }
    }
  };

  const handleFilePress = (item) => {
    Alert.alert(
      'Gerenciar Arquivo',
      'O que deseja fazer com esta mídia segura?',
      [
        { text: 'Visualizar', onPress: () => Alert.alert('Aviso', 'O Visualizador nativo estará na Fase 6.') },
        { text: 'Deletar', onPress: async () => {
            await exportFromVault(item.uri);
            loadVault();
        }, style: 'destructive' },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(400)}
      style={[styles.mediaItem, { backgroundColor: theme.surface }]}
    >
      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleFilePress(item)}>
        <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      </TouchableOpacity>
    </Animated.View>
  );

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  const FAB = () => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const onPressIn = () => { scale.value = withSpring(0.9); };
    const onPressOut = () => { scale.value = withSpring(1); };

    return (
      <AnimatedTouchable 
        style={[styles.fab, { backgroundColor: theme.primary }, animatedStyle]} 
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </AnimatedTouchable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: theme.primary }]}>{"< Voltar"}</Text>
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.text }]}>{albumName}</Text>
      </View>

      {vaultFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.text }]}>Nenhuma mídia segura ainda neste álbum.</Text>
        </View>
      ) : (
        <FlatList 
          data={vaultFiles}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          contentContainerStyle={styles.gridList}
        />
      )}

      <FAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 20 },
  backButtonText: { fontSize: 18, fontWeight: 'bold' },
  header: { fontSize: 24, fontWeight: 'bold' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { opacity: 0.6, fontSize: 16 },
  gridList: { paddingHorizontal: 10 },
  mediaItem: { flex: 1/3, margin: 5, aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  fab: {
    position: 'absolute', bottom: 30, right: 30,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 5
  },
  fabText: { color: '#FFF', fontSize: 32, lineHeight: 34 }
});
