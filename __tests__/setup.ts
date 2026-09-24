import { resetWarningsForTesting } from '../src/internal/logger';

// React act() environment for react-test-renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalError = console.error;
beforeEach(() => {
  resetWarningsForTesting();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return;
    originalError(...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).__LOCALIZE_SDK__;
});
