import { Module } from '@nestjs/common';
import { SharesController } from './shares.controller.js';

@Module({ controllers: [SharesController] })
export class SharesModule {}
