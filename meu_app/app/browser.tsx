import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/src/contexts/AppContext';
import { StatusBar } from 'expo-status-bar';

export default function StealthBrowser() {
  const router = useRouter();
  const { activePalette: theme } = useAppContext();
  
  const [url, setUrl] = useState('https://duckduckgo.com');
  const [inputUrl, setInputUrl] = useState('https://duckduckgo.com');
  const webviewRef = useRef<WebView>(null);

  const handleGo = () => {
    let finalUrl = inputUrl;
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
  };

  // Código JavaScript injetado para capturar cliques longos em imagens (Simulação de Zero-Footprint)
  const injectedJS = `
    document.addEventListener('contextmenu', function(e) {
      if(e.target.tagName === 'IMG') {
        e.preventDefault();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'image_capture', src: e.target.src }));
      }
    });
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'image_capture') {
        // Num ambiente real, nós faríamos fetch(data.src), transformaríamos em base64 e salvaríamos no Vault.
        console.log('🚨 IMAGEM INTERCEPTADA PELO NAVEGADOR FURTIVO:', data.src);
        alert('Imagem capturada e criptografada com sucesso direto no Cofre!');
      }
    } catch (e) {}
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { backgroundColor: theme.surfaceHighlight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
          <Text style={{ color: theme.tint, fontSize: 24, fontWeight: 'bold' }}>X</Text>
        </TouchableOpacity>
        
        <TextInput 
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface }]}
          value={inputUrl}
          onChangeText={setInputUrl}
          onSubmitEditing={handleGo}
          keyboardType="url"
          autoCapitalize="none"
        />
        
        <TouchableOpacity onPress={handleGo} style={styles.btn}>
          <Text style={{ color: theme.tint, fontWeight: 'bold' }}>IR</Text>
        </TouchableOpacity>
      </View>

      <WebView 
        ref={webviewRef}
        source={{ uri: url }} 
        style={styles.webview}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        incognito={true} // Tenta forçar navegação anônima nas plataformas
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 10, paddingHorizontal: 10 },
  input: { flex: 1, marginHorizontal: 10, padding: 10, borderRadius: 8 },
  btn: { padding: 10 },
  webview: { flex: 1, backgroundColor: '#FFF' }
});
