// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    dbHost: process.env.DB_HOST || '127.0.0.1',
    dbPort: Number(process.env.DB_PORT || 5432),
    dbName: process.env.DB_NAME || 'cody',
    dbSchema: process.env.DB_SCHEMA || 'maria',
    dbUser: process.env.DB_USER || 'usrcody',
    dbPassword: process.env.DB_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || 'cody-default-secret-change-in-production',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'AdminCody2026*',
    adminName: process.env.ADMIN_NAME || 'Administrador',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@cody.local',
    public: {
      appName: 'Cody'
    }
  },

  devServer: {
    port: 9026,
    host: '0.0.0.0'
  },

  ui: {
    eslint: {
      rules: {
        'no-unknown-classes': 'error',
        'no-conflicting-classes': 'error',
        'no-palette-colors': 'error'
      }
    }
  },

  routeRules: {
    '/api/**': {
      cors: false
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
