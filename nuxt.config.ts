import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'url'

export default defineNuxtConfig({
  // https://nuxt.com/docs/getting-started/deployment#static-hosting
  routeRules: {
    '/': { ssr: true },
  },
  runtimeConfig: {
    // public runtime env variables
    public: {
      ENVIRONMENT: process.env.ENVIRONMENT || 'Production',
    },
  },
  app: {
    baseURL: '/codelijsten-generator',
    head: {
      title: 'Codelijsten Generator',
      htmlAttrs: {
        lang: 'nl',
      },
      script: [
        {
          src: 'https://prod.widgets.burgerprofiel.vlaanderen.be/api/v1/node_modules/@govflanders/vl-widget-polyfill/dist/index.js',
        },
        {
          src: 'https://prod.widgets.burgerprofiel.vlaanderen.be/api/v1/node_modules/@govflanders/vl-widget-client/dist/index.js',
        },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        {
          rel: 'icon',
          sizes: '192x192',
          href: 'https://data.vlaanderen.be/assets/favicon/icons/icon-highres-precomposed.png',
        },
        {
          rel: 'apple-touch-icon',
          href: 'https://data.vlaanderen.be/assets/favicon/icons/apple-touch-icon.png',
        },
      ],
    },
  },
  // Alias declaration for easier access to components directory
  alias: {
    '@components': fileURLToPath(new URL('./components', import.meta.url)),
    '@types': fileURLToPath(new URL('./types', import.meta.url)),
  },

  // Global CSS: https://nuxt.com/docs/api/configuration/nuxt-config#css
  css: ['~/css/styles.scss'],

  build: {
    transpile: ['@govflanders/vl-widget-polyfill'],
  },

  // Plugins to run before rendering page: https://nuxt.com/docs/api/configuration/nuxt-config#plugins-1
  plugins: [{ src: '~/plugins/webcomponents.js', mode: 'client' }],

  compatibilityDate: '2025-04-17',
})
