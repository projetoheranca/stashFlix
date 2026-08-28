import re

path = "d:\\bkp\\STASHLYFLIX\\meu_app\\app\\album\\[id].tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix openImagePicker
open_img_regex = r"const openImagePicker = async \(\) => \{.*?setTimeout\(\(\) => \{.*?\};\n\s*\}\n"
open_img_new = """
  const openImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    (global as any).ignoreNextBackground = true;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);

    if (!result.canceled && result.assets) {
      setUploading(true);
      const total = result.assets.length;
      let successIds: string[] = [];
      let failCount = 0;

      for (let i = 0; i < total; i++) {
        setUploadProgress(Math.round((i / total) * 100));
        const asset = result.assets[i];
        try {
          await importToAlbum(asset.uri, albumName, isDecoy, asset.fileName || null);
          if (asset.assetId) successIds.push(asset.assetId);
        } catch (e) {
          console.warn("Falha ao importar:", e);
          failCount++;
        }
      }
      
      setUploadProgress(100);
      loadFiles();
      setUploading(false); 
      setUploadProgress(0); 

      if (failCount > 0) {
        Alert.alert("Aviso", `${failCount} arquivo(s) não puderam ser importados.`);
      }

      if (successIds.length > 0) {
        Alert.alert(
          "Cópia de Segurança Concluída",
          "Deseja excluir a cópia original da galeria?",
          [
            { text: "Manter no aparelho", style: "cancel" },
            {
              text: "Excluir original",
              style: "destructive",
              onPress: async () => {
                try {
                  await MediaLibrary.deleteAssetsAsync(successIds);
                  Alert.alert("Sucesso", "Original(is) excluído(s) da galeria.");
                } catch (e) {
                  Alert.alert("Aviso", "Não foi possível excluir automaticamente.");
                }
              }
            }
          ]
        );
      }
    }
  };
"""
content = re.sub(open_img_regex, open_img_new.strip() + "\n", content, flags=re.DOTALL)

# Fix openDocumentPicker
open_doc_regex = r"const openDocumentPicker = async \(\) => \{.*?setTimeout\(\(\) => \{.*?\};\n\s*\}\n"
open_doc_new = """
  const openDocumentPicker = async () => {
    try {
      (global as any).ignoreNextBackground = true;
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true
      });
      setTimeout(() => { (global as any).ignoreNextBackground = false; }, 1000);

      if (!result.canceled && result.assets) {
        setUploading(true);
        const total = result.assets.length;
        let failCount = 0;
        for (let i = 0; i < total; i++) {
          setUploadProgress(Math.round((i / total) * 100));
          const asset = result.assets[i];
          try {
            await importToAlbum(asset.uri, albumName, isDecoy, asset.name || null);
          } catch (e) {
            failCount++;
          }
        }
        setUploadProgress(100);
        loadFiles();
        setUploading(false);
        setUploadProgress(0);
        
        if (failCount > 0) {
          Alert.alert("Aviso", `${failCount} documento(s) falharam ao importar.`);
        } else {
          Alert.alert("Sucesso", "Documentos importados com sucesso.");
        }
      }
    } catch (err) {
      setUploading(false);
    }
  };
"""
content = re.sub(open_doc_regex, open_doc_new.strip() + "\n", content, flags=re.DOTALL)

# Share button fix:
# PDF says: "Compartilhar arquivo: Pedir confirmação e não deixar cópia aberta na galeria sem aviso."
# Or "Se ainda não funciona, ocultar ou desabilitar o botão."
# The share function already uses expo-sharing, let's add a prompt.
share_regex = r"const handleShareFile = async \(\) => \{.*?\}\s*\} else \{\s*Alert\.alert\(\"Aviso\"\,\s*\"O arquivo ainda não foi carregado\.\"\);\s*\}\s*\};"
share_new = """
  const handleShareFile = async () => {
    if (zoomImgUri) {
      Alert.alert(
        "Compartilhar Arquivo",
        "Atenção: Ao compartilhar, o arquivo será descriptografado temporariamente. Certifique-se de que está enviando para um local seguro.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Compartilhar",
            onPress: async () => {
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(zoomImgUri);
              } else {
                Alert.alert("Erro", "Compartilhamento não disponível.");
              }
            }
          }
        ]
      );
    } else {
      Alert.alert("Aviso", "O arquivo ainda não foi carregado.");
    }
  };
"""
content = re.sub(share_regex, share_new.strip(), content, flags=re.DOTALL)

# Remover senha do arquivo
# "Ao remover a senha de um arquivo protegido, pedir a senha atual do arquivo."
# Where is file password removed?
# Currently there is handleSetFilePassword and handleRemoveFilePassword.
# Need to check `handleUnlockFileForView` vs `handleRemoveFilePassword`.
# Let's search for `handleRemoveFilePassword` first, or we can just replace the whole file pwd block.
remove_pwd_regex = r"const handleRemoveFilePassword = async \(\) => \{.*?\}\s*\}\s*\]\s*\);\s*\};"
remove_pwd_new = """
  const handleRemoveFilePassword = async () => {
    if (!zoomFile) return;
    
    // Abrir modal de validação primeiro, mas com uma flag dizendo que é para REMOVER
    // Vamos reaproveitar o PwdModal, mas precisaremos de uma lógica para remover
    setPwdTargetFile({ ...zoomFile, action: 'remove' });
    setPwdInput('');
    setPwdModalVisible(true);
  };
  
  const processRemoveFilePassword = async (file: any) => {
    await SecureStore.setItemAsync(`file_pwd_enabled_${file.name}`, 'false');
    await SecureStore.removeItemAsync(`file_pwd_${file.name}`);
    setIsZoomFileEncrypted(false);
    Alert.alert("Sucesso", "Proteção individual removida.");
  };
"""
# We also need to update the PwdModal logic to handle 'remove' action!
handle_auth_file_pwd = r"const handleAuthFilePwd = async \(\) => \{.*?if \(pwdInput === storedPwd\) \{.*?setPwdModalVisible\(false\);\s*loadZoomFile\(pwdTargetFile, pwdInput\);\s*\} else \{.*?\}\s*\};"
handle_auth_file_pwd_new = """
  const handleAuthFilePwd = async () => {
    if (!pwdTargetFile) return;
    const storedPwd = await SecureStore.getItemAsync(`file_pwd_${pwdTargetFile.name}`);
    if (pwdInput === storedPwd) {
      setPwdModalVisible(false);
      if (pwdTargetFile.action === 'remove') {
        await processRemoveFilePassword(pwdTargetFile);
      } else {
        loadZoomFile(pwdTargetFile, pwdInput);
      }
    } else {
      Alert.alert("Erro", "Senha incorreta.");
      setPwdInput('');
    }
  };
"""
if "handleAuthFilePwd" in content:
    content = re.sub(handle_auth_file_pwd, handle_auth_file_pwd_new.strip(), content, flags=re.DOTALL)

if "const handleRemoveFilePassword = async () => {" in content:
    content = re.sub(remove_pwd_regex, remove_pwd_new.strip(), content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
