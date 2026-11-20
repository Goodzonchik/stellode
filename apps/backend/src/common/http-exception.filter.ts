import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  DATABASE_UNAVAILABLE_MESSAGE_RU,
  isDatabaseConnectivityError,
} from './database-connectivity';

type ExpressStyleResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ExpressStyleResponse>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const json =
        typeof body === 'string' ? { statusCode: status, message: body } : body;
      response.status(status).json(json);
      return;
    }

    if (isDatabaseConnectivityError(exception)) {
      const detail = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn(`Database connectivity failure: ${detail}`);
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: DATABASE_UNAVAILABLE_MESSAGE_RU,
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
