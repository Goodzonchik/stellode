import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReleasePreviewResponseBody } from '../swagger/release-preview-response-body';
import { ApplicationVersionCompositionResponse } from '../swagger/application-version-composition-response';
import { ApplicationVersionRowResponse } from '../swagger/application-version-row-response';
import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { isDatabaseConnectivityError } from '../common/database-connectivity';
import { ApplicationVersionService } from './application-version.service';
import { ListApplicationVersionsRequest } from '../swagger/list-application-versions-request';
import { RenameApplicationVersionRequest } from '../swagger/rename-application-version-request';
import { ReleaseApplicationRequest } from '../swagger/release-application-request';
import { ReleaseComponentsRequest } from '../swagger/release-components-request';
import { ReleasePreviewRequest } from '../swagger/release-preview-request';
import { RevertApplicationRequest } from '../swagger/revert-application-request';

@ApiTags('Application versions')
@Controller('application-versions')
export class ApplicationVersionController {
  constructor(private readonly applicationVersionService: ApplicationVersionService) {}

  @ApiOperation({ summary: 'Список версий приложения по applicationElementId' })
  @Post()
  listByApplication(@Body() body: ListApplicationVersionsRequest) {
    return this.applicationVersionService.getApplicationVersionsByApplicationElementId(
      body.applicationElementId,
    );
  }

  @ApiOperation({
    summary: 'Переименовать version у ApplicationVersion(current)',
    description:
      'Нормализация: trim; пустая строка → 400. Допустимо только для статуса current (иначе 400). Уникальность version в пределах Application → 409. Меняется только version; versionNumber, состав и статус не трогаются.',
  })
  @ApiOkResponse({ type: ApplicationVersionRowResponse })
  @ApiResponse({ status: 400, description: 'Пустая строка или версия не current' })
  @ApiResponse({ status: 409, description: 'Конфликт уникальности version' })
  @Patch(':id')
  async renameVersion(@Param('id') id: string, @Body() body: RenameApplicationVersionRequest) {
    try {
      return await this.applicationVersionService.renameVersion(id, body);
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Read-only состав ApplicationVersion (HAS_COMPONENT)',
    description: 'Снимок HAS_COMPONENT выбранной ApplicationVersion.',
  })
  @ApiOkResponse({ type: ApplicationVersionCompositionResponse })
  @ApiResponse({ status: 404, description: 'ApplicationVersion не найдена' })
  @Get(':id/composition')
  async getComposition(@Param('id') id: string) {
    try {
      return await this.applicationVersionService.getComposition(id);
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error;
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error && error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Базовый состав компонентов для мастера релиза' })
  @Post('release-components')
  releaseComponents(@Body() body: ReleaseComponentsRequest) {
    return this.applicationVersionService.getComponentsForRelease(body.applicationVersionId);
  }

  @ApiOperation({ summary: 'Предпросмотр последствий релиза или отката' })
  @ApiOkResponse({ type: ReleasePreviewResponseBody })
  @Post('release-preview')
  async releasePreview(@Body() body: ReleasePreviewRequest) {
    try {
      return await this.applicationVersionService.releasePreview(body);
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Выполнить релиз версии приложения' })
  @Post('release')
  async release(@Body() body: ReleaseApplicationRequest) {
    try {
      return await this.applicationVersionService.release(body);
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Откат к предыдущему составу' })
  @Post('revert')
  async revert(@Body() body: RevertApplicationRequest) {
    try {
      return await this.applicationVersionService.revert(body);
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof Error && error.message) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
