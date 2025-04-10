import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // Инициализация хранилища настроек плагина
  const initializePlugin = async () => {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'instagram-parser',
    });

    // Инициализируем настройки по умолчанию, если их нет
    const settings = await pluginStore.get({ key: 'settings' });
    if (!settings) {
      await pluginStore.set({
        key: 'settings',
        value: {
          enabled: false,
          keywords: ['digital marketing', 'b2b services'],
          hashtags: ['b2b', 'marketing'],
          limit: 10
        },
      });
    }

    // Инициализируем все запланированные задачи
    await strapi
      .plugin('instagram-parser')
      .service('taskManager')
      .initializeScheduledTasks();

    strapi.log.info('Instagram parser plugin initialized successfully');
  };

  // Запускаем инициализацию после полной загрузки Strapi
  strapi.db.lifecycles.subscribe({
    models: ['admin::user'], // Используем admin::user как маркер, что Strapi полностью загружен
    afterCreate: () => {
      // Запускаем с небольшой задержкой, чтобы быть уверенными, что все сервисы загружены
      setTimeout(() => {
        initializePlugin().catch(error => {
          strapi.log.error('Failed to initialize Instagram parser plugin:', error);
        });
      }, 1000);
    }
  });
};
