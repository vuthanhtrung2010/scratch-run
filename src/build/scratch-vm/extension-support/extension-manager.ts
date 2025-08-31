class SecurityManager {
  canLoadExtensionFromProject(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class ExtensionManager {
  securityManager: SecurityManager;

  constructor() {
    this.securityManager = new SecurityManager();
  }

  isExtensionLoaded(): boolean {
    return false;
  }

  isBuiltinExtension(): boolean {
    return true;
  }

  loadExtensionIdSync(): void {}

  async loadExtensionURL(): Promise<void> {}

  allAsyncExtensionsLoaded(): void {}

  refreshBlocks(): void {}

  getExtensionURLs(): Record<string, any> {
    return {};
  }

  isExtensionURLLoaded(): boolean {
    return false;
  }
}

export default ExtensionManager;
