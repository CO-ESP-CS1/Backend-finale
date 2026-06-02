import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

function sanitizePublicId(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
  return `${base || 'livre'}_${randomUUID().slice(0, 8)}`;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private config: ConfigService) {}

  onModuleInit() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (cloudName) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
        api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
        secure: true,
      });
    }
  }

  async uploadPdf(buffer: Buffer, filename: string) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      throw new Error(
        'CLOUDINARY_CLOUD_NAME manquant — récupérez-le sur le dashboard Cloudinary',
      );
    }

    return new Promise<{
      url: string;
      publicId: string;
      secureUrl: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'bibliothec/livres',
          public_id: sanitizePublicId(filename),
          type: 'authenticated',
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload échoué'));
          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      stream.end(buffer);
    });
  }

  async uploadImage(buffer: Buffer, filename: string) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      throw new Error('CLOUDINARY_CLOUD_NAME manquant');
    }

    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'bibliothec/couvertures',
          public_id: sanitizePublicId(filename),
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload échoué'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }

  /** Preuve de paiement (image ou PDF), dossier dédié. */
  async uploadPreuve(buffer: Buffer, filename: string, mimeType: string) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      throw new Error('CLOUDINARY_CLOUD_NAME manquant');
    }

    const isPdf =
      mimeType === 'application/pdf' ||
      filename.toLowerCase().endsWith('.pdf');

    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: isPdf ? 'raw' : 'image',
          folder: 'bibliothec/preuves-paiement',
          public_id: sanitizePublicId(filename),
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload échoué'));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
      stream.end(buffer);
    });
  }

  /** URL signée pour lecture en ligne (dernière version de l’asset, sans v1 forcé). */
  urlLectureSignee(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      force_version: false,
    });
  }
}
