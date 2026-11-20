import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Controller, Post, Put, Param, Body } from '@nestjs/common';
import { ServiceService } from './service.service';
import { AddServiceAggregateRequest } from '../swagger/add-service-aggregate-request';
import { CreateServiceRequest } from '../swagger/create-service-request';
import { FindServicesRequest } from '../swagger/find-services-request';
import { RemoveServiceAggregateRequest } from '../swagger/remove-service-aggregate-request';
import { UpdateServiceRequest } from '../swagger/update-service-request';

@ApiTags('Services')
@Controller('services')
export class ServiceController {
  constructor(private readonly teamService: ServiceService) {}

  @ApiOperation({ summary: 'Список сервисов по unitId' })
  @Post()
  findAll(@Body() body: FindServicesRequest) {
    return this.teamService.findAll({
      unitId: body.unitId ?? '',
    });
  }

  @ApiOperation({ summary: 'Создать сервис' })
  @Post('create')
  create(@Body() body: CreateServiceRequest) {
    return this.teamService.create(body);
  }

  @ApiOperation({
    summary: 'Снять фичу с состава сервиса (soft-delete ребра AGGREGATES)',
    description:
      'Ставит `deleted: true` на активном ребре; опциональная `deletedReason` (trim) сохраняется как `deleted_reason`.',
  })
  @ApiBadRequestResponse({ description: 'Разные юниты у сервиса и фичи' })
  @ApiNotFoundResponse({ description: 'Сервис, фича или активное ребро не найдены' })
  @ApiConflictResponse({ description: 'Сервис в архиве' })
  @Post(':id/aggregates/remove')
  removeAggregate(@Param('id') id: string, @Body() body: RemoveServiceAggregateRequest) {
    return this.teamService.removeFeatureAggregate(id, body.featureId, body.deletedReason);
  }

  @ApiOperation({
    summary: 'Добавить фичу в состав сервиса (AGGREGATES)',
    description: 'Создаёт новое ребро `AGGREGATES`, если активного ещё нет.',
  })
  @ApiBadRequestResponse({ description: 'Разные юниты у сервиса и фичи' })
  @ApiNotFoundResponse({ description: 'Сервис или фича не найдены' })
  @ApiConflictResponse({ description: 'Фича уже в активном составе или сервис в архиве' })
  @Post(':id/aggregates')
  addAggregate(@Param('id') id: string, @Body() body: AddServiceAggregateRequest) {
    return this.teamService.addFeatureAggregate(id, body.featureId);
  }

  @ApiOperation({
    summary: 'Архивировать сервис',
    description: '`status → archive`, нода сохраняется. Повторный вызов идемпотентен.',
  })
  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.teamService.archive(id);
  }

  @ApiOperation({
    summary: 'Вернуть сервис из архива',
    description: '`status → active`. Если сервис уже активен — без ошибки.',
  })
  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.teamService.unarchive(id);
  }

  @ApiOperation({ summary: 'Обновить сервис' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateServiceRequest) {
    return this.teamService.update(id, body);
  }
}
