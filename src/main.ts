import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomValidationPipe } from './custom-validation.pipe';
import { useContainer } from './class-validator-nest-async';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await useContainer(app);
  app.useGlobalPipes(
    new CustomValidationPipe({
      transform: true,
    }),
  );
  await app.listen(3000);
}
bootstrap();
