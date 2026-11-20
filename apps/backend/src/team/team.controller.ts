import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Controller, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamRequest } from '../swagger/create-team-request';
import { FindTeamsRequest } from '../swagger/find-teams-request';
import { UpdateTeamRequest } from '../swagger/update-team-request';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @ApiOperation({ summary: 'Список команд по unitId' })
  @Post()
  findAll(@Body() body: FindTeamsRequest) {
    return this.teamService.findAll({
      unitId: body.unitId ?? '',
    });
  }

  @ApiOperation({ summary: 'Создать команду' })
  @Post('create')
  create(@Body() body: CreateTeamRequest) {
    return this.teamService.create(body);
  }

  @ApiOperation({ summary: 'Обновить команду' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateTeamRequest) {
    return this.teamService.update(id, body);
  }

  @ApiOperation({ summary: 'Удалить команду' })
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.teamService.delete(id);
  }
}
