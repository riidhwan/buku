export interface AppConfig {
  readonly appName: string;
  readonly production: boolean;
  readonly updates: AppUpdateConfig;
}

export interface AppUpdateConfig {
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly apkAssetPrefix: string;
}
