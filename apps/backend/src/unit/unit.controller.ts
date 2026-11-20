import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { UnitService } from './unit.service';
import { CreateUnitRequest } from '../swagger/create-unit-request';
import { UpdateUnitRequest } from '../swagger/update-unit-request';

@ApiTags('Units')
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @ApiOperation({ summary: 'Создать юнит' })
  @Post()
  create(@Body() body: CreateUnitRequest) {
    return this.unitService.create(body);
  }

  @ApiOperation({ summary: 'Список юнитов' })
  @Get()
  findAll() {
    return this.unitService.findAll();
  }

  @ApiOperation({ summary: 'Обновить юнит' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUnitRequest) {
    return this.unitService.update(id, body);
  }

  @ApiOperation({ summary: 'Удалить юнит' })
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.unitService.delete(id);
  }
}
