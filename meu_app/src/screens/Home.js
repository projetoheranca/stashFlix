import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { getAlbums, createAlbum } from '../services/VaultService';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';

export default function Home({ route, navigation }) {
  const isDecoy = route.params?.isDecoy || false;
  const [hasPermission, setHasPermission] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    checkPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlbums();
    }, [isDecoy])
  );

  const checkPermissions = async () => {
    const { status } = await MediaLibrary.getPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status !== 'granted') Alert.alert('Permissão Necessária', 'Precisamos de acesso para importar.');
  };

  const loadAlbums = async () => {
    const fetchedAlbums = await getAlbums(isDecoy);
    for (let album of fetchedAlbums) {
      const lockKey = `pwd_${isDecoy}_${album.name}`;
      const hasLock = await SecureStore.getItemAsync(lockKey);
      album.isLocked = !!hasLock;
    }
    setAlbums(fetchedAlbums);
  };

  const handleCreateAlbum = async () => {
    if (newAlbumName.trim() === '') return;
    await createAlbum(newAlbumName.trim(), isDecoy);
    setNewAlbumName('');
    loadAlbums();
  };

  const openAlbum = (album) => {
    if (album.isLocked) {
      navigation.navigate('AlbumPassword', { albumName: album.name, isDecoy, action: 'unlock' });
    } else {
      navigation.navigate('AlbumView', { albumName: album.name, isDecoy });
    }
  };

  const handleLongPress = (album) => {
    Alert.alert(
      `Gerenciar Álbum: ${album.name}`,
      'Opções Avançadas',
      [
        { text: album.isLocked ? 'Remover Senha' : 'Trancar com Senha', onPress: () => {
            navigation.navigate('AlbumPassword', { albumName: album.name, isDecoy, action: album.isLocked ? 'remove' : 'set' });
        }},
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
      <TouchableOpacity 
        style={[styles.albumItem, { backgroundColor: theme.surface, borderColor: theme.border }]} 
        onPress={() => openAlbum(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        <Text style={[styles.albumName, { color: theme.text }]}>
          {item.isLocked ? '🔒 ' : '📁 '} {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>{isDecoy ? 'Cofre Falso' : 'Meus Álbuns'}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: theme.text }]}>Sincronize com o celular para ocultar mídias.</Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme.primary }]} onPress={requestPermissions}>
            <Text style={styles.permissionButtonText}>Conceder Permissão</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.createAlbumContainer}>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
              placeholder="Criar nova pasta..."
              placeholderTextColor={theme.isDark ? '#888' : '#AAA'}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
            />
            <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.primary }]} onPress={handleCreateAlbum}>
              <Text style={styles.createButtonText}>Criar</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList 
            data={albums}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={{ color: theme.text, opacity: 0.6, fontSize: 16 }}>Nenhuma pasta segura ainda.</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  header: { fontSize: 28, fontWeight: 'bold' },
  settingsBtn: { padding: 5 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  permissionText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permissionButton: { padding: 15, borderRadius: 10 },
  permissionButtonText: { color: '#FFF', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  list: { paddingHorizontal: 15 },
  albumItem: { padding: 25, borderRadius: 10, marginVertical: 8, borderWidth: 1 },
  albumName: { fontSize: 20, fontWeight: '600' },
  createAlbumContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15 },
  input: { flex: 1, padding: 15, borderRadius: 8, marginRight: 10, fontSize: 16 },
  createButton: { paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center' },
  createButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
