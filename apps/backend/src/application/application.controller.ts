import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { StatusWarningService } from '../status-warning/status-warning.service';
import { ApplicationListItemResponse } from '../swagger/application-list-item-response';
import { CreateApplicationRequest } from '../swagger/create-application-request';
import { FindApplicationsRequest } from '../swagger/find-applications-request';
import { StatusWarningCandidateResponse } from '../swagger/status-warning-candidate-response';
import { UpdateApplicationRequest } from '../swagger/update-application-request';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly statusWarningService: StatusWarningService,
  ) {}

  @ApiOperation({ summary: 'Список приложений по unitId' })
  @ApiOkResponse({ type: [ApplicationListItemResponse] })
  @Post()
  findAll(@Body() body: FindApplicationsRequest) {
    return this.applicationService.findAll({
      unitId: body.unitId ?? '',
    });
  }

  @ApiOperation({
    summary: 'Кандидаты модалки предупреждения deprecated/unactive',
    description:
      'CV с HAS_COMPONENT.status = deprecated в current приложения и CV со статусом unactive, на которые есть USES (FeatureVersion draft|active|deprecated) с applicationId = :id. Без дублей по componentVersionId.',
  })
  @ApiOkResponse({ type: [StatusWarningCandidateResponse] })
  @ApiResponse({ status: 404, description: 'Приложение не найдено' })
  @Get(':id/status-warning-candidates')
  statusWarningCandidates(@Param('id') id: string) {
    return this.statusWarningService.candidatesForApplication(id);
  }

  @ApiOperation({ summary: 'Создать приложение' })
  @Post('create')
  create(@Body() body: CreateApplicationRequest) {
    return this.applicationService.create(body);
  }

  @ApiOperation({ summary: 'Обновить приложение' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateApplicationRequest) {
    return this.applicationService.update(id, body);
  }

  @ApiOperation({ summary: 'Удалить приложение' })
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.applicationService.delete(id);
  }
}
