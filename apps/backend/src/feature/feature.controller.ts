import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Controller, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { CreateFeatureRequest } from '../swagger/create-feature-request';
import { FindFeaturesRequest } from '../swagger/find-features-request';
import { UpdateFeatureRequest } from '../swagger/update-feature-request';

@ApiTags('Features')
@Controller('features')
export class FeatureController {
  constructor(private readonly teamFeature: FeatureService) {}

  @ApiOperation({ summary: 'Список фич по unitId' })
  @Post()
  findAll(@Body() body: FindFeaturesRequest) {
    return this.teamFeature.findAll({
      unitId: body.unitId ?? '',
    });
  }

  @ApiOperation({ summary: 'Создать фичу' })
  @Post('create')
  create(@Body() body: CreateFeatureRequest) {
    return this.teamFeature.create(body);
  }

  @ApiOperation({ summary: 'Обновить фичу' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateFeatureRequest) {
    return this.teamFeature.update(id, body);
  }

  @ApiOperation({ summary: 'Удалить фичу' })
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.teamFeature.delete(id);
  }
}
