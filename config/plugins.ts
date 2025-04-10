export default () => ({
  email: {
    config: {
      provider: 'sendmail',
      settings: {
        defaultFrom: 'no-reply@research.splat.pro',
        defaultReplyTo: 'no-reply@research.splat.pro',
      }
    },
  },
  'instagram-scraper': {
    enabled: true,
    resolve: './src/plugins/instagram-scraper'
  },
});
