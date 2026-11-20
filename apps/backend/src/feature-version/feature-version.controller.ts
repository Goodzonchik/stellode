import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  BadRequestException,
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
import { CreateFeatureVersionRequest } from '../swagger/create-feature-version-request';
import { GetFeatureVersionsRequest } from '../swagger/get-feature-versions-request';
import { RaiseFeatureComponentVersionRequest } from '../swagger/raise-feature-component-version-request';
import { RaiseFeatureComponentVersionResponse } from '../swagger/raise-feature-component-version-response';
import { TransitionFeatureVersionRequest } from '../swagger/transition-feature-version-request';

@ApiTags('Feature versions')
@Controller('feature-versions')
export class FeatureVersionController {
  constructor(private readonly featureVersionService: FeatureVersionService) {}

  @ApiOperation({ summary: 'Список версий фичи по featureElementId' })
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

  @ApiOperation({ summary: 'Сменить статус версии фичи' })
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

  @ApiOperation({ summary: 'Изменить связи USES_COMPONENT_VERSION' })
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
    try {
      return await this.featureVersionService.patchUsesComponentVersions(
        body.featureVersionId,
        add,
        remove,
      );
    } catch (error) {
      if (error instanceof Error && error.message) {
        if (error.message === 'FeatureVersion not found') {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        const badRequestHints = [
          'несовпадение юнита',
          'unknown Component',
          'некорректные цели',
          'USES_COMPONENT_VERSION',
          'patchUsesComponentVersions',
          'applicationId',
          'не может быть в статусе unactive',
          'только при наследовании',
          'только в статусе draft',
          'уже добавлена',
        ];
        if (badRequestHints.some((hint) => error.message.includes(hint))) {
          throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Пересчитать readyToProduction',
    description:
      'Ручная проверка готовности черновика (spec §6). Возвращает readyToProduction и разбор по каждой привязке USES_COMPONENT_VERSION (приложение, компонент, версия, статус в релизе, reason).',
  })
  @ApiResponse({
    status: 200,
    description:
      'featureVersion (снимок после возможной автопубликации), readyToProduction, reason, bindings[]',
  })
  @Post('check-ready')
  async checkReady(@Body() body: CheckFeatureVersionReadyRequest) {
    return this.featureVersionService.checkReadyToProduction(body.featureVersionId);
  }

  @ApiOperation({
    summary: 'Поднять версию компонента в draft FV',
    description:
      'Заменяет USES для одного applicationId на более новую CV (создаёт draft при отсутствии toComponentVersionId) и синхронизирует исходящие DEPENDS_ON для этого приложения.',
  })
  @ApiResponse({ status: 200, type: RaiseFeatureComponentVersionResponse })
  @Post('raise-component-version')
  async raiseComponentVersion(@Body() body: RaiseFeatureComponentVersionRequest) {
    try {
      return await this.featureVersionService.raiseComponentVersion(body);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error && error.message) {
        if (error.message === 'FeatureVersion not found') {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        const badRequestHints = [
          'raise-component-version',
          'только в статусе draft',
          'USES_COMPONENT_VERSION',
          'patchUsesComponentVersions',
          'несовпадение юнита',
          'некорректные цели',
          'не может быть в статусе unactive',
          'только при наследовании',
        ];
        if (badRequestHints.some((hint) => error.message.includes(hint))) {
          throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Удалить версию фичи (только draft)' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.featureVersionService.remove(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (
        error instanceof Error &&
        error.message &&
        (error.message.includes('dependencies') ||
          error.message.includes('Cannot delete featureVersion'))
      ) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
