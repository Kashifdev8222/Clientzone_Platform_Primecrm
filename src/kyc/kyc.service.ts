import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import { AdminKycReviewDto } from './dto/kyc.dto';

const ALLOWED_EXT = /\.(jpe?g|png|pdf|jfif)$/i;
const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/pjpeg',
  'application/pdf',
];

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    user: JwtPayload,
    file: Express.Multer.File | undefined,
    documentRaw: string | undefined,
  ) {
    if (!file) {
      throw new BadRequestException({
        status: 'error',
        message: 'File upload failed (no file).',
      });
    }

    let document: { documentType?: string; description?: string } = {};
    if (documentRaw) {
      try {
        document = JSON.parse(documentRaw);
      } catch {
        throw new BadRequestException({
          status: 'error',
          message: 'Invalid document JSON.',
        });
      }
    }

    const documentType = String(document.documentType || 'General').trim();
    if (!documentType) {
      throw new BadRequestException({
        status: 'error',
        message: 'documentType is required',
      });
    }

    let fileName = file.originalname || 'upload';
    if (/\.(jfif|jpe)$/i.test(fileName)) {
      fileName = fileName.replace(/\.(jfif|jpe)$/i, '.jpg');
    }
    if (!ALLOWED_EXT.test(fileName)) {
      throw new BadRequestException({
        status: 'error',
        message: 'Only jpeg, jpg, png, pdf allowed',
      });
    }

    const mime = file.mimetype || 'application/octet-stream';
    if (
      mime &&
      !ALLOWED_MIME.some((m) => mime.toLowerCase().includes(m.split('/')[1])) &&
      !mime.includes('pdf') &&
      !mime.includes('jpeg') &&
      !mime.includes('png') &&
      !mime.includes('octet-stream')
    ) {
      // soft check — extension already validated
    }

    if (!this.storage.isReady()) {
      throw new BadRequestException({
        status: 'error',
        message:
          'File storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and create bucket kyc-documents.',
      });
    }

    let uploaded: { storagePath: string; publicUrl: string | null };
    try {
      uploaded = await this.storage.uploadKycFile({
        tenantId: user.tenantId,
        clientId: user.sub,
        fileName,
        mimeType: mime,
        buffer: file.buffer,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new BadRequestException({
        status: 'error',
        message: msg.includes('Bucket')
          ? 'Storage bucket missing. Create private bucket "kyc-documents" in Supabase Storage.'
          : msg,
      });
    }

    const row = await this.prisma.kycDocument.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        documentType,
        description: document.description || null,
        fileName,
        mimeType: mime,
        fileSize: file.size,
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        status: 'PENDING',
      },
    });

    return {
      status: 'success',
      data: this.mapDoc(row),
    };
  }

  async listForClient(user: JwtPayload) {
    const rows = await this.prisma.kycDocument.findMany({
      where: { tenantId: user.tenantId, clientId: user.sub },
      orderBy: { createdAt: 'desc' },
    });

    const data = [];
    for (const row of rows) {
      data.push(await this.mapDocWithFreshUrl(row));
    }
    return { status: 'success', data };
  }

  async adminList(user: JwtPayload, status?: string) {
    const rows = await this.prisma.kycDocument.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    const data = [];
    for (const row of rows) {
      data.push({
        ...(await this.mapDocWithFreshUrl(row)),
        client: row.client,
      });
    }
    return { status: 'success', data };
  }

  async adminReview(user: JwtPayload, id: string, dto: AdminKycReviewDto) {
    const row = await this.prisma.kycDocument.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        status: 'error',
        message: 'Document not found',
      });
    }

    const updated = await this.prisma.kycDocument.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote || null,
        reviewedBy: user.sub,
        reviewedAt: new Date(),
      },
    });

    return { status: 'success', data: this.mapDoc(updated) };
  }

  private mapDoc(row: {
    id: string;
    documentType: string;
    description: string | null;
    fileName: string;
    mimeType: string | null;
    fileSize: number | null;
    publicUrl: string | null;
    status: string;
    reviewNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      documentType: row.documentType,
      description: row.description,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      url: row.publicUrl,
      publicUrl: row.publicUrl,
      status: row.status,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async mapDocWithFreshUrl(row: {
    id: string;
    documentType: string;
    description: string | null;
    fileName: string;
    mimeType: string | null;
    fileSize: number | null;
    storagePath: string;
    publicUrl: string | null;
    status: string;
    reviewNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const url =
      (await this.storage.refreshSignedUrl(row.storagePath)) || row.publicUrl;
    return this.mapDoc({ ...row, publicUrl: url });
  }
}
