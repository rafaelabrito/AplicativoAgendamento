module.exports = {
  testEnvironment: 'jsdom',
  openHandlesTimeout: 15000,
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/node_modules/@testing-library/jest-dom/dist/index.js'],
  setupFiles: [],
};
