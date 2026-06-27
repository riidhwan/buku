import { AppConfig } from '../app/core/config/app-config';

export const environment = {
  appConfig: {
    appName: 'Buku',
    production: false,
    updates: {
      githubOwner: 'riidhwan',
      githubRepo: 'buku',
      apkAssetPrefix: 'buku',
    },
  } satisfies AppConfig,
};
