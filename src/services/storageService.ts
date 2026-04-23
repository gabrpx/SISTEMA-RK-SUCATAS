// src/services/storageService.ts

// Serviço de armazenamento para Google Cloud Storage (opcional)
// Se não estiver configurado, apenas retorna URLs vazias

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
    console.log(`⚠️ Upload para storage não configurado. Arquivo: ${filename}`);
    return { publicUrl: '' };
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