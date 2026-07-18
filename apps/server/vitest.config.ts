import { defineConfig } from 'vitest/config';

// NestJS decorators (@Injectable) → enable experimentalDecorators in esbuild.
export default defineConfig({
  test: { environment: 'node' },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
});
