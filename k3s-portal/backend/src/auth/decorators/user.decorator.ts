import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserResponseDto } from '../dto/auth.dto';

export const CurrentUser = createParamDecorator(
  (data: keyof UserResponseDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserResponseDto;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
