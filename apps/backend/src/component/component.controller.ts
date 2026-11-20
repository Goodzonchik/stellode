import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ComponentWithTeamResponse } from '../swagger/component-with-team-response';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ComponentService } from './component.service';
import { CreateComponentRequest } from '../swagger/create-component-request';
import { GetComponentsRequest } from '../swagger/get-components-request';
import { UpdateComponentRequest } from '../swagger/update-component-request';

const hasOwnProperty = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

@ApiTags('Components')
@Controller('components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  @ApiOperation({ summary: 'Список компонентов по unitId' })
  @ApiOkResponse({ type: ComponentWithTeamResponse, isArray: true })
  @Post()
  async getComponentsByUnitElementId(
    @Body()
    getComponentsDto: GetComponentsRequest,
  ) {
    return this.componentService.getComponentsByUnitElementId(
      getComponentsDto.unitId ?? '',
    );
  }

  @ApiOperation({ summary: 'Создать компонент' })
  @Post('create')
  async create(
    @Body()
    createComponentDto: CreateComponentRequest,
  ) {
    if (!createComponentDto.name) {
      throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    }
    if (!createComponentDto.unitId) {
      throw new HttpException('unitId is required', HttpStatus.BAD_REQUEST);
    }
    if (!createComponentDto.teamId) {
      throw new HttpException('teamId is required', HttpStatus.BAD_REQUEST);
    }
    return this.componentService.create(createComponentDto);
  }

  @ApiOperation({ summary: 'Получить компонент по id' })
  @ApiOkResponse({ type: ComponentWithTeamResponse })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.componentService.findOne(id);
  }

  @ApiOperation({ summary: 'Обновить компонент' })
  @ApiOkResponse({ type: ComponentWithTeamResponse })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    updateComponentDto: UpdateComponentRequest,
  ) {
    if (hasOwnProperty(updateComponentDto as object, 'isDependency')) {
      throw new HttpException('isDependency is immutable for Component', HttpStatus.BAD_REQUEST);
    }
    if (!updateComponentDto.teamId) {
      throw new HttpException('teamId is required', HttpStatus.BAD_REQUEST);
    }
    if (!updateComponentDto.unitId) {
      throw new HttpException('unitId is required', HttpStatus.BAD_REQUEST);
    }
    return this.componentService.update(id, updateComponentDto);
  }

  @ApiOperation({ summary: 'Удалить компонент' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.componentService.remove(id);
  }
}
