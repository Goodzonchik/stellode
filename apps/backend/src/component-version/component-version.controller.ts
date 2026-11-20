import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ComponentVersionService } from './component-version.service';
import { StatusWarningService } from '../status-warning/status-warning.service';
import { ComponentVersionsForUnitRequest } from '../swagger/component-versions-for-unit-request';
import { CreateComponentVersionRequest } from '../swagger/create-component-version-request';
import { ListComponentVersionsRequest } from '../swagger/list-component-versions-request';

@ApiTags('Component versions')
@Controller('component-versions')
export class ComponentVersionController {
  constructor(
    private readonly componentVersionService: ComponentVersionService,
    private readonly statusWarningService: StatusWarningService,
  ) {}

  @ApiOperation({ summary: 'Детали модалки предупреждения deprecated/unactive' })
  @Get(':id/status-warning')
  statusWarning(@Param('id') id: string) {
    return this.statusWarningService.statusWarningForComponentVersion(id);
  }

  @ApiOperation({ summary: 'Список версий компонента по componentElementId' })
  @Post()
  listByComponent(@Body() body: ListComponentVersionsRequest) {
    return this.componentVersionService.getByComponentElementId(body.componentElementId);
  }

  @ApiOperation({ summary: 'Каталог версий компонентов юнита' })
  @Post('for-unit')
  forUnit(@Body() body: ComponentVersionsForUnitRequest) {
    return this.componentVersionService.forUnit(body.unitId);
  }

  @ApiOperation({ summary: 'Создать версию компонента (draft)' })
  @Post('create')
  create(@Body() body: CreateComponentVersionRequest) {
    return this.componentVersionService.create(body);
  }
}
