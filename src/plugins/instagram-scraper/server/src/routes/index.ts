const routes = [
  {
    method: 'POST',
    path: '/search-profiles',
    handler: 'instagramParser.searchProfiles',
    config: {
      policies: [],
      description: 'Search Instagram profiles based on keywords and hashtags',
      tag: {
        plugin: 'instagram-parser',
        name: 'Search Profiles',
      },
    },
  },
  {
    method: 'GET',
    path: '/sync-profile/:username',
    handler: 'instagramParser.syncProfileByUsername',
    config: {
      policies: [],
      description: 'Synchronize Instagram profile by username',
      tag: {
        plugin: 'instagram-parser',
        name: 'Sync Profile',
      },
    },
  },
  {
    method: 'GET',
    path: '/company-profiles',
    handler: 'instagramParser.getCompanyProfiles',
    config: {
      policies: [],
      description: 'Get company profiles with optional source filtering',
      tag: {
        plugin: 'instagram-parser',
        name: 'Company Profiles',
      },
    },
  },

  {
    method: 'GET',
    path: '/tasks',
    handler: 'taskManager.getTasks',
    config: {
      policies: [],
      description: 'Get all parsing tasks',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
  {
    method: 'GET',
    path: '/tasks/:id',
    handler: 'taskManager.getTask',
    config: {
      policies: [],
      description: 'Get a parsing task by ID',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
  {
    method: 'POST',
    path: '/tasks',
    handler: 'taskManager.createTask',
    config: {
      policies: [],
      description: 'Create a new parsing task',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
  {
    method: 'PUT',
    path: '/tasks/:id',
    handler: 'taskManager.updateTask',
    config: {
      policies: [],
      description: 'Update a parsing task',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
  {
    method: 'DELETE',
    path: '/tasks/:id',
    handler: 'taskManager.deleteTask',
    config: {
      policies: [],
      description: 'Delete a parsing task',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
  {
    method: 'POST',
    path: '/tasks/:id/run',
    handler: 'taskManager.runTaskNow',
    config: {
      policies: [],
      description: 'Run a parsing task immediately',
      tag: {
        plugin: 'instagram-parser',
        name: 'Task Manager',
      },
    },
  },
];

export default routes;
