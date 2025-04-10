// src/plugins/instagram-parser/server/services/instagram-parser.ts (продолжение)

import { Core } from '@strapi/strapi';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import _ from 'lodash';

puppeteer.use(StealthPlugin());

interface SearchParams {
  keywords: string[];
  hashtags: string[];
  limit: number;
}

// Типы для Company Profile
interface CompanyProfile {
  name: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: InstagramProfile;
  dataSources?: Record<string, any>;
  lastUpdated?: string;
}

// Типы для Instagram Profile
interface InstagramProfile {
  username: string;
  userId?: string;
  fullName?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  biography?: string;
  externalUrl?: string | null;
  profilePicUrl?: string;
  businessEmail?: string | null;
  businessPhoneNumber?: string | null;
  isBusinessAccount?: boolean;
  businessCategory?: string | null;
  lastSynced?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async searchProfiles(params: SearchParams) {
    const { keywords, hashtags, limit } = params;

    if ((!keywords || keywords.length === 0) && (!hashtags || hashtags.length === 0)) {
      throw new Error('At least one keyword or hashtag must be provided');
    }

    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Устанавливаем User-Agent как у обычного пользователя
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      // Список для хранения найденных профилей
      const foundProfiles: InstagramProfile[] = [];

      // Поиск по хэштегам
      if (hashtags && hashtags.length > 0) {
        for (const hashtag of hashtags) {
          if (foundProfiles.length >= limit) break;

          const hashtagProfiles = await this.searchByHashtag(page, hashtag, limit - foundProfiles.length);
          foundProfiles.push(...hashtagProfiles);
        }
      }

      // Поиск по ключевым словам
      if (keywords && keywords.length > 0 && foundProfiles.length < limit) {
        for (const keyword of keywords) {
          if (foundProfiles.length >= limit) break;

          const keywordProfiles = await this.searchByKeyword(page, keyword, limit - foundProfiles.length);

          // Добавляем только те профили, которые еще не были найдены
          const uniqueProfiles = keywordProfiles.filter(profile =>
            !foundProfiles.some(existingProfile => existingProfile.username === profile.username)
          );

          foundProfiles.push(...uniqueProfiles);
        }
      }

      // Сохраняем найденные профили в базу данных
      const savedProfiles = [];
      for (const profile of foundProfiles) {
        try {
          const savedProfile = await this.saveProfile(profile);
          savedProfiles.push(savedProfile);
        } catch (error) {
          strapi.log.error(`Failed to save profile ${profile.username}:`, error);
        }
      }

      return savedProfiles;

    } catch (err) {
      strapi.log.error('Error in Instagram parser service:', err);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async searchByHashtag(page: Page, hashtag: string, limit: number): Promise<InstagramProfile[]> {
    // Удаляем # если он присутствует в начале
    const cleanHashtag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;

    try {
      // Переходим на страницу хэштега
      await page.goto(`https://www.instagram.com/explore/tags/${cleanHashtag}/`, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Ждем загрузки постов
      await this.waitForPostsToLoad(page);

      // Собираем ссылки на посты
      const postLinks = await this.collectPostLinks(page);

      // Собираем профили из постов
      return this.collectProfilesFromPosts(page, postLinks, limit);

    } catch (error) {
      strapi.log.error(`Error searching hashtag ${hashtag}:`, error);
      return [];
    }
  },

  async searchByKeyword(page: Page, keyword: string, limit: number): Promise<InstagramProfile[]> {
    try {
      // Переходим на страницу поиска
      await page.goto('https://www.instagram.com/explore/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Ищем по ключевому слову
      await page.waitForSelector('input[placeholder="Search"]');
      await page.click('input[placeholder="Search"]');
      await page.type('input[placeholder="Search"]', keyword, { delay: 100 });

      // Ждем результатов поиска
      await page.waitForSelector('a[href^="/explore/tags/"]', { timeout: 10000 }).catch(() => {});

      // Собираем ссылки на результаты поиска (аккаунты)
      const accountLinks = await page.$$eval('a[href^="/"]', links =>
        links.filter(link => {
          const href = link.getAttribute('href');
          return href && href.startsWith('/') && !href.includes('/explore/') && !href.includes('/p/');
        }).map(link => link.getAttribute('href'))
      );

      // Собираем профили из результатов поиска
      return this.collectProfilesFromAccountLinks(page, accountLinks, limit);

    } catch (error) {
      strapi.log.error(`Error searching keyword ${keyword}:`, error);
      return [];
    }
  },
  // src/plugins/instagram-parser/server/services/instagram-parser.ts (продолжение)

  async waitForPostsToLoad(page: Page): Promise<void> {
    try {
      await page.waitForSelector('article a', { timeout: 10000 });
    } catch (error) {
      strapi.log.warn('Could not detect posts on page');
    }
  },

  async collectPostLinks(page: Page): Promise<string[]> {
    return page.$$eval('article a[href^="/p/"]', links =>
      links.map(link => link.getAttribute('href')).filter(href => href !== null) as string[]
    );
  },

  async collectProfilesFromPosts(page: Page, postLinks: string[], limit: number): Promise<InstagramProfile[]> {
    const profiles: InstagramProfile[] = [];
    const processedUsernames = new Set<string>();

    for (const postLink of postLinks) {
      if (profiles.length >= limit) break;

      try {
        // Переходим на страницу поста
        await page.goto(`https://www.instagram.com${postLink}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Получаем ссылку на профиль автора поста
        const profileLink = await page.$eval('a[href^="/"][role="link"]', (link) => link.getAttribute('href'));

        if (profileLink && !processedUsernames.has(profileLink)) {
          processedUsernames.add(profileLink);

          // Переходим на страницу профиля
          await page.goto(`https://www.instagram.com${profileLink}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });

          // Извлекаем данные профиля
          const profile = await this.extractProfileData(page);

          // Проверяем, является ли аккаунт бизнес-аккаунтом
          if (profile.isBusinessAccount || this.isBusiness(profile)) {
            profiles.push(profile);
          }
        }
      } catch (error) {
        strapi.log.error(`Error processing post ${postLink}:`, error);
      }
    }

    return profiles;
  },

  async collectProfilesFromAccountLinks(page: Page, accountLinks: string[], limit: number): Promise<InstagramProfile[]> {
    const profiles: InstagramProfile[] = [];
    const processedUsernames = new Set<string>();

    for (const accountLink of accountLinks) {
      if (profiles.length >= limit) break;

      try {
        if (accountLink && !processedUsernames.has(accountLink)) {
          processedUsernames.add(accountLink);

          // Переходим на страницу профиля
          await page.goto(`https://www.instagram.com${accountLink}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });

          // Извлекаем данные профиля
          const profile = await this.extractProfileData(page);

          // Проверяем, является ли аккаунт бизнес-аккаунтом
          if (profile.isBusinessAccount || this.isBusiness(profile)) {
            profiles.push(profile);
          }
        }
      } catch (error) {
        strapi.log.error(`Error processing account ${accountLink}:`, error);
      }
    }

    return profiles;
  },

  // Метод для определения, является ли профиль бизнес-профилем по косвенным признакам
  isBusiness(profile: InstagramProfile): boolean {
    // Ищем бизнес-признаки в биографии
    const businessKeywords = [
      'company', 'business', 'agency', 'official', 'store',
      'shop', 'brand', 'service', 'consulting', 'contact',
      'компания', 'бизнес', 'магазин', 'услуги', 'контакты'
    ];

    const hasBioBusinessKeywords = businessKeywords.some(keyword =>
      profile.biography.toLowerCase().includes(keyword)
    );

    // Проверяем наличие внешней ссылки и email
    const hasExternalUrl = !!profile.externalUrl;
    const hasBusinessEmail = !!profile.businessEmail;

    // Проверяем количество подписчиков (часто у бизнеса много подписчиков)
    const hasSignificantFollowers = profile.followersCount > 1000;

    // Если соответствует нескольким критериям, считаем бизнес-аккаунтом
    return (hasExternalUrl && hasSignificantFollowers) ||
           (hasBioBusinessKeywords && (hasExternalUrl || hasBusinessEmail)) ||
           (hasBusinessEmail && hasSignificantFollowers);
  },
  async extractProfileData(page: Page): Promise<InstagramProfile> {
    try {
      // Ожидаем загрузки данных профиля
      await page.waitForSelector('header section', { timeout: 10000 });

      // Получаем username из URL
      const url = page.url();
      const username = url.split('/').filter(segment => segment).pop() || '';

      // Извлекаем метаданные страницы, которые содержат JSON с данными профиля
      const profileData = await page.evaluate(() => {
        const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
        const scripts = Array.from(scriptElements); // Преобразуем NodeList в Array для итерации

        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '{}');
            if (data && data.mainEntityofPage && data.mainEntityofPage.identifier) {
              return data;
            }
          } catch (e) {
            // Игнорируем ошибки парсинга JSON
          }
        }
        return null;
      });

      // Извлекаем основные данные профиля через DOM
      const pageData = await page.evaluate(() => {
        // Имя профиля
        const fullNameElement = document.querySelector('header h2');
        const fullName = fullNameElement ? fullNameElement.textContent || '' : '';

        // Биография
        const bioElement = document.querySelector('header > section > div:nth-child(3) > span');
        const biography = bioElement ? bioElement.textContent || '' : '';

        // Внешняя ссылка
        const externalLinkElement = document.querySelector('header a[href^="http"]');
        const externalUrl = externalLinkElement ? externalLinkElement.getAttribute('href') : null;

        // Определяем, верифицирован ли аккаунт (синяя галочка)
        const verifiedBadge = document.querySelector('header span[aria-label="Verified"]');
        const isVerified = !!verifiedBadge;

        // Статистика (подписчики, подписки, посты)
        const statsElements = document.querySelectorAll('header section ul li');
        const statsArray = Array.from(statsElements); // Преобразуем NodeList в Array для итерации

        let postsCount = 0, followersCount = 0, followingCount = 0;

        if (statsArray.length >= 3) {
          const postsText = statsArray[0].textContent || '';
          const followersText = statsArray[1].textContent || '';
          const followingText = statsArray[2].textContent || '';

          // Функция для парсинга числа из строки с учетом K, M (тысяч, миллионов)
          const parseCount = (text) => {
            if (!text) return 0;

            text = text.toLowerCase();
            if (text.includes('k')) {
              return parseFloat(text.replace(/[^0-9.]/g, '')) * 1000;
            } else if (text.includes('m')) {
              return parseFloat(text.replace(/[^0-9.]/g, '')) * 1000000;
            } else {
              return parseInt(text.replace(/\D/g, '')) || 0;
            }
          };

          postsCount = parseCount(postsText);
          followersCount = parseCount(followersText);
          followingCount = parseCount(followingText);
        }

        // Проверка на приватность аккаунта
        const privateLabel = document.querySelector('h2 ~ div');
        const isPrivate = privateLabel ?
          privateLabel.textContent?.includes('Private') || false : false;

        // Поиск бизнес-категории (если есть)
        const categoryElement = document.querySelector('header a[href*="directory"]');
        const businessCategory = categoryElement ? categoryElement.textContent || null : null;

        // Поиск email в биографии
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
        const emailMatch = biography.match(emailRegex);
        const businessEmail = emailMatch ? emailMatch[0] : null;

        // Поиск телефона в биографии
        const phoneRegex = /\+?[\d\s()-]{7,}/;
        const phoneMatch = biography.match(phoneRegex);
        const businessPhoneNumber = phoneMatch ? phoneMatch[0] : null;

        return {
          fullName,
          biography,
          externalUrl,
          isVerified,
          postsCount,
          followersCount,
          followingCount,
          isPrivate,
          businessCategory,
          businessEmail,
          businessPhoneNumber,
        };
      });

      // Получаем URL аватарки
      const profilePicUrl = await page.evaluate(() => {
        const imgElement = document.querySelector('header img');
        return imgElement ? imgElement.getAttribute('src') : '';
      });

      // Определяем, является ли аккаунт бизнес-аккаунтом
      // Обычно это можно определить по наличию категории или контактной кнопки
      const isBusinessAccount = await page.evaluate(() => {
        const hasCategory = !!document.querySelector('a[href*="directory"]');
        const hasContactButton = !!document.querySelector('a[href^="mailto:"], a[href^="tel:"]');

        // Проверяем наличие кнопок с определенным текстом
        const buttons = Array.from(document.querySelectorAll('button'));
        const hasContactText = buttons.some(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('contact') || text.includes('email') || text.includes('message');
        });

        return hasCategory || hasContactButton || hasContactText;
      });

      return {
        username,
        userId: profileData?.mainEntityofPage?.identifier || '',
        fullName: pageData.fullName,
        followersCount: pageData.followersCount,
        followingCount: pageData.followingCount,
        postsCount: pageData.postsCount,
        isPrivate: pageData.isPrivate,
        isVerified: pageData.isVerified,
        biography: pageData.biography,
        externalUrl: pageData.externalUrl,
        profilePicUrl: profilePicUrl,
        businessEmail: pageData.businessEmail,
        businessPhoneNumber: pageData.businessPhoneNumber,
        isBusinessAccount: isBusinessAccount,
        businessCategory: pageData.businessCategory
      };
    } catch (error) {
      strapi.log.error('Error extracting profile data:', error);
      throw error;
    }
  },

  async saveProfile(profileData) {
    try {
      const now = new Date().toISOString();

      // Проверяем, существует ли уже профиль компании с таким Instagram username
      const existingProfiles = await strapi.entityService.findMany('api::company-profile.company-profile', {
        filters: { 'instagram.username': profileData.username }
      });

      // Формируем данные Instagram компонента
      const instagramData = {
        username: profileData.username,
        userId: profileData.userId,
        fullName: profileData.fullName,
        followersCount: profileData.followersCount,
        followingCount: profileData.followingCount,
        postsCount: profileData.postsCount,
        isPrivate: profileData.isPrivate,
        isVerified: profileData.isVerified,
        biography: profileData.biography,
        externalUrl: profileData.externalUrl,
        profilePicUrl: profileData.profilePicUrl,
        businessEmail: profileData.businessEmail,
        businessPhoneNumber: profileData.businessPhoneNumber,
        isBusinessAccount: profileData.isBusinessAccount,
        businessCategory: profileData.businessCategory,
        lastSynced: now
      };

      // Используем определенный тип
      const companyData: CompanyProfile = {
        // Заполняем основные данные компании из данных Instagram
        name: profileData.fullName || profileData.username,
        description: profileData.biography,
        website: profileData.externalUrl,
        email: profileData.businessEmail,
        phone: profileData.businessPhoneNumber,
        // Устанавливаем Instagram компонент
        instagram: instagramData,
        // Обновляем источники данных
        dataSources: {
          instagram: {
            lastSynced: now,
            username: profileData.username
          }
        },
        lastUpdated: now
      };

      if (existingProfiles && existingProfiles.length > 0) {
        // Важное изменение: используем `as any` для обхода типизации
        return await strapi.entityService.update('api::company-profile.company-profile', existingProfiles[0].id, {
          data: companyData as any
        });
      } else {
        // Важное изменение: используем `as any` для обхода типизации
        return await strapi.entityService.create('api::company-profile.company-profile', {
          data: companyData as any
        });
      }
    } catch (err) {
      strapi.log.error('Error saving company profile:', err);
      throw err;
    }
  },

  async syncProfileByUsername(username: string) {
    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      // Извлекаем данные профиля напрямую
      const profileDetails = await this.extractProfileDetails(browser, username);

      if (!profileDetails) {
        throw new Error(`Failed to fetch profile details for ${username}`);
      }

      // Сохраняем профиль
      const savedProfile = await this.saveProfile(profileDetails);

      return savedProfile;
    } catch (err) {
      strapi.log.error(`Error syncing profile ${username}:`, err);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
   // Изменен метод getProfileDetails на extractProfileDetails для большей ясности
  async extractProfileDetails(browser: Browser, username: string): Promise<InstagramProfile> {
    const page = await browser.newPage();
    try {
      // Установка User-Agent для имитации реального пользователя
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      // Переход на страницу профиля
      await page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Ожидаем загрузки данных профиля
      await page.waitForSelector('header section', { timeout: 10000 }).catch(() => {
        strapi.log.warn(`Could not find header section for profile ${username}`);
      });

      // Извлекаем данные профиля через page.evaluate
      const profileData = await page.evaluate(() => {
        // Имя профиля
        const fullNameEl = document.querySelector('header h2');
        const fullName = fullNameEl ? fullNameEl.textContent || '' : '';

        // Биография
        const bioEl = document.querySelector('header > section > div:nth-child(3) > span');
        const biography = bioEl ? bioEl.textContent || '' : '';

        // Внешняя ссылка
        const linkEl = document.querySelector('header a[href^="http"]');
        const externalUrl = linkEl ? linkEl.getAttribute('href') : null;

        // Проверка на верификацию аккаунта
        const verifiedBadge = document.querySelector('header span[aria-label="Verified"]');
        const isVerified = !!verifiedBadge;

        // Статистика (посты, подписчики, подписки)
        const statsElements = document.querySelectorAll('header section ul li');
        // Преобразуем NodeList в Array для итерации
        const statsArray = Array.from(statsElements);

        let postsCount = 0, followersCount = 0, followingCount = 0;

        if (statsArray.length >= 3) {
          const postsText = statsArray[0].textContent || '';
          const followersText = statsArray[1].textContent || '';
          const followingText = statsArray[2].textContent || '';

          // Разбор чисел из текста
          const parseCount = (text) => {
            if (text.includes('K')) {
              return parseFloat(text.replace('K', '')) * 1000;
            } else if (text.includes('M')) {
              return parseFloat(text.replace('M', '')) * 1000000;
            } else {
              return parseInt(text.replace(/[^0-9]/g, '')) || 0;
            }
          };

          postsCount = parseCount(postsText);
          followersCount = parseCount(followersText);
          followingCount = parseCount(followingText);
        }

        // Проверка на приватность аккаунта
        const isPrivate = document.body.textContent?.includes('This Account is Private') || false;

        // Поиск бизнес-категории (если есть)
        const categoryEl = document.querySelector('header a[href*="directory"]');
        const businessCategory = categoryEl ? categoryEl.textContent || null : null;

        // Поиск email в биографии
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
        const emailMatch = biography.match(emailRegex);
        const businessEmail = emailMatch ? emailMatch[0] : null;

        // Поиск телефона в биографии
        const phoneRegex = /\+?[\d\s()-]{7,}/;
        const phoneMatch = biography.match(phoneRegex);
        const businessPhoneNumber = phoneMatch ? phoneMatch[0] : null;

        // Определение бизнес-аккаунта
        const isBusinessAccount = !!document.querySelector('a[href*="directory"]') ||
                                !!document.querySelector('button[contains(text(), "Contact")]') ||
                                !!document.querySelector('button[contains(text(), "Email")]');

        return {
          fullName,
          biography,
          externalUrl,
          isVerified,
          postsCount,
          followersCount,
          followingCount,
          isPrivate,
          businessCategory,
          businessEmail,
          businessPhoneNumber,
          isBusinessAccount
        };
      });

      // Получаем URL аватарки
      const profilePicUrl = await page.evaluate(() => {
        const imgEl = document.querySelector('header img');
        return imgEl ? imgEl.getAttribute('src') || '' : '';
      });

      // ID пользователя (часто содержится в метаданных страницы)
      const userId = await page.evaluate(() => {
        // Поиск в скриптах страницы
        const scriptElements = document.querySelectorAll('script[type="text/javascript"]');
        // Преобразуем NodeList в Array для итерации
        const scripts = Array.from(scriptElements);

        for (const script of scripts) {
          const content = script.textContent || '';
          const match = content.match(/"user_id":"(\d+)"/);
          if (match && match[1]) return match[1];
        }
        return '';
      });

      // Формируем и возвращаем объект с данными профиля
      return {
        username: username,
        userId: userId,
        fullName: profileData.fullName,
        followersCount: profileData.followersCount,
        followingCount: profileData.followingCount,
        postsCount: profileData.postsCount,
        isPrivate: profileData.isPrivate,
        isVerified: profileData.isVerified,
        biography: profileData.biography,
        externalUrl: profileData.externalUrl,
        profilePicUrl: profilePicUrl,
        businessEmail: profileData.businessEmail,
        businessPhoneNumber: profileData.businessPhoneNumber,
        isBusinessAccount: profileData.isBusinessAccount,
        businessCategory: profileData.businessCategory
      };
    } catch (error) {
      strapi.log.error(`Error extracting profile details for ${username}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }
});
