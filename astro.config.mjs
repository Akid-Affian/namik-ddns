import { defineConfig, envField } from 'astro/config';
import node from "@astrojs/node";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [tailwind()],
  server: {
    host: import.meta.env.HOST || '0.0.0.0',
    port: import.meta.env.PORT || 4321
  },
  experimental: {
    env: {
      schema: {
        BASE_DOMAIN: envField.string({ context: 'server', access: 'public', optional: true }),
        NAMESERVERS: envField.string({ context: 'server', access: 'public', optional: true }),
        PORT: envField.number({ context: 'server', access: 'public', default: 4321 }),
        NODE_ENV: envField.string({ context: 'server', access: 'public', default: 'development' }),
        HOST: envField.string({ context: 'server', access: 'public', default: '0.0.0.0' }),
      },
    },
  },
});
