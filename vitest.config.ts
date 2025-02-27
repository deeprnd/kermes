import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/programs/**/*.ts'],
    testTimeout: 1000000,
    globals: true,
    environment: 'node'
  }
}) 