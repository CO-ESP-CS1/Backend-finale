import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MediaUrlInterceptor } from './common/media-url.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalInterceptors(new MediaUrlInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`Bibliothec API : http://localhost:${port}/api`);
  console.log(`  (réseau local : http://<IP-du-PC>:${port}/api)`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ Démarrage impossible:', message);
  if (err instanceof Error && err.stack) {
    console.error(err.stack.split('\n').slice(0, 8).join('\n'));
  }
  process.exit(1);
});
