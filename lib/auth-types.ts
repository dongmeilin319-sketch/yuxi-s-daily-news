/** 纯类型与 cookie 名，供 middleware 等 Edge 环境导入（勿在此文件引用 next/headers）。 */

export const AUTH_COOKIE_NAME = "news_auth_user";

export type AuthUser = {
  id: string;
  username: string;
  /** 可访问的页面权限 key，见 lib/permissions */
  permissions: string[];
};
