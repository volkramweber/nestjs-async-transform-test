import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateDto } from './create.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  async create(@Body() createDto: CreateDto): Promise<any> {
    return new Promise((resolve) => {
      resolve(createDto);
    });
  }
}
