import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/kermes_staking/**/*.ts'],
    testTimeout: 1000000,
    globals: true,
    environment: 'node'
  }
}) 