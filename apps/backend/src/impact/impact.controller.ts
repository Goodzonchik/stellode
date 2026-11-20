import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ImpactAnalysisResponse } from '../swagger/impact-analysis-response';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ImpactService, type ImpactQueryMode } from './impact.service';
import { ImpactQueryMode as ImpactQueryModeConst } from '@stellode/models';

const parseImpactMode = (raw: string | undefined): ImpactQueryMode =>
  raw === ImpactQueryModeConst.Draft ? ImpactQueryModeConst.Draft : ImpactQueryModeConst.OnProd;

const modeQuery = ApiQuery({
  name: 'mode',
  required: false,
  enum: ['on-prod', 'draft'],
  description: 'Режим расчёта; по умолчанию on-prod',
});

@ApiTags('Impact')
@Controller('impact')
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @ApiOperation({ summary: 'Impact для компонента' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('component/:id')
  component(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.component(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для версии компонента' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('component-version/:id')
  componentVersion(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.componentVersion(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для юнита' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('unit/:id')
  unit(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.unit(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для команды' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('team/:id')
  team(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.team(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для сервиса' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('service/:id')
  service(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.service(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для фичи' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('feature/:id')
  feature(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.feature(id, parseImpactMode(mode));
  }

  @ApiOperation({ summary: 'Impact для приложения' })
  @ApiOkResponse({ type: ImpactAnalysisResponse })
  @modeQuery
  @Get('application/:id')
  application(@Param('id') id: string, @Query('mode') mode?: string) {
    return this.impactService.application(id, parseImpactMode(mode));
  }
}
