// ./src/plugins/instagram-parser/server/services/task-manager.ts
import { Core } from '@strapi/strapi';
import cron from 'node-cron';
import parser from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

// Хранилище для активных cron задач
const activeCronJobs = new Map<string, cron.ScheduledTask>();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Получение всех задач парсинга
   */
  async getTasks(params = {}) {
    return await strapi.query('plugin::instagram-parser.parsing-task').findMany(params);
  },

  /**
   * Получение задачи по ID
   */
  async getTask(id) {
    return await strapi.query('plugin::instagram-parser.parsing-task').findOne({ where: { id } });
  },

  /**
   * Создание новой задачи парсинга
   */
  async createTask(data) {
    const task = await strapi.query('plugin::instagram-parser.parsing-task').create({
      data: {
        ...data,
        cronJobId: uuidv4()
      }
    });

    if (task.active) {
      await this.scheduleTask(task);
    }

    return task;
  },

  /**
   * Обновление задачи парсинга
   */
  async updateTask(id, data) {
    const existingTask = await this.getTask(id);

    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }

    // Если задача активна и расписание изменилось, нужно пересоздать cron job
    const shouldReschedule = data.active &&
      (data.schedule !== existingTask.schedule || data.active !== existingTask.active);

    // Если задача была активной, но стала неактивной, удаляем cron job
    if (existingTask.active && data.active === false) {
      this.unscheduleTask(existingTask.cronJobId);
    }

    // Обновляем задачу в базе данных
    const updatedTask = await strapi.query('plugin::instagram-parser.parsing-task').update({
      where: { id },
      data
    });

    // Пересоздаем cron job если нужно
    if (shouldReschedule) {
      await this.scheduleTask(updatedTask);
    }

    return updatedTask;
  },

  /**
   * Удаление задачи парсинга
   */
  async deleteTask(id) {
    const task = await this.getTask(id);

    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    // Если задача активна, удаляем cron job
    if (task.active) {
      this.unscheduleTask(task.cronJobId);
    }

    // Удаляем задачу из базы данных
    return await strapi.query('plugin::instagram-parser.parsing-task').delete({
      where: { id }
    });
  },

  /**
   * Запуск задачи немедленно
   */
  async runTaskNow(id) {
    const task = await this.getTask(id);

    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    // Запускаем задачу
    const result = await this.executeTask(task);

    // Обновляем информацию о последнем запуске
    await strapi.query('plugin::instagram-parser.parsing-task').update({
      where: { id },
      data: {
        lastRun: new Date(),
        profilesCollected: result.length
      }
    });

    return result;
  },

  /**
   * Планирование задачи в cron
   */
  async scheduleTask(task) {
    // Если задача уже запланирована, удаляем предыдущий cron job
    if (activeCronJobs.has(task.cronJobId)) {
      this.unscheduleTask(task.cronJobId);
    }

    // Проверяем валидность cron-выражения
    if (!cron.validate(task.schedule)) {
      throw new Error(`Invalid cron schedule expression: ${task.schedule}`);
    }

    // Вычисляем время следующего запуска
    const nextRun = this.getNextRunTime(task.schedule);

    // Создаем новый cron job с node-cron
    const scheduledTask = cron.schedule(task.schedule, async () => {
      try {
        // Выполняем задачу
        const result = await this.executeTask(task);

        // Обновляем информацию о последнем запуске и следующем запуске
        const nextRun = this.getNextRunTime(task.schedule);
        await strapi.query('plugin::instagram-parser.parsing-task').update({
          where: { id: task.id },
          data: {
            lastRun: new Date(),
            nextRun,
            profilesCollected: result.length
          }
        });

        strapi.log.info(`Task ${task.name} completed successfully. Collected ${result.length} profiles.`);
      } catch (error) {
        strapi.log.error(`Error running task ${task.name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"  // Устанавливаем UTC зону
    });

    // Запускаем задачу
    scheduledTask.start();

    // Сохраняем cron job в Map
    activeCronJobs.set(task.cronJobId, scheduledTask);

    // Обновляем время следующего запуска в базе данных
    await strapi.query('plugin::instagram-parser.parsing-task').update({
      where: { id: task.id },
      data: { nextRun }
    });

    strapi.log.info(`Task ${task.name} scheduled. Next run at ${nextRun}.`);

    return { nextRun };
  },

  /**
   * Отмена планирования задачи
   */
  unscheduleTask(cronJobId) {
    const scheduledTask = activeCronJobs.get(cronJobId);
    if (scheduledTask) {
      scheduledTask.stop();
      activeCronJobs.delete(cronJobId);
      strapi.log.info(`Task with cronJobId ${cronJobId} unscheduled.`);
    }
  },

  /**
   * Выполнение задачи парсинга
   */
  async executeTask(task) {
    strapi.log.info(`Executing task ${task.name}...`);

    // Выполняем парсинг Instagram профилей
    const profiles = await strapi
      .plugin('instagram-parser')
      .service('instagramParser')
      .searchProfiles({
        keywords: task.keywords || [],
        hashtags: task.hashtags || [],
        limit: task.limit
      });

    return profiles;
  },

  /**
   * Вычисление времени следующего запуска с использованием cron-parser
   */
  getNextRunTime(cronExpression) {
    try {
      // Используем cron-parser для расчета следующей даты запуска
      const interval = parser.parseExpression(cronExpression, { utc: true });
      return interval.next().toDate();
    } catch (error) {
      strapi.log.error(`Error parsing cron expression ${cronExpression}:`, error);
      // Возвращаем примерное время в случае ошибки
      const fallbackDate = new Date();
      fallbackDate.setHours(fallbackDate.getHours() + 24);
      return fallbackDate;
    }
  },

  /**
   * Инициализация всех активных задач при запуске сервера
   */
  async initializeScheduledTasks() {
    try {
      // Получаем все активные задачи
      const tasks = await strapi.query('plugin::instagram-parser.parsing-task').findMany({
        where: { active: true }
      });

      // Планируем каждую задачу
      for (const task of tasks) {
        await this.scheduleTask(task);
      }

      strapi.log.info(`Initialized ${tasks.length} scheduled tasks.`);
    } catch (error) {
      strapi.log.error('Error initializing scheduled tasks:', error);
    }
  }
});
