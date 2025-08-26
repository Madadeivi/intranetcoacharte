import { customFetch } from '../config/api';
import { apiConfig, ApiResponse } from '../config/api';
import { customFetchBinary } from '../utils/customFetchBinary';

export interface ProfileDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  uploadDate: string;
  size?: string;
  description?: string;
  category?: string;
  tags?: string[];
  downloadUrl?: string;
  previewUrl?: string;
}

export interface ZohoAttachment {
  id: string;
  File_Name: string;
  Size: number;
  Created_Time: string;
  Modified_Time: string;
  Created_By?: {
    name: string;
    id: string;
  };
  $file_id?: string;
  $se_module?: string;
  $editable?: boolean;
  $type?: string;
  $size?: string;
}

export interface ProfileDocumentsResponse {
  success: boolean;
  message?: string;
  data?: {
    zoho_record_id: string;
    attachments: ZohoAttachment[];
    total: number;
  };
  error?: string;
}

export interface DocumentDownloadResponse {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

class ProfileDocumentsService {
  private cachedZohoRecordId: string | null = null;
  
  async getProfileDocuments(zohoRecordId?: string): Promise<ProfileDocument[]> {
    try {
      let recordId = zohoRecordId || this.cachedZohoRecordId;
      
      if (!recordId) {
        const profileResponse = await customFetch(
          apiConfig.endpoints.profile.get,
          { method: 'GET' }
        ) as ApiResponse<unknown>;

        if (!profileResponse.success || !profileResponse.data) {
          throw new Error('No se pudo obtener el perfil del usuario');
        }

        const profileData = profileResponse.data as any;
        recordId = profileData.profile?.zoho_record_id;
        
        if (recordId) {
          this.cachedZohoRecordId = recordId;
        }
      }

      if (!recordId) {
        console.warn('Usuario sin zoho_record_id, no hay documentos disponibles');
        return [];
      }

      const documentsResponse = await customFetch<ProfileDocumentsResponse>(
        `${apiConfig.endpoints.zoho.profileDocuments}/${recordId}`,
        { method: 'GET' }
      ) as ApiResponse<ProfileDocumentsResponse>;

      if (!documentsResponse.success || !documentsResponse.data) {
        return [];
      }

      const responseData = documentsResponse.data as any;
      const attachments = responseData.attachments || [];
      const mappedDocuments = attachments.map((attachment: ZohoAttachment): ProfileDocument => {
        return {
          id: attachment.id,
          name: attachment.File_Name,
          type: this.getDocumentType(attachment.File_Name),
          uploadDate: attachment.Created_Time,
          size: this.formatFileSize(attachment.Size),
          description: '',
          category: this.categorizeDocument(attachment.File_Name),
          downloadUrl: `${apiConfig.endpoints.zoho.downloadDocument}/${recordId}/${attachment.id}`
        };
      });

      return mappedDocuments;

    } catch (error) {
      console.error('Error obteniendo documentos del perfil:', error);
      throw new Error(error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  async downloadDocument(documentId: string, filename: string, zohoRecordId?: string): Promise<DocumentDownloadResponse> {
    try {
      let recordId = zohoRecordId || this.cachedZohoRecordId;
      
      if (!recordId) {
        const profileResponse = await customFetch(
          apiConfig.endpoints.profile.get,
          { method: 'GET' }
        ) as ApiResponse<unknown>;

        if (!profileResponse.success || !profileResponse.data) {
          throw new Error('No se pudo obtener el perfil del usuario');
        }

        const profileData = profileResponse.data as any;
        recordId = profileData.profile?.zoho_record_id;
        
        if (recordId) {
          this.cachedZohoRecordId = recordId;
        }
      }

      if (!recordId) {
        throw new Error('Usuario sin zoho_record_id asociado');
      }

      const downloadUrl = `${apiConfig.endpoints.zoho.downloadDocument}/${recordId}/${documentId}`;

      const response = await customFetchBinary(downloadUrl);

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      return {
        success: true,
        blob,
        filename: filename || `documento_${documentId}`
      };

    } catch (error) {
      console.error('Error descargando documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async downloadAndSaveDocument(documentId: string, filename: string, zohoRecordId?: string): Promise<boolean> {
    try {
      const downloadResponse = await this.downloadDocument(documentId, filename, zohoRecordId);
      
      if (!downloadResponse.success || !downloadResponse.blob) {
        throw new Error(downloadResponse.error || 'Error al descargar el documento');
      }

      const url = window.URL.createObjectURL(downloadResponse.blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadResponse.filename || filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      return true;

    } catch (error) {
      console.error('Error al descargar y guardar documento:', error);
      return false;
    }
  }

  private getDocumentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, string> = {
      'pdf': 'PDF',
      'doc': 'Word',
      'docx': 'Word', 
      'xls': 'Excel',
      'xlsx': 'Excel',
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint',
      'jpg': 'Imagen',
      'jpeg': 'Imagen',
      'png': 'Imagen',
      'gif': 'Imagen',
      'txt': 'Texto',
      'zip': 'Archivo',
      'rar': 'Archivo'
    };

    return typeMap[extension || ''] || 'Documento';
  }

  private categorizeDocument(filename: string): string {
    const nameInLower = filename.toLowerCase();
    
    if (nameInLower.includes('contrato') || nameInLower.includes('contract')) {
      return 'Contrato';
    }
    if (nameInLower.includes('cv') || nameInLower.includes('curriculum') || nameInLower.includes('resume')) {
      return 'CV';
    }
    if (nameInLower.includes('certificacion') || nameInLower.includes('certificado') || nameInLower.includes('certificate')) {
      return 'Certificación';
    }
    if (nameInLower.includes('evaluacion') || nameInLower.includes('evaluation') || nameInLower.includes('performance')) {
      return 'Evaluación';
    }
    if (nameInLower.includes('referencia') || nameInLower.includes('reference')) {
      return 'Referencia';
    }
    if (nameInLower.includes('foto') || nameInLower.includes('photo') || nameInLower.includes('picture')) {
      return 'Foto';
    }
    if (nameInLower.includes('identificacion') || nameInLower.includes('id') || nameInLower.includes('cedula') || nameInLower.includes('pasaporte')) {
      return 'Identificación';
    }
    
    return 'Documento';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getDocumentIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Contrato': '📋',
      'CV': '👤',
      'Certificación': '🏆',
      'Evaluación': '📊',
      'Referencia': '💌',
      'Foto': '📷',
      'Identificación': '🆔',
      'PDF': '📄',
      'Word': '📝',
      'Excel': '📊',
      'PowerPoint': '📊',
      'Imagen': '🖼️',
      'Texto': '📃',
      'Archivo': '📦'
    };
    
    return iconMap[type] || iconMap['Documento'] || '📄';
  }

  canPreview(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
    return previewableTypes.includes(extension || '');
  }

  clearCache(): void {
    this.cachedZohoRecordId = null;
  }
}

export const profileDocumentsService = new ProfileDocumentsService();
export default profileDocumentsService;
