import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'in-progress', 'ready', 'delivered', 'cancelled'])
  status: string;
}
