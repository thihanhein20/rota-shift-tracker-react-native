import * as SecureStore from "expo-secure-store";

const GEMINI_API_KEY_STORAGE_KEY = "gemini-api-key";

export async function getGeminiApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
}

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, apiKey.trim());
}

export async function deleteGeminiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
}
