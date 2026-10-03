import * as ImagePicker from 'expo-image-picker';

/** Opens the system photo picker with a square crop. Resolves null if cancelled. */
export async function pickSquareImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}
