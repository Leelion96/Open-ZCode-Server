import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  ClientConfigSchema,
  type ClientConfigEnvelope,
  type ClientConfigQuery,
} from '../common/contracts.js';
import { EnvironmentService } from '../common/environment.js';
import { CONTENT_DIRECTORY } from '../common/content-directory.js';
import { loadContentBundle, type ContentBundle } from './content-files.js';

@Injectable()
export class PublicContentService implements OnModuleInit {
  #bundle: ContentBundle | undefined;

  constructor(@Inject(EnvironmentService) private readonly environment: EnvironmentService) {}

  async onModuleInit(): Promise<void> {
    const bundle = await loadContentBundle(CONTENT_DIRECTORY, this.environment.value.publicOrigin);
    const configs = bundle.configs.data.configs;
    if (configs.builtin_provider_config_json === '/assets/builtin-config.json') {
      const origin = this.environment.value.publicOrigin;
      // 客户端只接受HTTPS下载地址；相对入口由本部署origin生成，HTTP联调省略链接。
      if (origin.startsWith('https://'))
        configs.builtin_provider_config_json = `${origin}/assets/builtin-config.json`;
      else delete configs.builtin_provider_config_json;
    }
    bundle.configs = ClientConfigSchema.parse(bundle.configs);
    // 三份内容全部有效后一次建立快照，避免失败留下部分已加载状态。
    this.#bundle = bundle;
  }

  get ready(): boolean {
    return this.#bundle !== undefined;
  }

  // 参数保留客户端契约，本版所有版本/平台统一读取同一份自有配置。
  configs(_query: ClientConfigQuery): ClientConfigEnvelope {
    return structuredClone(this.bundle.configs);
  }

  scenes() {
    return structuredClone(this.bundle.scenes);
  }

  builtin() {
    return structuredClone(this.bundle.builtin);
  }

  announcements() {
    return structuredClone(this.bundle.announcements);
  }

  announcementAsset(name: string) {
    return this.bundle.announcementAssets.get(name);
  }

  private get bundle(): ContentBundle {
    if (!this.#bundle) throw new Error('Content has not initialized');
    return this.#bundle;
  }
}
