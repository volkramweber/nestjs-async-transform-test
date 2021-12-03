import {
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { asyncPlainToClass } from './class-validator-nest-async';

@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  async transform(value, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('No data submitted');
    }

    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    //const object = plainToClass(metatype, value);
    const object = await asyncPlainToClass(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: 'Input data validation failed',
          errors: this.buildError(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private buildError(errors) {
    const result = {};
    errors.forEach((el) => {
      const prop = el.property;
      result[prop] = Object.entries(el.constraints).map(
        (constraint) => constraint[0],
      );
    });
    return result;
  }

  toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.find((type) => metatype === type);
  }
}
