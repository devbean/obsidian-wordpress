export const ERROR_NOTICE_TIMEOUT = 15000;

export const WP_OAUTH2_CLIENT_ID = '79085';
export const WP_OAUTH2_CLIENT_SECRET = 'zg4mKy9O1mc1mmynShJTVxs8r1k3X4e3g1sv5URlkpZqlWdUdAA7C2SSBOo02P7X';
export const WP_OAUTH2_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token';
export const WP_OAUTH2_AUTHORIZE_ENDPOINT = 'https://public-api.wordpress.com/oauth2/authorize';
export const WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token-info';
export const WP_OAUTH2_URL_ACTION = 'wordpress-plugin-oauth';
export const WP_OAUTH2_REDIRECT_URI = `obsidian://${WP_OAUTH2_URL_ACTION}`;

export const WP_DEFAULT_PROFILE_NAME = 'Default';

export const enum EventType {
  OAUTH2_TOKEN_GOT = 'OAUTH2_TOKEN_GOT'
}
