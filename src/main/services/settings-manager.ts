import Store from 'electron-store';

export interface AppSettings {
  transcription: {
    enabled: boolean;
    mode: 'local' | 'cloud';
    language: string;
    saveTranscripts: boolean;
    cloudProvider?: string;
  };
  audio: {
    inputDeviceId?: string;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  overlay: {
    opacity: number;
    alwaysOnTop: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  privacy: {
    telemetryEnabled: boolean;
    cloudConsentGiven: boolean;
  };
  firstRun: boolean;
}

const defaultSettings: AppSettings = {
  transcription: {
    enabled: false,
    mode: 'local',
    language: 'en-US',
    saveTranscripts: false,
  },
  audio: {
    noiseSuppression: false,
    autoGainControl: true,
  },
  overlay: {
    opacity: 0.9,
    alwaysOnTop: true,
    position: { x: 0, y: 0 },
    size: { width: 800, height: 400 },
  },
  privacy: {
    telemetryEnabled: false,
    cloudConsentGiven: false,
  },
  firstRun: true,
};

export class SettingsManager {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: defaultSettings,
      name: 'meeting-overlay-settings',
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    this.store.set(key, value);
  }

  getAll(): AppSettings {
    return this.store.store;
  }

  isFirstRun(): boolean {
    return this.store.get('firstRun', true);
  }

  setFirstRunComplete(): void {
    this.store.set('firstRun', false);
  }

  reset(): void {
    this.store.clear();
  }
}
