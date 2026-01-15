/* global jest */
// Setup file for Jest

// Mock Expo's Winter runtime
global.__ExpoImportMetaRegistry = {
  get: () => undefined,
};

// Add structuredClone polyfill for Node environments that don't have it
if (typeof global.structuredClone === "undefined") {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock expo-audio
jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
  })),
  AudioModule: {
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock console pour réduire le bruit dans les tests
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

// Mock Blob for cache-manager tests
global.Blob = class Blob {
  constructor(parts) {
    this.parts = parts;
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
  }
};

// Mock fetch
global.fetch = jest.fn();
