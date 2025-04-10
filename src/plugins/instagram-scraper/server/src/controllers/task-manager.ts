import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Получение всех задач
   */
  async getTasks(ctx) {
    try {
      const tasks = await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .getTasks();

      return ctx.send({
        data: tasks
      });
    } catch (err) {
      strapi.log.error('Error getting tasks:', err);
      return ctx.badRequest('Failed to get tasks', { error: err.message });
    }
  },

  /**
   * Получение задачи по ID
   */
  async getTask(ctx) {
    try {
      const { id } = ctx.params;
      const task = await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .getTask(id);

      if (!task) {
        return ctx.notFound('Task not found');
      }

      return ctx.send({
        data: task
      });
    } catch (err) {
      strapi.log.error('Error getting task:', err);
      return ctx.badRequest('Failed to get task', { error: err.message });
    }
  },

  /**
   * Создание новой задачи
   */
  async createTask(ctx) {
    try {
      const data = ctx.request.body;

      // Валидация данных
      if (!data.name) {
        return ctx.badRequest('Name is required');
      }

      if (!data.keywords && !data.hashtags) {
        return ctx.badRequest('At least one keyword or hashtag is required');
      }

      const task = await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .createTask(data);

      return ctx.send({
        data: task,
        message: 'Task created successfully'
      });
    } catch (err) {
      strapi.log.error('Error creating task:', err);
      return ctx.badRequest('Failed to create task', { error: err.message });
    }
  },

  /**
   * Обновление задачи
   */
  async updateTask(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const task = await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .updateTask(id, data);

      return ctx.send({
        data: task,
        message: 'Task updated successfully'
      });
    } catch (err) {
      strapi.log.error('Error updating task:', err);
      return ctx.badRequest('Failed to update task', { error: err.message });
    }
  },

  /**
   * Удаление задачи
   */
  async deleteTask(ctx) {
    try {
      const { id } = ctx.params;

      await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .deleteTask(id);

      return ctx.send({
        message: 'Task deleted successfully'
      });
    } catch (err) {
      strapi.log.error('Error deleting task:', err);
      return ctx.badRequest('Failed to delete task', { error: err.message });
    }
  },

  /**
   * Запуск задачи немедленно
   */
  async runTaskNow(ctx) {
    try {
      const { id } = ctx.params;

      const profiles = await strapi
        .plugin('instagram-parser')
        .service('taskManager')
        .runTaskNow(id);

      return ctx.send({
        data: {
          profilesCollected: profiles.length,
          profiles
        },
        message: 'Task executed successfully'
      });
    } catch (err) {
      strapi.log.error('Error running task:', err);
      return ctx.badRequest('Failed to run task', { error: err.message });
    }
  }
});
