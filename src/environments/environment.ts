// src/environments/environment.ts
export const environment = {
  production: false,
  okta: {
    issuer: 'https://YOUR_OKTA_DOMAIN.okta.com/oauth2/default',
    clientId: 'YOUR_OKTA_CLIENT_ID',
    redirectUri: window.location.origin + '/login/callback',
    scopes: ['openid', 'profile', 'email'],
  },
};
