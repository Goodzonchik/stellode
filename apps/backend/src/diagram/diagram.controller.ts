import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ArchitectureGraphResponse } from '../swagger/architecture-graph-response';
import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { DiagramService } from './diagram.service';

@ApiTags('Diagrams')
@Controller('diagrams')
export class DiagramController {
  constructor(private readonly diagramService: DiagramService) {}

  @ApiOperation({ summary: 'Диаграмма связей между двумя юнитами' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('cross-unit/bridge/:unitIdA/:unitIdB')
  async getCrossUnitBridge(
    @Param('unitIdA') unitIdA: string,
    @Param('unitIdB') unitIdB: string,
  ) {
    return this.diagramService.getCrossUnitBridgeDiagram(unitIdA, unitIdB);
  }

  @ApiOperation({ summary: 'Cross-unit диаграмма вокруг centerUnitId' })
  @ApiQuery({ name: 'centerUnitId', required: true, description: 'UUID центрального юнита' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('cross-unit')
  async getCrossUnitDiagram(@Query('centerUnitId') centerUnitId: string | undefined) {
    const trimmed = centerUnitId?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException('centerUnitId query parameter is required');
    }
    return this.diagramService.getCrossUnitDiagram(trimmed);
  }

  @ApiOperation({ summary: 'Диаграмма юнита' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('unit/:id')
  async getUnitDiagram(@Param('id') id: string) {
    return this.diagramService.getUnitDiagram(id);
  }

  @ApiOperation({ summary: 'Диаграмма команды' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('team/:id')
  async getTeamDiagram(@Param('id') id: string) {
    return this.diagramService.getTeamDiagram(id);
  }

  @ApiOperation({ summary: 'Диаграмма версии фичи' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('feature-version/:id')
  async getFeatureVersionDiagram(@Param('id') id: string) {
    return this.diagramService.getFeatureVersionDiagram(id);
  }

  @ApiOperation({ summary: 'Диаграмма сервиса с интеграциями по DEPENDS_ON' })
  @ApiQuery({ name: 'projection', required: false, enum: ['on-prod', 'draft'], description: 'draft — включает историю снятых AGGREGATES; по умолчанию on-prod' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('service/:id/integrations')
  async getServiceIntegrationsDiagram(
    @Param('id') id: string,
    @Query('projection') projection?: string,
  ) {
    const mode = projection === 'draft' ? 'draft' : 'on-prod';
    return this.diagramService.getServiceIntegrationsDiagram(id, mode);
  }

  @ApiOperation({ summary: 'Диаграмма сервиса (состав AGGREGATES)' })
  @ApiQuery({ name: 'projection', required: false, enum: ['on-prod', 'draft'], description: 'draft — включает историю снятых AGGREGATES; по умолчанию on-prod' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('service/:id')
  async getServiceDiagram(@Param('id') id: string, @Query('projection') projection?: string) {
    const mode = projection === 'draft' ? 'draft' : 'on-prod';
    return this.diagramService.getServiceDiagram(id, mode);
  }

  @ApiOperation({ summary: 'Диаграмма компонента' })
  @ApiOkResponse({ type: ArchitectureGraphResponse, description: 'ArchitectureGraph; если сущность не найдена — объект { message }' })
  @Get('component/:id')
  async getComponentDiagram(@Param('id') id: string) {
    return this.diagramService.getComponentDiagram(id);
  }
}
