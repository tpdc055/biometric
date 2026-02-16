import { createContext, useContext } from "react";

export type Language = "en" | "tpi"; // en = English, tpi = Tok Pisin

interface Translations {
  // Common
  ok: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  back: string;
  next: string;
  loading: string;

  // App Name
  appName: string;
  appSubtitle: string;

  // PIN Lock
  createPin: string;
  enterPin: string;
  confirmPin: string;
  pinInstructions: string;
  incorrectPin: string;

  // Dashboard
  dashboard: string;
  quickActions: string;
  recentRegistrations: string;
  totalCitizens: string;
  wards: string;
  villages: string;
  households: string;

  // Registration
  registerHousehold: string;
  registerCitizen: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  sex: string;
  male: string;
  female: string;
  dateOfBirth: string;
  age: string;
  phoneNumber: string;
  occupation: string;

  // Actions
  search: string;
  export: string;
  analytics: string;
  settings: string;
  help: string;

  // Footer
  contactUs: string;
  location: string;
  privacyNotice: string;
  allRightsReserved: string;
}

const translations: Record<Language, Translations> = {
  en: {
    ok: "OK",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    loading: "Loading...",

    appName: "Citizen Registry",
    appSubtitle: "Offline Registration System",

    createPin: "Create PIN",
    enterPin: "Enter PIN",
    confirmPin: "Confirm PIN",
    pinInstructions: "Set up a 4-6 digit PIN to protect your data",
    incorrectPin: "Incorrect PIN",

    dashboard: "Dashboard",
    quickActions: "Quick Actions",
    recentRegistrations: "Recent Registrations",
    totalCitizens: "Total Citizens",
    wards: "Wards",
    villages: "Villages",
    households: "Households",

    registerHousehold: "Register Household",
    registerCitizen: "Register Citizen",
    firstName: "First Name",
    lastName: "Last Name",
    otherNames: "Other Names",
    sex: "Sex",
    male: "Male",
    female: "Female",
    dateOfBirth: "Date of Birth",
    age: "Age",
    phoneNumber: "Phone Number",
    occupation: "Occupation",

    search: "Search Records",
    export: "Export & Sync",
    analytics: "Analytics",
    settings: "Settings",
    help: "Help",

    contactUs: "Contact Us",
    location: "Location",
    privacyNotice: "Privacy Notice",
    allRightsReserved: "All rights reserved",
  },
  tpi: {
    ok: "Orait",
    cancel: "Lusim",
    save: "Seiv",
    delete: "Rausim",
    edit: "Senisim",
    back: "Bek",
    next: "Neks",
    loading: "I stap redim...",

    appName: "Buk bilong Ol Manmeri",
    appSubtitle: "Sistem bilong Raitim Nem",

    createPin: "Wokim PIN",
    enterPin: "Putim PIN",
    confirmPin: "Strongim PIN",
    pinInstructions: "Putim 4-6 namba bilong lukautim ol samting bilong yu",
    incorrectPin: "PIN i no stret",

    dashboard: "Ples Bilong Wok",
    quickActions: "Kwik Wok",
    recentRegistrations: "Nupela Ol Nem",
    totalCitizens: "Olgeta Manmeri",
    wards: "Ol Wod",
    villages: "Ol Ples",
    households: "Ol Hauslain",

    registerHousehold: "Raitim Hauslain",
    registerCitizen: "Raitim Manmeri",
    firstName: "Nem Namba Wan",
    lastName: "Las Nem",
    otherNames: "Narapela Nem",
    sex: "Man o Meri",
    male: "Man",
    female: "Meri",
    dateOfBirth: "De Bilong Kamap",
    age: "Krismas",
    phoneNumber: "Namba Bilong Telefon",
    occupation: "Wok",

    search: "Painim Ol Rekod",
    export: "Eksport na Sync",
    analytics: "Ol Ripot",
    settings: "Ol Setim",
    help: "Helpim",

    contactUs: "Ringim Mipela",
    location: "Ples",
    privacyNotice: "Tok Bilong Lukaut",
    allRightsReserved: "Olgeta rait i stap",
  },
};

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key],
});

export function useTranslation() {
  const context = useContext(LanguageContext);
  return context;
}

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export { translations };
