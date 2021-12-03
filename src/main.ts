import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomValidationPipe } from './custom-validation.pipe';
import { useContainer } from './class-validator-nest-async';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new CustomValidationPipe({
      transform: true,
    }),
  );
  await useContainer(app);
  await app.listen(3000);
}
bootstrap();
