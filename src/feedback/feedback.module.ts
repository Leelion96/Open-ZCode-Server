import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller.js';

@Module({ controllers: [FeedbackController] })
export class FeedbackModule {}
