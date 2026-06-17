import { mount } from './widget';

// Dev preview — point at your local CRM
mount('#root', {
  apiUrl: 'http://localhost:3000/api/public/pricing',
  locale: 'en',
  contactUrl: '/contact',
});
