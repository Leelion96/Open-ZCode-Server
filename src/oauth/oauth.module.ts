import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller.js';

@Module({ controllers: [OauthController] })
export class OauthModule {}
