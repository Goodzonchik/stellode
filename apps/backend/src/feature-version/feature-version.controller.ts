import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { parseVersionStatus } from '@stellode/models';
import { FeatureVersionService } from './feature-version.service';
import { BindFeatureComponentVersionsRequest } from '../swagger/bind-feature-component-versions-request';
import { CheckFeatureVersionReadyRequest } from '../swagger/check-feature-version-ready-request';
import { CheckFeatureVersionReadyResponse } from '../swagger/check-feature-version-ready-response';
import { CreateFeatureVersionRequest } from '../swagger/create-feature-version-request';
import { FeatureVersionListItemResponse } from '../swagger/feature-version-list-item-response';
import { GetFeatureVersionsRequest } from '../swagger/get-feature-versions-request';
import { RaiseFeatureComponentVersionRequest } from '../swagger/raise-feature-component-version-request';
import { RaiseFeatureComponentVersionResponse } from '../swagger/raise-feature-component-version-response';
import { TransitionFeatureVersionRequest } from '../swagger/transition-feature-version-request';

@ApiTags('Feature versions')
@Controller('feature-versions')
export class FeatureVersionController {
  constructor(private readonly featureVersionService: FeatureVersionService) {}

  @ApiOperation({ summary: 'Список версий фичи по featureElementId' })
  @ApiOkResponse({ type: [FeatureVersionListItemResponse] })
  @Post()
  async getFeatureVersionsByFeatureElementId(@Body() getFeatureVersionDto: GetFeatureVersionsRequest) {
    return this.featureVersionService.getFeatureVersionsByFeatureElementId(
      getFeatureVersionDto.featureElementId,
    );
  }

  @ApiOperation({ summary: 'Создать версию фичи (draft)' })
  @Post('create')
  async create(@Body() createFeatureVersionDto: CreateFeatureVersionRequest) {
    return this.featureVersionService.create(createFeatureVersionDto);
  }

  @ApiOperation({
    summary: 'Сменить статус версии фичи',
    description:
      'draft → active: при отсутствии USES → 400 «Нет связанных компонентов»; при неготовых привязках → 400 «Нельзя активировать фичу. Нажмите «Проверить готовность», чтобы увидеть детали». При успехе создаются PINNED_TO_APPLICATION_VERSION к ApplicationVersion(current) для distinct приложений из USES.applicationId и providerApplicationId исходящих DEPENDS_ON; если current с нужным HAS_COMPONENT не резолвится → 400, статус и pin не пишутся.',
  })
  @ApiResponse({ status: 400, description: 'Пустой состав, неготовые bindings или ошибка pin' })
  @Post('transition')
  async transition(@Body() body: TransitionFeatureVersionRequest) {
    const status = parseVersionStatus(body.status);
    if (!status) {
      throw new HttpException('Invalid status', HttpStatus.BAD_REQUEST);
    }
    return this.featureVersionService.transition({
      featureVersionId: body.featureVersionId,
      status,
    });
  }

  @ApiOperation({
    summary: 'Изменить связи USES_COMPONENT_VERSION',
    description:
      'Массивы add/remove с элементами { componentVersionId, applicationId }. Типичные 400: FV не draft / неизвестные id / несовпадение юнита; повтор той же пары (componentVersionId, applicationId) уже в составе → 400 «Такая версия компонента уже добавлена в это приложение» (весь add отклоняется). Разные ComponentVersion одного компонента и та же CV в другом applicationId — допустимы.',
  })
  @ApiResponse({
    status: 400,
    description: 'FV не draft, неизвестные id, несовпадение юнита или дубль пары в add',
  })
  @Post('bind-component-versions')
  async bindComponentVersions(@Body() body: BindFeatureComponentVersionsRequest) {
    const add = body.add ?? [];
    const remove = body.remove ?? [];
    if (add.length === 0 && remove.length === 0) {
      throw new HttpException(
        'add or remove bindings must be non-empty',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.featureVersionService.patchUsesComponentVersions(
      body.featureVersionId,
      add,
      remove,
    );
  }

  @ApiOperation({
    summary: 'Пересчитать readyToProduction',
    description:
      'Ручная проверка готовности черновика (spec §6). Возвращает readyToProduction и разбор по каждой привязке USES_COMPONENT_VERSION и исходящим cross-unit DEPENDS_ON.',
  })
  @ApiOkResponse({ type: CheckFeatureVersionReadyResponse })
  @Post('check-ready')
  async checkReady(@Body() body: CheckFeatureVersionReadyRequest) {
    return this.featureVersionService.checkReadyToProduction(body.featureVersionId);
  }

  @ApiOperation({
    summary: 'Поднять версию компонента в draft FV',
    description:
      'Заменяет USES для одного applicationId на более новую CV (создаёт draft при отсутствии toComponentVersionId); синхронизирует исходящие DEPENDS_ON с consumerApplicationId = этот app и переносит входящие DEPENDS_ON этого draft с providerApplicationId = этот app. Не пишет HAS_COMPONENT / pin. Типичные 400: FV не draft / нет исходной привязки / to не новее или неверный статус; 409 — нельзя создать draft CV (уже есть HAS_DRAFT).',
  })
  @ApiOkResponse({ type: RaiseFeatureComponentVersionResponse })
  @ApiResponse({ status: 400, description: 'FV не draft / нет привязки / неверная целевая CV' })
  @ApiResponse({ status: 409, description: 'Нельзя создать draft CV (HAS_DRAFT)' })
  @Post('raise-component-version')
  async raiseComponentVersion(@Body() body: RaiseFeatureComponentVersionRequest) {
    return this.featureVersionService.raiseComponentVersion(body);
  }

  @ApiOperation({ summary: 'Удалить версию фичи (только draft)' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.featureVersionService.remove(id);
  }
}
