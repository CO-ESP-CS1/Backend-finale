import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool, type PoolConfig } from 'pg';

/** Retire sslmode de l'URL pour éviter que pg force verify-full (Supabase pooler). */
function poolConfigFromDatabaseUrl(connectionString: string): PoolConfig {
  const isSupabase = connectionString.includes('supabase.com');

  let cleaned = connectionString;
  try {
    const normalized = connectionString.replace(/^postgresql:/, 'postgres:');
    const url = new URL(normalized);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('uselibpqcompat');
    cleaned = url.toString().replace(/^postgres:/, 'postgresql:');
  } catch {
    cleaned = connectionString
      .replace(/([?&])sslmode=[^&]*/g, '$1')
      .replace(/([?&])uselibpqcompat=[^&]*/g, '$1')
      .replace(/[?&]$/, '');
  }

  if (!isSupabase) {
    return { connectionString: cleaned, max: 10 };
  }

  return {
    connectionString: cleaned,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    const pool = new Pool(poolConfigFromDatabaseUrl(connectionString));
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
