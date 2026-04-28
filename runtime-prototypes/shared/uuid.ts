/**
 * 生成 UUID v4 格式字符串。
 * 优先使用 crypto.randomUUID()（安全上下文），不可用时 fallback 到 Math.random()。
 * 解决通过 HTTP + IP 地址访问时 crypto.randomUUID 不存在的问题。
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
