import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { rewriteMediaUrlsInPayload } from './media-url.util';

@Injectable()
export class MediaUrlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const host = req.headers.host;
    const protocol = req.protocol;

    return next.handle().pipe(
      map((data) => rewriteMediaUrlsInPayload(data, host, protocol)),
    );
  }
}
