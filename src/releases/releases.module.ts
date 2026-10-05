import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller.js';

@Module({ controllers: [ReleasesController] })
export class ReleasesModule {}
