import { AppConfig } from '../app/core/config/app-config';

export const environment = {
  appConfig: {
    appName: 'Buku',
    production: true,
    updates: {
      githubOwner: 'riidhwan',
      githubRepo: 'buku',
      apkAssetPrefix: 'buku',
    },
  } satisfies AppConfig,
};
