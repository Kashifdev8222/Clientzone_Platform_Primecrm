import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private readonly bucket = 'kyc-documents';

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      this.client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  isReady() {
    return Boolean(this.client);
  }

  async uploadKycFile(params: {
    tenantId: string;
    clientId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ storagePath: string; publicUrl: string | null }> {
    if (!this.client) {
      throw new Error('Supabase Storage not configured (SUPABASE_URL / SERVICE_ROLE_KEY)');
    }

    const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${params.tenantId}/${params.clientId}/${Date.now()}-${safeName}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storagePath, params.buffer, {
        contentType: params.mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      this.logger.error(`Storage upload failed: ${error.message}`);
      throw new Error(error.message);
    }

    // Private bucket → signed URL (7 days) for viewing
    const { data: signed, error: signErr } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signErr) {
      this.logger.warn(`Signed URL failed: ${signErr.message}`);
    }

    return {
      storagePath,
      publicUrl: signed?.signedUrl || null,
    };
  }

  async refreshSignedUrl(storagePath: string): Promise<string | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error) {
      this.logger.warn(`Signed URL failed: ${error.message}`);
      return null;
    }
    return data?.signedUrl || null;
  }
}
