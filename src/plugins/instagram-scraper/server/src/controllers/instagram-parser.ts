// src/plugins/instagram-parser/server/controllers/instagram-parser.ts (обновленный)

import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async searchProfiles(ctx) {
    const { keywords, hashtags, limit = 10 } = ctx.request.body;

    try {
      const profiles = await strapi
        .plugin('instagram-parser')
        .service('instagramParser')
        .searchProfiles({ keywords, hashtags, limit });

      return ctx.send({
        data: profiles,
        message: 'Profiles fetched successfully'
      });
    } catch (err) {
      strapi.log.error('Error in Instagram parser controller:', err);
      return ctx.badRequest('Failed to search profiles', { error: err.message });
    }
  },

  async syncProfileByUsername(ctx) {
    const { username } = ctx.params;

    if (!username) {
      return ctx.badRequest('Username parameter is required');
    }

    try {
      const profile = await strapi
        .plugin('instagram-parser')
        .service('instagramParser')
        .syncProfileByUsername(username);

      return ctx.send({
        data: profile,
        message: `Profile ${username} synced successfully`
      });
    } catch (err) {
      strapi.log.error('Error syncing Instagram profile:', err);
      return ctx.badRequest('Failed to sync profile', { error: err.message });
    }
  },

  async getCompanyProfiles(ctx) {
    const { page = 1, pageSize = 25, source } = ctx.query;

    try {
      let filters = {};

      // Фильтрация по источнику данных
      if (source) {
        filters = {
          [`${source}`]: { $ne: null }
        };
      }

      // Получение профилей компаний
      const profiles = await strapi.entityService.findMany('api::company-profile.company-profile', {
        filters,
        sort: { lastUpdated: 'desc' },
        populate: ['instagram', 'twoGis', 'avito'],
        pagination: {
          page,
          pageSize
        }
      });

      return ctx.send({
        data: profiles,
        meta: {
          pagination: {
            page,
            pageSize,
            total: await strapi.entityService.count('api::company-profile.company-profile', { filters })
          }
        }
      });
    } catch (err) {
      strapi.log.error('Error fetching company profiles:', err);
      return ctx.badRequest('Failed to fetch company profiles', { error: err.message });
    }
  }
});
