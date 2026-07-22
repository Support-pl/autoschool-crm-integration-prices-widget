import { mount } from "./widget";

// Dev preview — point at your local CRM
mount("#root", {
  apiUrl: "http://localhost:3000/api/public/pricing",
  locale: "en",
  contactUrl: "/contact",
  helpline: {
    pl: "Infolinia: +48 733 949 041",
    en: "Helpline: +48 733 949 041",
    ru: "Инфолиния: +48 733 949 041",
    uk: "Інфолінія: +48 733 949 041",
  },
});
