/**
 * 社区笔记配图的上传限额。表单校验和服务端动作共用同一份数字，避免两边漂移。
 *
 * 原先这些常量和 Supabase Storage 的 bucket 配置放在一起；图片改存自有 VPS 后，
 * bucket 名称和文件名清洗都不再需要——存储是内容寻址的，文件名由哈希决定。
 */
export const goodsCommunityUploadLimits = {
  maxFiles: 4,
  maxFileSizeBytes: 5 * 1024 * 1024,
} as const;
