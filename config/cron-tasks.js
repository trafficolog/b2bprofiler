// config/cron-tasks.js
module.exports = {
  /**
   * Cron job для парсинга Instagram по расписанию
   */
  'instagram-profile-search': {
    task: async ({ strapi }) => {
      try {
        // Получаем настройки для поиска из конфигурации
        const pluginStore = strapi.store({
          environment: '',
          type: 'plugin',
          name: 'instagram-parser',
        });
        
        const config = await pluginStore.get({ key: 'settings' });
        
        if (config && config.enabled && config.keywords && config.hashtags) {
          const { keywords, hashtags, limit } = config;
          
          strapi.log.info('Starting scheduled Instagram profile search');
          
          await strapi
            .plugin('instagram-parser')
            .service('instagramParser')
            .searchProfiles({ keywords, hashtags, limit });
          
          strapi.log.info('Scheduled Instagram profile search completed');
        }
      } catch (error) {
        strapi.log.error('Error in scheduled Instagram profile search:', error);
      }
    },
    options: {
      rule: '5 * * * *', // Ежедневно в полночь
    },
  },
};