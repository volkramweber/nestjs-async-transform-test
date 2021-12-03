import { Equals, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Logger } from '@nestjs/common';
import { AsyncTransform } from './class-validator-nest-async';

const logger = new Logger('DTO');

export class CreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value, obj, key }): number => {
    const newValue = value * 2;
    logger.debug(`new value: ${newValue}`);
    obj[key] = newValue;
    return newValue;
  })
  @Equals(6)
  age: number;

  @IsNotEmpty()
  @IsNumber()
  @AsyncTransform(async ({ value, obj, key }): Promise<number> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        obj[key] = value * 2;
        resolve(value * 2);
      }, 500);
    });
  })
  size: number;
}
