export default () => ({
  email: {
    config: {
      provider: 'sendmail',
      settings: {
        defaultFrom: 'no-reply@research.splat.pro',
        defaultReplyTo: 'no-reply@research.splat.pro',
      }
    },
  }
});
