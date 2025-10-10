export const environment = {
  production: true,
  okta: {
    issuer: 'https://{yourOktaDomain}/oauth2/default',
    clientId: '{yourClientId}',
    redirectUri: window.location.origin + '/callback',
    pkce: true,
  },
};
