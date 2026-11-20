import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateEdgeResponse } from '../swagger/create-edge-response';
import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { isDatabaseConnectivityError } from '../common/database-connectivity';
import { EdgeService } from './edge.service';
import { CreateDependsOnFromFeatureVersionsRequest } from '../swagger/create-depends-on-from-feature-versions-request';
import { DeleteDependsOnFromFeatureVersionsRequest } from '../swagger/delete-depends-on-from-feature-versions-request';
import { CreateEdgeRequest } from '../swagger/create-edge-request';

@ApiTags('Edges')
@Controller('edge')
export class EdgeController {
  constructor(private readonly edgeService: EdgeService) {}

  @ApiOperation({ summary: 'Создать DEPENDS_ON из контекста версий фич' })
  @Post('depends-on/from-feature-versions')
  async dependsOnFromFeatureVersions(@Body() body: CreateDependsOnFromFeatureVersionsRequest) {
    try {
      return await this.edgeService.createDependsOnFromFeatureVersions(body);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (isDatabaseConnectivityError(e)) throw e;
      const msg = e instanceof Error ? e.message : 'DEPENDS_ON from feature-versions failed';
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: 'Удалить DEPENDS_ON копии FeatureVersion(draft)' })
  @Post('depends-on/delete')
  async deleteDependsOnFromFeatureVersions(
    @Body() body: DeleteDependsOnFromFeatureVersionsRequest,
  ) {
    try {
      await this.edgeService.deleteDependsOnFromFeatureVersions(body);
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (isDatabaseConnectivityError(e)) throw e;
      const msg = e instanceof Error ? e.message : 'DEPENDS_ON delete failed';
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: 'Создать ребро графа' })
  @ApiOkResponse({ type: CreateEdgeResponse })
  @Post('create')
  async create(@Body() createEdgeDto: CreateEdgeRequest) {
    try {
      return await this.edgeService.create(createEdgeDto);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (isDatabaseConnectivityError(e)) throw e;
      const msg = e instanceof Error ? e.message : 'Edge create failed';
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }
}
