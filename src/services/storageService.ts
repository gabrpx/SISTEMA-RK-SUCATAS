// src/services/storageService.ts
import { supabase } from './supabaseClient.js';
import fs from 'fs';

interface UploadResult {
  publicUrl: string;
}

interface UploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
}

const storageService = {
  /**
   * Faz upload de um arquivo para o storage
   */
  uploadFile: async (filePath: string, filename: string, mimeType: string): Promise<UploadResult> => {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const { data, error } = await supabase.storage
        .from('motos')
        .upload(`images/${filename}`, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('motos')
        .getPublicUrl(data.path);

      return { publicUrl };
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return { publicUrl: '' };
    }
  },

  /**
   * Gera URL assinada para upload
   */
  generateUploadUrl: async (filename: string, fileType: string): Promise<UploadUrlResult> => {
    console.log(`⚠️ Geração de URL não configurada. Arquivo: ${filename}`);
    return { uploadUrl: '', publicUrl: '' };
  },

  /**
   * Deleta um arquivo do storage
   */
  deleteFile: async (filename: string): Promise<void> => {
    console.log(`⚠️ Deleção de arquivo não configurada. Arquivo: ${filename}`);
  }
};

export default storageService;