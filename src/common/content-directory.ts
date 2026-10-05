import { resolve } from 'node:path';

/** 服务与内容工具都从项目根目录执行，公共配置固定放在data。 */
export const CONTENT_DIRECTORY = resolve('data');
