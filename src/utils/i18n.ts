export type LanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'kn'
  | 'ta'
  | 'mr'
  | 'bn'
  | 'pa'
  | 'gu'
  | 'ml';

export interface LanguageOption {
  code: LanguageCode;
  nativeLabel: string;
  englishName: string;
  fullLabel: string;
}

export const AGRIMED_LANG_STORAGE_KEY = 'agrimed_lang';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', nativeLabel: 'English', englishName: 'English', fullLabel: 'English' },
  { code: 'hi', nativeLabel: 'हिन्दी', englishName: 'Hindi', fullLabel: 'हिन्दी (Hindi)' },
  { code: 'te', nativeLabel: 'తెలుగు', englishName: 'Telugu', fullLabel: 'తెలుగు (Telugu)' },
  { code: 'kn', nativeLabel: 'ಕನ್ನಡ', englishName: 'Kannada', fullLabel: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ta', nativeLabel: 'தமிழ்', englishName: 'Tamil', fullLabel: 'தமிழ் (Tamil)' },
  { code: 'mr', nativeLabel: 'मराठी', englishName: 'Marathi', fullLabel: 'मराठी (Marathi)' },
  { code: 'bn', nativeLabel: 'বাংলা', englishName: 'Bengali', fullLabel: 'বাংলা (Bengali)' },
  { code: 'pa', nativeLabel: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', fullLabel: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'gu', nativeLabel: 'ગુજરાતી', englishName: 'Gujarati', fullLabel: 'ગુજરાતી (Gujarati)' },
  { code: 'ml', nativeLabel: 'മലയാളം', englishName: 'Malayalam', fullLabel: 'മലയാളം (Malayalam)' },
];

export function normalizeLanguageCode(input?: string | null): LanguageCode {
  if (!input || typeof input !== 'string') return 'en';
  const trimmed = input.trim().toLowerCase();
  const matched = LANGUAGE_OPTIONS.find(
    (opt) =>
      opt.code === trimmed ||
      opt.englishName.toLowerCase() === trimmed ||
      opt.nativeLabel.toLowerCase() === trimmed ||
      opt.fullLabel.toLowerCase() === trimmed
  );
  return matched ? matched.code : 'en';
}

export function getLanguageOption(input?: string | null): LanguageOption {
  const code = normalizeLanguageCode(input);
  return LANGUAGE_OPTIONS.find((opt) => opt.code === code) || LANGUAGE_OPTIONS[0];
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    return normalizeLanguageCode(window.localStorage.getItem(AGRIMED_LANG_STORAGE_KEY));
  } catch {
    return 'en';
  }
}

export function setStoredLanguage(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AGRIMED_LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage quota errors in restricted browsing contexts
  }
}

export interface LandingTranslations {
  brandSubline: string;
  regionPill: string;
  signIn: string;
  getStarted: string;
  openWorkspace: string;
  farmerRole: string;
  adminRole: string;
  languageTitle: string;
  authPrompt: string;
  heroBadgeDesktop: string;
  heroBadgeMobile: string;
  heroCropCount: string;
  heroTagline: string;
  heroDescription: string;
  ctaGetStarted: string;
  ctaAskAi: string;
  ctaTankMath: string;
  bulletTank: string;
  bulletOrganic: string;
  bulletPhi: string;
  suiteHeading: string;
  suiteSubheading: string;
  cards: {
    leafBadge: string;
    leafTitle: string;
    leafDesc: string;
    leafCta: string;
    tankBadge: string;
    tankTitle: string;
    tankDesc: string;
    tankCta: string;
    organicBadge: string;
    organicTitle: string;
    organicDesc: string;
    organicCta: string;
    advisoryBadge: string;
    advisoryTitle: string;
    advisoryDesc: string;
    advisoryCta: string;
  };
  presetsBadge: string;
  presetsDesc: string;
  cropNames: {
    Rice: string;
    Wheat: string;
    Chilli: string;
    Tomato: string;
    Cotton: string;
    Coffee: string;
  };
  telemetry: {
    cropsTitle: string;
    cropsSub: string;
    tankValue: string;
    tankTitle: string;
    tankSub: string;
    savedTitle: string;
    savedSub: string;
    safetyValue: string;
    safetyTitle: string;
    safetySub: string;
  };
  footerTagline: string;
  footerPrescriptions: string;
  footerCalibration: string;
}

export const LANDING_TRANSLATIONS: Record<LanguageCode, LandingTranslations> = {
  en: {
    brandSubline: 'Smart Crop Pathology & Precision Medicine Engine',
    regionPill: 'Indian & Global Agriculture',
    signIn: 'Sign In',
    getStarted: 'Get Started',
    openWorkspace: 'Open Workspace',
    farmerRole: 'Farmer',
    adminRole: 'Admin',
    languageTitle: 'Language',
    authPrompt: 'Sign in with your Google account to access diagnosis, chat, and spray calculations.',
    heroBadgeDesktop: 'Field-Tested for Indian & Global Conditions',
    heroBadgeMobile: '190+ Crops • Indian & Global',
    heroCropCount: '190+ Crops',
    heroTagline: 'Smart Crop Pathology & Medicine Advisor for Indian & Global Farmers',
    heroDescription:
      'Diagnose any crop disease, calculate exact 16L spray tank dosages, and get organic & chemical solutions in seconds.',
    ctaGetStarted: 'Get Started',
    ctaAskAi: 'Ask AI Agronomist',
    ctaTankMath: '16L Tank Math',
    bulletTank: 'Standard 16L Backpack Dilution',
    bulletOrganic: 'Residue-Free Organic Bio-Controls',
    bulletPhi: 'Pre-Harvest Interval (PHI) Safety',
    suiteHeading: 'Precision Diagnostics & Field Care Suite',
    suiteSubheading: 'Pathology • 16L Dosage • Organic Bio-Control • Advisory',
    cards: {
      leafBadge: '🔬 Leaf Pathology',
      leafTitle: 'Symptom & Photo Diagnosis',
      leafDesc: 'Identify Rice blast, Wheat stripe rust, and leaf spots with crop-specific symptom matching.',
      leafCta: 'Diagnose Crop Leaf',
      tankBadge: '💧 16L Tank Math',
      tankTitle: 'Precision Knapsack Dosage',
      tankDesc: 'Zero chemical overdosing with exact grams/ml calibrated per 16L tank for Vegetables & Grains.',
      tankCta: 'Open Tank Calculator',
      organicBadge: '🌿 Bio-Control & PHI',
      organicTitle: 'Organic & Harvest Safety',
      organicDesc: 'Neem-based Trichoderma bio-controls and Pre-Harvest Interval (PHI) alerts for clean produce.',
      organicCta: 'Diagnose Tomato & Chilli',
      advisoryBadge: '👨‍🔬 Field Advisory',
      advisoryTitle: 'AI Agronomist Guidance',
      advisoryDesc: '24/7 verified CIBRC & ICAR guidance for Spices, Cotton, Mango, and regional field conditions.',
      advisoryCta: 'Ask AI Agronomist',
    },
    presetsBadge: 'Instant Quick-Launch Presets',
    presetsDesc: 'Click any crop to jump directly into its diagnosis:',
    cropNames: {
      Rice: 'Rice',
      Wheat: 'Wheat',
      Chilli: 'Chilli',
      Tomato: 'Tomato',
      Cotton: 'Cotton',
      Coffee: 'Coffee',
    },
    telemetry: {
      cropsTitle: 'Global & Indian Crops',
      cropsSub: 'All categories supported',
      tankValue: '16 Liters',
      tankTitle: 'Backpack Tank Math',
      tankSub: 'Standard Indian knapsack',
      savedTitle: 'Consultations Saved',
      savedSub: 'Verified crop history',
      safetyValue: '0% Overdose',
      safetyTitle: 'Harvest PHI Safety',
      safetySub: 'Zero toxic residues',
    },
    footerTagline: 'Smart Crop Pathology & Medicine Advisor for Indian & Global Farmers',
    footerPrescriptions: 'Field Prescriptions',
    footerCalibration: 'Standard 16L Knapsack Sprayer Calibration',
  },
  hi: {
    brandSubline: 'स्मार्ट फसल रोग विज्ञान एवं सटीक कृषि औषधि इंजन',
    regionPill: 'भारतीय एवं वैश्विक कृषि',
    signIn: 'साइन इन',
    getStarted: 'शुरू करें',
    openWorkspace: 'वर्कस्पेस खोलें',
    farmerRole: 'किसान',
    adminRole: 'एडमिन',
    languageTitle: 'भाषा',
    authPrompt: 'फसल रोग पहचान, एआई सलाह और 16L स्प्रे गणना के लिए साइन इन करें।',
    heroBadgeDesktop: 'भारतीय एवं वैश्विक खेती के लिए परीक्षित',
    heroBadgeMobile: '190+ फसलें • भारत एवं विश्व',
    heroCropCount: '190+ फसलें',
    heroTagline: 'भारतीय और वैश्विक किसानों के लिए स्मार्ट फसल रोग एवं कृषि औषधि सलाहकार',
    heroDescription:
      'किसी भी फसल रोग की पहचान करें, 16 लीटर स्प्रे टैंक की सटीक मात्रा निकालें, और सेकंडों में जैविक व रासायनिक उपचार पाएं।',
    ctaGetStarted: 'शुरू करें',
    ctaAskAi: 'एआई कृषि विशेषज्ञ से पूछें',
    ctaTankMath: '16L टैंक गणना',
    bulletTank: 'मानक 16L पीठ पंप घोल गणना',
    bulletOrganic: 'अवशेष-मुक्त जैविक नियंत्रण',
    bulletPhi: 'कटाई पूर्व प्रतीक्षा अवधि (PHI) सुरक्षा',
    suiteHeading: 'सटीक फसल रोग जांच एवं खेत देखभाल सूट',
    suiteSubheading: 'रोग पहचान • 16L खुराक • जैविक उपचार • सलाह',
    cards: {
      leafBadge: '🔬 पत्ती रोग जांच',
      leafTitle: 'लक्षण और फोटो से पहचान',
      leafDesc: 'धान का झुलसा, गेहूं का पीला रतुआ और पत्तियों के धब्बों की सटीक पहचान करें।',
      leafCta: 'फसल पत्ती की जांच करें',
      tankBadge: '💧 16L टैंक गणित',
      tankTitle: 'सटीक स्प्रे पंप खुराक',
      tankDesc: 'सब्जियों और अनाजों के लिए प्रति 16 लीटर टैंक सही ग्राम/मिली मात्रा बिना ओवरडोज़ के।',
      tankCta: 'टैंक कैलकुलेटर खोलें',
      organicBadge: '🌿 जैविक एवं PHI सुरक्षा',
      organicTitle: 'जैविक और सुरक्षित कटाई',
      organicDesc: 'नीम-आधारित ट्राइकोडर्मा जैविक उपाय और सुरक्षित कटाई (PHI) चेतावनी।',
      organicCta: 'टमाटर और मिर्च जांचें',
      advisoryBadge: '👨‍🔬 खेत सलाह',
      advisoryTitle: 'एआई कृषि विशेषज्ञ मार्गदर्शन',
      advisoryDesc: 'मसालों, कपास, आम और क्षेत्रीय मौसम के लिए 24/7 प्रमाणित ICAR व CIBRC सलाह।',
      advisoryCta: 'एआई विशेषज्ञ से पूछें',
    },
    presetsBadge: 'तुरंत फसल जांच शॉर्टकट',
    presetsDesc: 'सीधे रोग जांच शुरू करने के लिए किसी भी फसल पर क्लिक करें:',
    cropNames: {
      Rice: 'धान (Rice)',
      Wheat: 'गेहूं (Wheat)',
      Chilli: 'मिर्च (Chilli)',
      Tomato: 'टमाटर (Tomato)',
      Cotton: 'कपास (Cotton)',
      Coffee: 'कॉफी (Coffee)',
    },
    telemetry: {
      cropsTitle: 'भारतीय व वैश्विक फसलें',
      cropsSub: 'सभी फसल श्रेणियां उपलब्ध',
      tankValue: '16 लीटर',
      tankTitle: 'स्प्रे टैंक गणना',
      tankSub: 'मानक भारतीय पीठ पंप',
      savedTitle: 'सहेजे गए परामर्श',
      savedSub: 'सुरक्षित फसल रिकॉर्ड',
      safetyValue: '0% ओवरडोज़',
      safetyTitle: 'कटाई PHI सुरक्षा',
      safetySub: 'रसायन-मुक्त सुरक्षित उपज',
    },
    footerTagline: 'भारतीय और वैश्विक किसानों के लिए स्मार्ट फसल रोग एवं औषधि सलाहकार',
    footerPrescriptions: 'खेत की दवा पर्ची',
    footerCalibration: 'मानक 16L स्प्रे पंप कैलिब्रेशन',
  },
  te: {
    brandSubline: 'స్మార్ట్ పంట వ్యాధి నిర్ధారణ & మందుల సలహా ఇంజిన్',
    regionPill: 'భారతీయ & గ్లోబల్ వ్యవసాయం',
    signIn: 'సైన్ ఇన్',
    getStarted: 'ప్రారంభించండి',
    openWorkspace: 'వర్క్‌స్పేస్ తెరవండి',
    farmerRole: 'రైతు',
    adminRole: 'అడ్మిన్',
    languageTitle: 'భాష',
    authPrompt: 'పంట వ్యాధి నిర్ధారణ, AI సలహా మరియు 16L స్ప్రే లెక్కల కోసం సైన్ ఇన్ చేయండి.',
    heroBadgeDesktop: 'భారతీయ & అంతర్జాతీయ పంటలకు పరీక్షించబడింది',
    heroBadgeMobile: '190+ పంటలు • భారతదేశం & ప్రపంచం',
    heroCropCount: '190+ పంటలు',
    heroTagline: 'భారతీయ మరియు ప్రపంచ రైతుల కోసం స్మార్ట్ పంట వ్యాధి & మందుల సలహాదారు',
    heroDescription:
      'ఏ పంట వ్యాధినైనా గుర్తించండి, ఖచ్చితమైన 16L స్ప్రే ట్యాంక్ మోతాదును లెక్కించండి మరియు సేంద్రీయ & రసాయన పరిష్కారాలను పొందండి.',
    ctaGetStarted: 'ప్రారంభించండి',
    ctaAskAi: 'AI వ్యవసాయ నిపుణుడిని అడగండి',
    ctaTankMath: '16L ట్యాంక్ లెక్కలు',
    bulletTank: 'ప్రామాణిక 16L బ్యాక్‌ప్యాక్ మోతాదు',
    bulletOrganic: 'అవశేషాలు లేని సేంద్రీయ నియంత్రణ',
    bulletPhi: 'కోత ముందు విరామ (PHI) భద్రత',
    suiteHeading: 'ఖచ్చితమైన పంట నిర్ధారణ & పొలం సంరక్షణ సూట్',
    suiteSubheading: 'వ్యాధి గుర్తింపు • 16L మోతాదు • సేంద్రీయ నియంత్రణ • సలహా',
    cards: {
      leafBadge: '🔬 ఆకు వ్యాధి పరీక్ష',
      leafTitle: 'లక్షణాలు & ఫోటో ద్వారా నిర్ధారణ',
      leafDesc: 'వరి అగ్గితెగులు, గోధుమ పసుపు తుప్పు మరియు ఆకు మచ్చలను సులభంగా గుర్తించండి.',
      leafCta: 'ఆకు వ్యాధిని పరీక్షించండి',
      tankBadge: '💧 16L ట్యాంక్ లెక్క',
      tankTitle: 'ఖచ్చితమైన స్ప్రేయర్ మోతాదు',
      tankDesc: 'కూరగాయలు & ధాన్యాలకు 16 లీటర్ల ట్యాంక్‌కు ఖచ్చితమైన గ్రాములు/మి.లీ మోతాదు.',
      tankCta: 'ట్యాంక్ క్యాలిక్యులేటర్ తెరవండి',
      organicBadge: '🌿 సేంద్రీయ & PHI భద్రత',
      organicTitle: 'సేంద్రీయ & పంట కోత భద్రత',
      organicDesc: 'వేప ఆధారిత ట్రైకోడెర్మా జీవ నియంత్రణ మరియు కోత ముందు జాగ్రత్త (PHI) హెచ్చరికలు.',
      organicCta: 'టమాటో & మిర్చి పరీక్షించండి',
      advisoryBadge: '👨‍🔬 పొలం సలహా',
      advisoryTitle: 'AI వ్యవసాయ నిపుణుల మార్గదర్శనం',
      advisoryDesc: 'సుగంధ ద్రవ్యాలు, పత్తి, మామిడి మరియు స్థానిక వాతావరణానికి 24/7 ICAR & CIBRC సలహా.',
      advisoryCta: 'AI నిపుణుడిని అడగండి',
    },
    presetsBadge: 'త్వరిత పంట నిర్ధారణ షార్ట్‌కట్‌లు',
    presetsDesc: 'వెంటనే వ్యాధి నిర్ధారణ ప్రారంభించడానికి పంటను ఎంచుకోండి:',
    cropNames: {
      Rice: 'వరి (Rice)',
      Wheat: 'గోధుమ (Wheat)',
      Chilli: 'మిర్చి (Chilli)',
      Tomato: 'టమాటో (Tomato)',
      Cotton: 'పత్తి (Cotton)',
      Coffee: 'కాఫీ (Coffee)',
    },
    telemetry: {
      cropsTitle: 'భారతీయ & గ్లోబల్ పంటలు',
      cropsSub: 'అన్ని పంట వర్గాలు అందుబాటులో',
      tankValue: '16 లీటర్లు',
      tankTitle: 'స్ప్రే ట్యాంక్ లెక్క',
      tankSub: 'ప్రామాణిక భారతీయ స్ప్రేయర్',
      savedTitle: 'సేవ్ చేసిన సలహాలు',
      savedSub: 'భద్రమైన పంట చరిత్ర',
      safetyValue: '0% అధిక మోతాదు',
      safetyTitle: 'పంట కోత PHI భద్రత',
      safetySub: 'విషపూరిత అవశేషాలు లేవు',
    },
    footerTagline: 'భారతీయ మరియు ప్రపంచ రైతుల కోసం స్మార్ట్ పంట వ్యాధి & మందుల సలహాదారు',
    footerPrescriptions: 'పొలం మందుల సూచనలు',
    footerCalibration: 'ప్రామాణిక 16L బ్యాక్‌ప్యాక్ స్ప్రేయర్ కొలత',
  },
  kn: {
    brandSubline: 'ಸ್ಮಾರ್ಟ್ ಬೆಳೆ ರೋಗಶಾಸ್ತ್ರ ಮತ್ತು ನಿಖರ ಔಷಧ ಸಲಹಾ ವ್ಯವಸ್ಥೆ',
    regionPill: 'ಭಾರತೀಯ ಮತ್ತು ಜಾಗತಿಕ ಕೃಷಿ',
    signIn: 'ಸೈನ್ ಇನ್',
    getStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    openWorkspace: 'ವರ್ಕ್‌ಸ್ಪೇಸ್ ತೆರೆಯಿರಿ',
    farmerRole: 'ರೈತ',
    adminRole: 'ನಿರ್ವಾಹಕ',
    languageTitle: 'ಭಾಷೆ',
    authPrompt: 'ಬೆಳೆ ರೋಗ ಪತ್ತೆ, AI ಸಲಹೆ ಮತ್ತು 16L ಸಿಂಪಡಣೆ ಲೆಕ್ಕಾಚಾರಕ್ಕಾಗಿ ಸೈನ್ ಇನ್ ಮಾಡಿ.',
    heroBadgeDesktop: 'ಭಾರತೀಯ ಮತ್ತು ಜಾಗತಿಕ ಕೃಷಿ ಪರಿಸ್ಥಿತಿಗಳಿಗೆ ಪರೀಕ್ಷಿತ',
    heroBadgeMobile: '190+ ಬೆಳೆಗಳು • ಭಾರತ ಮತ್ತು ವಿಶ್ವ',
    heroCropCount: '190+ ಬೆಳೆಗಳು',
    heroTagline: 'ಭಾರತೀಯ ಮತ್ತು ಜಾಗತಿಕ ರೈತರಿಗಾಗಿ ಸ್ಮಾರ್ಟ್ ಬೆಳೆ ರೋಗ ಮತ್ತು ಔಷಧ ಸಲಹೆಗಾರ',
    heroDescription:
      'ಯಾವುದೇ ಬೆಳೆ ರೋಗವನ್ನು ಪತ್ತೆ ಮಾಡಿ, 16L ಸಿಂಪಡಣೆ ಟ್ಯಾಂಕ್ ಪ್ರಮಾಣವನ್ನು ನಿಖರವಾಗಿ ಲೆಕ್ಕಹಾಕಿ ಮತ್ತು ಸಾವಯವ ಹಾಗೂ ರಾಸಾಯನಿಕ ಪರಿಹಾರಗಳನ್ನು ಪಡೆಯಿರಿ.',
    ctaGetStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    ctaAskAi: 'AI ಕೃಷಿ ತಜ್ಞರನ್ನು ಕೇಳಿ',
    ctaTankMath: '16L ಟ್ಯಾಂಕ್ ಲೆಕ್ಕ',
    bulletTank: 'ಪ್ರಮಾಣಿತ 16L ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್ ಪ್ರಮಾಣ',
    bulletOrganic: 'ಅವಶೇಷ ರಹಿತ ಸಾವಯವ ನಿಯಂತ್ರಣ',
    bulletPhi: 'ಕೊಯ್ಲು ಪೂರ್ವ ವಿರಾಮ (PHI) ಸುರಕ್ಷತೆ',
    suiteHeading: 'ನಿಖರ ಬೆಳೆ ರೋಗ ಪತ್ತೆ ಮತ್ತು ಕ್ಷೇತ್ರ ಆರೈಕೆ',
    suiteSubheading: 'ರೋಗ ಪತ್ತೆ • 16L ಪ್ರಮಾಣ • ಸಾವಯವ ನಿಯಂತ್ರಣ • ಸಲಹೆ',
    cards: {
      leafBadge: '🔬 ಎಲೆ ರೋಗ ಪತ್ತೆ',
      leafTitle: 'ಲಕ್ಷಣ ಮತ್ತು ಫೋಟೋ ಪರೀಕ್ಷೆ',
      leafDesc: 'ಭತ್ತದ ಬೆಂಕಿ ರೋಗ, ಗೋಧಿ ಹಳದಿ ತುಕ್ಕು ಮತ್ತು ಎಲೆ ಚುಕ್ಕೆ ರೋಗಗಳನ್ನು ಗುರುತಿಸಿ.',
      leafCta: 'ಬೆಳೆ ಎಲೆ ಪರೀಕ್ಷಿಸಿ',
      tankBadge: '💧 16L ಟ್ಯಾಂಕ್ ಲೆಕ್ಕ',
      tankTitle: 'ನಿಖರ ಸಿಂಪಡಣೆ ಪಂಪ್ ಪ್ರಮಾಣ',
      tankDesc: 'ತರಕಾರಿ ಮತ್ತು ಧಾನ್ಯಗಳಿಗೆ 16 ಲೀಟರ್ ಟ್ಯಾಂಕ್‌ಗೆ ನಿಖರ ಗ್ರಾಂ/ಮಿ.ಲೀ ಪ್ರಮಾಣ.',
      tankCta: 'ಟ್ಯಾಂಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಿರಿ',
      organicBadge: '🌿 ಸಾವಯವ ಮತ್ತು PHI ಸುರಕ್ಷತೆ',
      organicTitle: 'ಸಾವಯವ ಮತ್ತು ಕೊಯ್ಲು ಸುರಕ್ಷತೆ',
      organicDesc: 'ಬೇವು ಆಧಾರಿತ ಟ್ರೈಕೋಡರ್ಮಾ ಜೈವಿಕ ನಿಯಂತ್ರಣ ಮತ್ತು ಕೊಯ್ಲು ಪೂರ್ವ ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆಗಳು.',
      organicCta: 'ಟೊಮೆಟೊ ಮತ್ತು ಮೆಣಸಿನಕಾಯಿ ಪರೀಕ್ಷಿಸಿ',
      advisoryBadge: '👨‍🔬 ಕೃಷಿ ಸಲಹೆ',
      advisoryTitle: 'AI ಕೃಷಿ ತಜ್ಞರ ಮಾರ್ಗದರ್ಶನ',
      advisoryDesc: 'ಮಸಾಲೆಗಳು, ಹತ್ತಿ, ಮಾವು ಮತ್ತು ಸ್ಥಳೀಯ ಹವಾಮಾನಕ್ಕೆ 24/7 ಪ್ರಮಾಣೀಕೃತ ICAR ಸಲಹೆ.',
      advisoryCta: 'AI ತಜ್ಞರನ್ನು ಕೇಳಿ',
    },
    presetsBadge: 'ತ್ವರಿತ ಬೆಳೆ ಪರೀಕ್ಷಾ ಆಯ್ಕೆಗಳು',
    presetsDesc: 'ನೇರವಾಗಿ ರೋಗ ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಲು ಬೆಳೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ:',
    cropNames: {
      Rice: 'ಭತ್ತ (Rice)',
      Wheat: 'ಗೋಧಿ (Wheat)',
      Chilli: 'ಮೆಣಸಿನಕಾಯಿ (Chilli)',
      Tomato: 'ಟೊಮೆಟೊ (Tomato)',
      Cotton: 'ಹತ್ತಿ (Cotton)',
      Coffee: 'ಕಾಫಿ (Coffee)',
    },
    telemetry: {
      cropsTitle: 'ಭಾರತೀಯ ಮತ್ತು ಜಾಗತಿಕ ಬೆಳೆಗಳು',
      cropsSub: 'ಎಲ್ಲಾ ಬೆಳೆ ವರ್ಗಗಳು ಲಭ್ಯ',
      tankValue: '16 ಲೀಟರ್',
      tankTitle: 'ಟ್ಯಾಂಕ್ ಸಿಂಪಡಣೆ ಲೆಕ್ಕ',
      tankSub: 'ಪ್ರಮಾಣಿತ ಭಾರತೀಯ ಪಂಪ್',
      savedTitle: 'ಉಳಿಸಿದ ಸಲಹೆಗಳು',
      savedSub: 'ಭದ್ರಪಡಿಸಿದ ಬೆಳೆ ಇತಿಹಾಸ',
      safetyValue: '0% ಅಧಿಕ ಪ್ರಮಾಣ',
      safetyTitle: 'ಕೊಯ್ಲು PHI ಸುರಕ್ಷತೆ',
      safetySub: 'ವಿಷಕಾರಿ ಅವಶೇಷಗಳಿಲ್ಲ',
    },
    footerTagline: 'ಭಾರತೀಯ ಮತ್ತು ಜಾಗತಿಕ ರೈತರಿಗಾಗಿ ಸ್ಮಾರ್ಟ್ ಬೆಳೆ ರೋಗ ಮತ್ತು ಔಷಧ ಸಲಹೆಗಾರ',
    footerPrescriptions: 'ಕ್ಷೇತ್ರ ಔಷಧ ಸಲಹೆಗಳು',
    footerCalibration: 'ಪ್ರಮಾಣಿತ 16L ಸಿಂಪಡಣೆ ಪಂಪ್ ಮಾಪನಾಂಕ',
  },
  ta: {
    brandSubline: 'ஸ்மார்ட் பயிர் நோயியல் & துல்லிய மருந்து ஆலோசனை தளம்',
    regionPill: 'இந்திய & உலகளாவிய வேளாண்மை',
    signIn: 'உள்நுழைய',
    getStarted: 'தொடங்குங்கள்',
    openWorkspace: 'பணியிடத்தைத் திற',
    farmerRole: 'விவசாயி',
    adminRole: 'நிர்வாகி',
    languageTitle: 'மொழி',
    authPrompt: 'பயிர் நோய் கண்டறிதல், AI ஆலோசனை மற்றும் 16L தெளிப்பு அளவை அறிய உள்நுழையவும்.',
    heroBadgeDesktop: 'இந்திய & உலகளாவிய விவசாயத்திற்காக சோதிக்கப்பட்டது',
    heroBadgeMobile: '190+ பயிர்கள் • இந்தியா & உலகம்',
    heroCropCount: '190+ பயிர்கள்',
    heroTagline: 'இந்திய மற்றும் உலக விவசாயிகளுக்கான ஸ்மார்ட் பயிர் நோய் & மருந்து ஆலோசகர்',
    heroDescription:
      'எந்தப் பயிர் நோயையும் கண்டறிந்து, துல்லியமான 16L தெளிப்பு டேங்க் அளவைக் கணக்கிட்டு, இயற்கை மற்றும் இரசாயன தீர்வுகளை நொடிகளில் பெறுங்கள்.',
    ctaGetStarted: 'தொடங்குங்கள்',
    ctaAskAi: 'AI வேளாண் நிபுணரிடம் கேளுங்கள்',
    ctaTankMath: '16L டேங்க் கணக்கு',
    bulletTank: 'நிலையான 16L முதுகுப்பம்ப் அளவு',
    bulletOrganic: 'நஞ்சற்ற இயற்கை உயிரியல் கட்டுப்பாடு',
    bulletPhi: 'அறுவடைக்கு முந்தைய காத்திருப்பு (PHI) பாதுகாப்பு',
    suiteHeading: 'துல்லிய நோய் கண்டறிதல் & வயல் பராமரிப்பு',
    suiteSubheading: 'நோய் கண்டறிதல் • 16L அளவு • இயற்கை கட்டுப்பாடு • ஆலோசனை',
    cards: {
      leafBadge: '🔬 இலை நோயியல்',
      leafTitle: 'அறிகுறி & புகைப்பட ஆய்வு',
      leafDesc: 'நெல் குலைநோய், கோதுமை துரு நோய் மற்றும் இலைப் புள்ளிகளை துல்லியமாக கண்டறியவும்.',
      leafCta: 'பயிர் இலையை பரிசோதி',
      tankBadge: '💧 16L டேங்க் கணக்கு',
      tankTitle: 'துல்லிய தெளிப்பான் அளவு',
      tankDesc: 'காய்கறிகள் மற்றும் தானியங்களுக்கு 16 லிட்டர் டேங்கிற்கு சரியான கிராம்/மி.லி அளவு.',
      tankCta: 'டேங்க் கால்குலேட்டரைத் திற',
      organicBadge: '🌿 இயற்கை & PHI பாதுகாப்பு',
      organicTitle: 'இயற்கை & அறுவடை பாதுகாப்பு',
      organicDesc: 'வேம்பு அடிப்படையிலான டிரைக்கோடெர்மா உயிரியல் கட்டுப்பாடு மற்றும் PHI எச்சரிக்கைகள்.',
      organicCta: 'தக்காளி & மிளகாய் பரிசோதி',
      advisoryBadge: '👨‍🔬 வயல் ஆலோசனை',
      advisoryTitle: 'AI வேளாண் நிபுணர் வழிகாட்டுதல்',
      advisoryDesc: 'மசாலா, பருத்தி, மா மற்றும் உள்ளூர் சூழலுக்கு 24/7 ICAR & CIBRC ஆலோசனை.',
      advisoryCta: 'AI நிபுணரிடம் கேளுங்கள்',
    },
    presetsBadge: 'விரைவு பயிர் தேர்வுகள்',
    presetsDesc: 'உடனடியாக நோய் ஆய்வைத் தொடங்க எந்தப் பயிரையும் கிளிக் செய்யவும்:',
    cropNames: {
      Rice: 'நெல் (Rice)',
      Wheat: 'கோதுமை (Wheat)',
      Chilli: 'மிளகாய் (Chilli)',
      Tomato: 'தக்காளி (Tomato)',
      Cotton: 'பருத்தி (Cotton)',
      Coffee: 'காபி (Coffee)',
    },
    telemetry: {
      cropsTitle: 'இந்திய & உலகப் பயிர்கள்',
      cropsSub: 'அனைத்து பயிர் வகைகளும் உள்ளன',
      tankValue: '16 லிட்டர்',
      tankTitle: 'தெளிப்பு டேங்க் கணக்கு',
      tankSub: 'நிலையான இந்திய தெளிப்பான்',
      savedTitle: 'சேமிக்கப்பட்ட ஆலோசனைகள்',
      savedSub: 'பாதுகாப்பான பயிர் பதிவு',
      safetyValue: '0% அதிக அளவு',
      safetyTitle: 'அறுவடை PHI பாதுகாப்பு',
      safetySub: 'நச்சு எச்சங்கள் இல்லை',
    },
    footerTagline: 'இந்திய மற்றும் உலக விவசாயிகளுக்கான ஸ்மார்ட் பயிர் நோய் & மருந்து ஆலோசகர்',
    footerPrescriptions: 'வயல் மருந்து பரிந்துரைகள்',
    footerCalibration: 'நிலையான 16L தெளிப்பான் அளவீடு',
  },
  mr: {
    brandSubline: 'स्मार्ट पीक रोगशास्त्र आणि अचूक औषध सल्लागार प्रणाली',
    regionPill: 'भारतीय आणि जागतिक शेती',
    signIn: 'साइन इन',
    getStarted: 'सुरू करा',
    openWorkspace: 'वर्कस्पेस उघडा',
    farmerRole: 'शेतकरी',
    adminRole: 'अॅडमिन',
    languageTitle: 'भाषा',
    authPrompt: 'पीक रोग निदान, AI सल्ला आणि 16L फवारणी मापनासाठी साइन इन करा.',
    heroBadgeDesktop: 'भारतीय आणि जागतिक शेतीसाठी तपासलेले',
    heroBadgeMobile: '190+ पिके • भारत आणि जग',
    heroCropCount: '190+ पिके',
    heroTagline: 'भारतीय आणि जागतिक शेतकऱ्यांसाठी स्मार्ट पीक रोग व औषध सल्लागार',
    heroDescription:
      'कोणत्याही पीक रोगाचे अचूक निदान करा, 16L फवारणी पंपाचे प्रमाण काढा आणि काही सेकंदांत सेंद्रिय व रासायनिक उपाय मिळवा.',
    ctaGetStarted: 'सुरू करा',
    ctaAskAi: 'AI कृषी तज्ज्ञांना विचारा',
    ctaTankMath: '16L टँक गणित',
    bulletTank: 'मानक 16L पाठीवरील पंप प्रमाण',
    bulletOrganic: 'अवशेष-मुक्त सेंद्रिय जैविक उपाय',
    bulletPhi: 'कापणीपूर्व प्रतीक्षा कालावधी (PHI) सुरक्षा',
    suiteHeading: 'अचूक पीक निदान आणि शेत संरक्षण संच',
    suiteSubheading: 'रोग निदान • 16L प्रमाण • सेंद्रिय नियंत्रण • सल्ला',
    cards: {
      leafBadge: '🔬 पान रोग तपासणी',
      leafTitle: 'लक्षणे आणि फोटोद्वारे निदान',
      leafDesc: 'भात करपा, गहू पिवळा तांबेरा आणि पानांवरील ठिपक्यांची अचूक ओळख करा.',
      leafCta: 'पिकाचे पान तपासा',
      tankBadge: '💧 16L टँक गणित',
      tankTitle: 'अचूक फवारणी पंप प्रमाण',
      tankDesc: 'भाजीपाला आणि धान्यासाठी प्रति 16 लिटर पंपामागे अचूक ग्रॅम/मिली प्रमाण.',
      tankCta: 'टँक कॅल्क्युलेटर उघडा',
      organicBadge: '🌿 सेंद्रिय आणि PHI सुरक्षा',
      organicTitle: 'सेंद्रिय व कापणी सुरक्षा',
      organicDesc: 'कडुलिंब-आधारित ट्रायकोडर्मा जैविक नियंत्रण आणि कापणीपूर्वीची सुरक्षितता (PHI) सूचना.',
      organicCta: 'टोमॅटो आणि मिरची तपासा',
      advisoryBadge: '👨‍🔬 शेत सल्ला',
      advisoryTitle: 'AI कृषी तज्ज्ञ मार्गदर्शन',
      advisoryDesc: 'मसाले, कापूस, आंबा आणि स्थानिक हवामानासाठी 24/7 प्रमाणित ICAR व CIBRC सल्ला.',
      advisoryCta: 'AI तज्ज्ञांना विचारा',
    },
    presetsBadge: 'झटपट पीक निदान शॉर्टकट',
    presetsDesc: 'थेट रोग तपासणी सुरू करण्यासाठी कोणत्याही पिकावर क्लिक करा:',
    cropNames: {
      Rice: 'भात (Rice)',
      Wheat: 'गहू (Wheat)',
      Chilli: 'मिरची (Chilli)',
      Tomato: 'टोमॅटो (Tomato)',
      Cotton: 'कापूस (Cotton)',
      Coffee: 'कॉफी (Coffee)',
    },
    telemetry: {
      cropsTitle: 'भारतीय आणि जागतिक पिके',
      cropsSub: 'सर्व पीक प्रकार उपलब्ध',
      tankValue: '16 लिटर',
      tankTitle: 'फवारणी पंप गणित',
      tankSub: 'मानक भारतीय पाठीवरील पंप',
      savedTitle: 'जतन केलेले सल्ले',
      savedSub: 'सुरक्षित पीक इतिहास',
      safetyValue: '0% अतिमात्रा',
      safetyTitle: 'कापणी PHI सुरक्षा',
      safetySub: 'विषारी अवशेषांशिवाय पीक',
    },
    footerTagline: 'भारतीय आणि जागतिक शेतकऱ्यांसाठी स्मार्ट पीक रोग व औषध सल्लागार',
    footerPrescriptions: 'शेत औषध शिफारसी',
    footerCalibration: 'मानक 16L पाठीवरील पंप मापन',
  },
  bn: {
    brandSubline: 'স্মার্ট ফসল রোগ নির্ণয় ও সঠিক কৃষি ওষুধ পরামর্শ ইঞ্জিন',
    regionPill: 'ভারতীয় ও বৈশ্বিক কৃষি',
    signIn: 'সাইন ইন',
    getStarted: 'শুরু করুন',
    openWorkspace: 'ওয়ার্কস্পেস খুলুন',
    farmerRole: 'কৃষক',
    adminRole: 'অ্যাডমিন',
    languageTitle: 'ভাষা',
    authPrompt: 'ফসল রোগ নির্ণয়, এআই পরামর্শ এবং ১৬ লিটার স্প্রে হিসাবের জন্য সাইন ইন করুন।',
    heroBadgeDesktop: 'ভারতীয় ও বৈশ্বিক চাষের পরিবেশে পরীক্ষিত',
    heroBadgeMobile: '১৯০+ ফসল • ভারত ও বিশ্ব',
    heroCropCount: '১৯০+ ফসল',
    heroTagline: 'ভারতীয় ও বিশ্বজুড়ে কৃষকদের জন্য স্মার্ট ফসল রোগ ও ওষুধ পরামর্শদাতা',
    heroDescription:
      'যেকোনো ফসলের রোগ শনাক্ত করুন, ১৬ লিটার স্প্রে ট্যাঙ্কের সঠিক মাত্রা হিসাব করুন এবং মুহূর্তেই জৈব ও রাসায়নিক সমাধান পান।',
    ctaGetStarted: 'শুরু করুন',
    ctaAskAi: 'এআই কৃষি বিশেষজ্ঞকে জিজ্ঞাসা করুন',
    ctaTankMath: '১৬L ট্যাঙ্ক হিসাব',
    bulletTank: 'মানক ১৬L স্প্রে ট্যাঙ্ক মিশ্রণ',
    bulletOrganic: 'বিষমুক্ত জৈব ও বায়ো-কন্ট্রোল',
    bulletPhi: 'ফসল কাটার পূর্ববর্তী নিরাপত্তা (PHI)',
    suiteHeading: 'নির্ভুল রোগ নির্ণয় ও ক্ষেত পরিচর্যা স্যুট',
    suiteSubheading: 'রোগ নির্ণয় • ১৬L মাত্রা • জৈব নিয়ন্ত্রণ • পরামর্শ',
    cards: {
      leafBadge: '🔬 পাতার রোগ পরীক্ষা',
      leafTitle: 'লক্ষণ ও ছবি দ্বারা নির্ণয়',
      leafDesc: 'ধানের ব্লাস্ট, গমের হলুদ মরিচা ও পাতার দাগ রোগ নির্ভুলভাবে শনাক্ত করুন।',
      leafCta: 'ফসলের পাতা পরীক্ষা করুন',
      tankBadge: '💧 ১৬L ট্যাঙ্ক হিসাব',
      tankTitle: 'সঠিক স্প্রেয়ার ডোজ গণনা',
      tankDesc: 'সবজি ও শস্যের জন্য প্রতি ১৬ লিটার ট্যাঙ্কে সঠিক গ্রাম/মিলি পরিমাপ।',
      tankCta: 'ট্যাঙ্ক ক্যালকুলেটর খুলুন',
      organicBadge: '🌿 জৈব ও PHI নিরাপত্তা',
      organicTitle: 'জৈব ও ফসল কাটার নিরাপত্তা',
      organicDesc: 'নিম-ভিত্তিক ট্রাইকোডার্মা জৈব নিয়ন্ত্রণ ও ফসল কাটার নিরাপদ সময় (PHI) সতর্কতা।',
      organicCta: 'টমেটো ও মরিচ পরীক্ষা করুন',
      advisoryBadge: '👨‍🔬 মাঠ পর্যায়ের পরামর্শ',
      advisoryTitle: 'এআই কৃষি বিশেষজ্ঞের নির্দেশনা',
      advisoryDesc: 'মশলা, তুলা, আম ও আঞ্চলিক আবহাওয়ার জন্য ২৪/৭ স্বীকৃত ICAR ও CIBRC পরামর্শ।',
      advisoryCta: 'এআই বিশেষজ্ঞকে জিজ্ঞাসা করুন',
    },
    presetsBadge: 'তাৎক্ষণিক ফসল শর্টকাট',
    presetsDesc: 'সরাসরি রোগ নির্ণয় শুরু করতে যেকোনো ফসলে ক্লিক করুন:',
    cropNames: {
      Rice: 'ধান (Rice)',
      Wheat: 'গম (Wheat)',
      Chilli: 'মরিচ (Chilli)',
      Tomato: 'টমেটো (Tomato)',
      Cotton: 'তুলা (Cotton)',
      Coffee: 'কফি (Coffee)',
    },
    telemetry: {
      cropsTitle: 'ভারতীয় ও বৈশ্বিক ফসল',
      cropsSub: 'সব ধরনের ফসল অন্তর্ভুক্ত',
      tankValue: '১৬ লিটার',
      tankTitle: 'স্প্রে ট্যাঙ্ক হিসাব',
      tankSub: 'মানক ভারতীয় ন্যাপস্যাক স্প্রেয়ার',
      savedTitle: 'সংরক্ষিত পরামর্শ',
      savedSub: 'সুরক্ষিত ফসলের ইতিহাস',
      safetyValue: '০% অতিরিক্ত মাত্রা',
      safetyTitle: 'ফসল কাটার PHI নিরাপত্তা',
      safetySub: 'বিষাক্ত অবশিষ্টাংশ মুক্ত',
    },
    footerTagline: 'ভারতীয় ও বিশ্বজুড়ে কৃষকদের জন্য স্মার্ট ফসল রোগ ও ওষুধ পরামর্শদাতা',
    footerPrescriptions: 'মাঠ পর্যায়ের ওষুধ নির্দেশিকা',
    footerCalibration: 'মানক ১৬L স্প্রেয়ার পরিমাপ',
  },
  pa: {
    brandSubline: 'ਸਮਾਰਟ ਫ਼ਸਲ ਰੋਗ ਵਿਗਿਆਨ ਅਤੇ ਸਹੀ ਦਵਾਈ ਸਲਾਹ ਇੰਜਣ',
    regionPill: 'ਭਾਰਤੀ ਅਤੇ ਵਿਸ਼ਵ ਖੇਤੀਬਾੜੀ',
    signIn: 'ਸਾਈਨ ਇਨ',
    getStarted: 'ਸ਼ੁਰੂ ਕਰੋ',
    openWorkspace: 'ਵਰਕਸਪੇਸ ਖੋਲ੍ਹੋ',
    farmerRole: 'ਕਿਸਾਨ',
    adminRole: 'ਐਡਮਿਨ',
    languageTitle: 'ਭਾਸ਼ਾ',
    authPrompt: 'ਫ਼ਸਲ ਰੋਗ ਪਛਾਣ, AI ਸਲਾਹ ਅਤੇ 16L ਸਪਰੇਅ ਹਿਸਾਬ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ।',
    heroBadgeDesktop: 'ਭਾਰਤੀ ਅਤੇ ਵਿਸ਼ਵ ਖੇਤੀ ਹਾਲਾਤਾਂ ਲਈ ਪਰਖਿਆ',
    heroBadgeMobile: '190+ ਫ਼ਸਲਾਂ • ਭਾਰਤ ਅਤੇ ਵਿਸ਼ਵ',
    heroCropCount: '190+ ਫ਼ਸਲਾਂ',
    heroTagline: 'ਭਾਰਤੀ ਅਤੇ ਵਿਸ਼ਵ ਕਿਸਾਨਾਂ ਲਈ ਸਮਾਰਟ ਫ਼ਸਲ ਰੋਗ ਅਤੇ ਦਵਾਈ ਸਲਾਹਕਾਰ',
    heroDescription:
      'ਕਿਸੇ ਵੀ ਫ਼ਸਲ ਦੇ ਰੋਗ ਦੀ ਪਛਾਣ ਕਰੋ, 16 ਲੀਟਰ ਸਪਰੇਅ ਟੈਂਕੀ ਦੀ ਸਹੀ ਮਾਤਰਾ ਕੱਢੋ ਅਤੇ ਜੈਵਿਕ ਤੇ ਰਸਾਇਣਕ ਹੱਲ ਤੁਰੰਤ ਪ੍ਰਾਪਤ ਕਰੋ।',
    ctaGetStarted: 'ਸ਼ੁਰੂ ਕਰੋ',
    ctaAskAi: 'AI ਖੇਤੀ ਮਾਹਿਰ ਨੂੰ ਪੁੱਛੋ',
    ctaTankMath: '16L ਟੈਂਕੀ ਹਿਸਾਬ',
    bulletTank: 'ਮਿਆਰੀ 16L ਪਿੱਠੂ ਪੰਪ ਮਾਤਰਾ',
    bulletOrganic: 'ਜ਼ਹਿਰ-ਮੁਕਤ ਜੈਵਿਕ ਕੰਟਰੋਲ',
    bulletPhi: 'ਵਾਢੀ ਤੋਂ ਪਹਿਲਾਂ ਸੁਰੱਖਿਆ (PHI)',
    suiteHeading: 'ਸਟੀਕ ਫ਼ਸਲ ਰੋਗ ਜਾਂਚ ਅਤੇ ਖੇਤ ਸੰਭਾਲ',
    suiteSubheading: 'ਰੋਗ ਪਛਾਣ • 16L ਮਾਤਰਾ • ਜੈਵਿਕ ਹੱਲ • ਸਲਾਹ',
    cards: {
      leafBadge: '🔬 ਪੱਤਾ ਰੋਗ ਜਾਂਚ',
      leafTitle: 'ਲੱਛਣ ਅਤੇ ਫੋਟੋ ਨਾਲ ਪਛਾਣ',
      leafDesc: 'ਝੋਨੇ ਦਾ ਬਲਾਸਟ, ਕਣਕ ਦੀ ਪੀਲੀ ਕੁੰਗੀ ਅਤੇ ਪੱਤਿਆਂ ਦੇ ਧੱਬਿਆਂ ਦੀ ਸਹੀ ਪਛਾਣ ਕਰੋ।',
      leafCta: 'ਫ਼ਸਲ ਦਾ ਪੱਤਾ ਜਾਂਚੋ',
      tankBadge: '💧 16L ਟੈਂਕੀ ਹਿਸਾਬ',
      tankTitle: 'ਸਟੀਕ ਸਪਰੇਅ ਪੰਪ ਖੁਰਾਕ',
      tankDesc: 'ਸਬਜ਼ੀਆਂ ਅਤੇ ਅਨਾਜਾਂ ਲਈ ਪ੍ਰਤੀ 16 ਲੀਟਰ ਟੈਂਕੀ ਸਹੀ ਗ੍ਰਾਮ/ਮਿ.ਲੀ ਮਾਤਰਾ।',
      tankCta: 'ਟੈਂਕੀ ਕੈਲਕੁਲੇਟਰ ਖੋਲ੍ਹੋ',
      organicBadge: '🌿 ਜੈਵਿਕ ਅਤੇ PHI ਸੁਰੱਖਿਆ',
      organicTitle: 'ਜੈਵਿਕ ਅਤੇ ਵਾਢੀ ਸੁਰੱਖਿਆ',
      organicDesc: 'ਨਿੰਮ ਅਧਾਰਿਤ ਟ੍ਰਾਈਕੋਡਰਮਾ ਜੈਵਿਕ ਉਪਾਅ ਅਤੇ ਵਾਢੀ ਸੁਰੱਖਿਆ (PHI) ਚੇਤਾਵਨੀਆਂ।',
      organicCta: 'ਟਮਾਟਰ ਅਤੇ ਮਿਰਚ ਜਾਂਚੋ',
      advisoryBadge: '👨‍🔬 ਖੇਤ ਸਲਾਹ',
      advisoryTitle: 'AI ਖੇਤੀ ਮਾਹਿਰ ਮਾਰਗਦਰਸ਼ਨ',
      advisoryDesc: 'ਮਸਾਲਿਆਂ, ਨਰਮੇ, ਅੰਬ ਅਤੇ ਮੌਸਮ ਅਨੁਸਾਰ 24/7 ਪ੍ਰਮਾਣਿਤ ICAR ਅਤੇ CIBRC ਸਲਾਹ।',
      advisoryCta: 'AI ਮਾਹਿਰ ਨੂੰ ਪੁੱਛੋ',
    },
    presetsBadge: 'ਤੁਰੰਤ ਫ਼ਸਲ ਜਾਂਚ ਸ਼ਾਰਟਕੱਟ',
    presetsDesc: 'ਸਿੱਧੀ ਰੋਗ ਜਾਂਚ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਕਿਸੇ ਵੀ ਫ਼ਸਲ ਤੇ ਕਲਿੱਕ ਕਰੋ:',
    cropNames: {
      Rice: 'ਝੋਨਾ (Rice)',
      Wheat: 'ਕਣਕ (Wheat)',
      Chilli: 'ਮਿਰਚ (Chilli)',
      Tomato: 'ਟਮਾਟਰ (Tomato)',
      Cotton: 'ਨਰਮਾ (Cotton)',
      Coffee: 'ਕੌਫੀ (Coffee)',
    },
    telemetry: {
      cropsTitle: 'ਭਾਰਤੀ ਅਤੇ ਵਿਸ਼ਵ ਫ਼ਸਲਾਂ',
      cropsSub: 'ਸਾਰੀਆਂ ਫ਼ਸਲ ਸ਼੍ਰੇਣੀਆਂ ਸ਼ਾਮਲ',
      tankValue: '16 ਲੀਟਰ',
      tankTitle: 'ਸਪਰੇਅ ਟੈਂਕੀ ਹਿਸਾਬ',
      tankSub: 'ਮਿਆਰੀ ਭਾਰਤੀ ਪੰਪ',
      savedTitle: 'ਸੰਭਾਲੀਆਂ ਸਲਾਹਾਂ',
      savedSub: 'ਸੁਰੱਖਿਅਤ ਫ਼ਸਲ ਰਿਕਾਰਡ',
      safetyValue: '0% ਵਾਧੂ ਖੁਰਾਕ',
      safetyTitle: 'ਵਾਢੀ PHI ਸੁਰੱਖਿਆ',
      safetySub: 'ਜ਼ਹਿਰੀਲੇ ਅੰਸ਼ਾਂ ਤੋਂ ਮੁਕਤ',
    },
    footerTagline: 'ਭਾਰਤੀ ਅਤੇ ਵਿਸ਼ਵ ਕਿਸਾਨਾਂ ਲਈ ਸਮਾਰਟ ਫ਼ਸਲ ਰੋਗ ਅਤੇ ਦਵਾਈ ਸਲਾਹਕਾਰ',
    footerPrescriptions: 'ਖੇਤ ਦਵਾਈ ਪਰਚੀ',
    footerCalibration: 'ਮਿਆਰੀ 16L ਸਪਰੇਅ ਪੰਪ ਮਾਪ',
  },
  gu: {
    brandSubline: 'સ્માર્ટ પાક રોગશાસ્ત્ર અને સચોટ કૃષિ દવા સલાહ એન્જિન',
    regionPill: 'ભારતીય અને વૈશ્વિક કૃષિ',
    signIn: 'સાઇન ઇન',
    getStarted: 'શરૂ કરો',
    openWorkspace: 'વર્કસ્પેસ ખોલો',
    farmerRole: 'ખેડૂત',
    adminRole: 'એડમિન',
    languageTitle: 'ભાષા',
    authPrompt: 'પાક રોગ નિદાન, AI સલાહ અને 16L સ્પ્રે ગણતરી માટે સાઇન ઇન કરો.',
    heroBadgeDesktop: 'ભારતીય અને વૈશ્વિક ખેતી માટે ચકાસાયેલ',
    heroBadgeMobile: '190+ પાકો • ભારત અને વિશ્વ',
    heroCropCount: '190+ પાકો',
    heroTagline: 'ભારતીય અને વૈશ્વિક ખેડૂતો માટે સ્માર્ટ પાક રોગ અને દવા સલાહકાર',
    heroDescription:
      'કોઈપણ પાકના રોગનું નિદાન કરો, 16L સ્પ્રે ટાંકીનું સચોટ માપ ગણો અને સેકન્ડોમાં ઓર્ગેનિક તથા રાસાયણિક ઉકેલ મેળવો.',
    ctaGetStarted: 'શરૂ કરો',
    ctaAskAi: 'AI કૃષિ નિષ્ણાતને પૂછો',
    ctaTankMath: '16L ટાંકી ગણતરી',
    bulletTank: 'માનક 16L પંપ દવા માપ',
    bulletOrganic: 'અવશેષ-મુક્ત ઓર્ગેનિક નિયંત્રણ',
    bulletPhi: 'લણણી પહેલાં સુરક્ષા અવધિ (PHI)',
    suiteHeading: 'સચોટ પાક નિદાન અને ખેતર સંભાળ સૂટ',
    suiteSubheading: 'રોગ નિદાન • 16L માપ • ઓર્ગેનિક ઉપાય • સલાહ',
    cards: {
      leafBadge: '🔬 પાન રોગ તપાસ',
      leafTitle: 'લક્ષણો અને ફોટો દ્વારા નિદાન',
      leafDesc: 'ડાંગરનો કરમો, ઘઉંનો પીળો ગેરુ અને પાનના ટપકાંના રોગો સચોટ ઓળખો.',
      leafCta: 'પાકના પાન તપાસો',
      tankBadge: '💧 16L ટાંકી ગણતરી',
      tankTitle: 'સચોટ સ્પ્રેયર ડોઝ માપ',
      tankDesc: 'શાકભાજી અને અનાજ માટે પ્રતિ 16 લિટર ટાંકી સચોટ ગ્રામ/મિ.લિ માપ.',
      tankCta: 'ટાંકી કેલ્ક્યુલેટર ખોલો',
      organicBadge: '🌿 ઓર્ગેનિક અને PHI સુરક્ષા',
      organicTitle: 'ઓર્ગેનિક અને લણણી સુરક્ષા',
      organicDesc: 'લીમડા આધારિત ટ્રાઇકોડર્મા જૈવિક ઉપાયો અને લણણી સુરક્ષા (PHI) ચેતવણી.',
      organicCta: 'ટામેટા અને મરચા તપાસો',
      advisoryBadge: '👨‍🔬 ખેતી સલાહ',
      advisoryTitle: 'AI કૃષિ નિષ્ણાત માર્ગદર્શન',
      advisoryDesc: 'મસાલા, કપાસ, કેરી અને સ્થાનિક પરિસ્થિતિ માટે 24/7 પ્રમાણિત ICAR અને CIBRC સલાહ.',
      advisoryCta: 'AI નિષ્ણાતને પૂછો',
    },
    presetsBadge: 'ઝડપી પાક પસંદગી શૉર્ટકટ',
    presetsDesc: 'સીધું રોગ નિદાન શરૂ કરવા કોઈપણ પાક પર ક્લિક કરો:',
    cropNames: {
      Rice: 'ડાંગર (Rice)',
      Wheat: 'ઘઉં (Wheat)',
      Chilli: 'મરચા (Chilli)',
      Tomato: 'ટામેટા (Tomato)',
      Cotton: 'કપાસ (Cotton)',
      Coffee: 'કોફી (Coffee)',
    },
    telemetry: {
      cropsTitle: 'ભારતીય અને વૈશ્વિક પાકો',
      cropsSub: 'તમામ પાક શ્રેણીઓ ઉપલબ્ધ',
      tankValue: '16 લિટર',
      tankTitle: 'સ્પ્રે ટાંકી ગણતરી',
      tankSub: 'માનક ભારતીય પંપ',
      savedTitle: 'સાચવેલ સલાહો',
      savedSub: 'સુરક્ષિત પાક ઇતિહાસ',
      safetyValue: '0% વધુ ડોઝ',
      safetyTitle: 'લણણી PHI સુરક્ષા',
      safetySub: 'ઝેરી અવશેષોથી મુક્ત',
    },
    footerTagline: 'ભારતીય અને વૈશ્વિક ખેડૂતો માટે સ્માર્ટ પાક રોગ અને દવા સલાહકાર',
    footerPrescriptions: 'ખેતર દવા ભલામણો',
    footerCalibration: 'માનક 16L સ્પ્રેયર માપ',
  },
  ml: {
    brandSubline: 'സ്മാർട്ട് വിള രോഗനിർണ്ണയ & കൃത്യമായ മരുന്ന് ഉപദേശ എഞ്ചിൻ',
    regionPill: 'ഇന്ത്യൻ & ആഗോള കൃഷി',
    signIn: 'സൈൻ ഇൻ',
    getStarted: 'ആരംഭിക്കുക',
    openWorkspace: 'വർക്ക്‌സ്‌പേസ് തുറക്കുക',
    farmerRole: 'കർഷകൻ',
    adminRole: 'അഡ്മിൻ',
    languageTitle: 'ഭാഷ',
    authPrompt: 'വിള രോഗനിർണ്ണയം, AI ഉപദേശം, 16L സ്പ്രേ അളവ് എന്നിവയ്ക്കായി സൈൻ ഇൻ ചെയ്യുക.',
    heroBadgeDesktop: 'ഇന്ത്യൻ & ആഗോള കാർഷിക സാഹചര്യങ്ങളിൽ പരീക്ഷിച്ചത്',
    heroBadgeMobile: '190+ വിളകൾ • ഇന്ത്യ & ലോകം',
    heroCropCount: '190+ വിളകൾ',
    heroTagline: 'ഇന്ത്യൻ & ആഗോള കർഷകർക്കായുള്ള സ്മാർട്ട് വിള രോഗ & മരുന്ന് ഉപദേശകൻ',
    heroDescription:
      'ഏത് വിള രോഗവും തിരിച്ചറിയുക, 16L സ്പ്രേ ടാങ്ക് അളവ് കൃത്യമായി കണക്കാക്കുക, ജൈവ-രാസ പരിഹാരങ്ങൾ നിമിഷങ്ങൾക്കുള്ളിൽ നേടുക.',
    ctaGetStarted: 'ആരംഭിക്കുക',
    ctaAskAi: 'AI കാർഷിക വിദഗ്ദ്ധനോട് ചോദിക്കുക',
    ctaTankMath: '16L ടാങ്ക് കണക്ക്',
    bulletTank: 'സാധാരണ 16L ബാക്ക്പാക്ക് അളവ്',
    bulletOrganic: 'വിഷരഹിത ജൈവ നിയന്ത്രണം',
    bulletPhi: 'വിളവെടുപ്പിന് മുമ്പുള്ള സുരക്ഷാ കാലയളവ് (PHI)',
    suiteHeading: 'കൃത്യമായ വിള രോഗനിർണ്ണയവും കൃഷി സംരക്ഷണവും',
    suiteSubheading: 'രോഗനിർണ്ണയം • 16L അളവ് • ജൈവ നിയന്ത്രണം • ഉപദേശം',
    cards: {
      leafBadge: '🔬 ഇല രോഗ പരിശോധന',
      leafTitle: 'ലക്ഷണങ്ങളും ഫോട്ടോയും വഴി നിർണ്ണയം',
      leafDesc: 'നെല്ലിലെ കുലവാട്ടം, ഗോതമ്പിലെ തുരുമ്പ് രോഗം, ഇലപ്പുള്ളി രോഗങ്ങൾ എന്നിവ തിരിച്ചറിയുക.',
      leafCta: 'വിള ഇല പരിശോധിക്കുക',
      tankBadge: '💧 16L ടാങ്ക് കണക്ക്',
      tankTitle: 'കൃത്യമായ സ്പ്രേയർ അളവ്',
      tankDesc: 'പച്ചക്കറികൾക്കും ധാന്യങ്ങൾക്കും 16 ലിറ്റർ ടാങ്കിന് കൃത്യമായ ഗ്രാം/മി.ലി അളവ്.',
      tankCta: 'ടാങ്ക് കാൽക്കുലേറ്റർ തുറക്കുക',
      organicBadge: '🌿 ജൈവ & PHI സുരക്ഷ',
      organicTitle: 'ജൈവ & വിളവെടുപ്പ് സുരക്ഷ',
      organicDesc: 'വേപ്പ് അധിഷ്ഠിത ട്രൈക്കോഡെർമ ജൈവ നിയന്ത്രണവും PHI സുരക്ഷാ മുന്നറിയിപ്പുകളും.',
      organicCta: 'തക്കാളി & മുളക് പരിശോധിക്കുക',
      advisoryBadge: '👨‍🔬 കൃഷി ഉപദേശം',
      advisoryTitle: 'AI കാർഷിക വിദഗ്ദ്ധ മാർഗ്ഗനിർദ്ദേശം',
      advisoryDesc: 'സുഗന്ധവ്യഞ്ജനങ്ങൾ, പരുത്തി, മാവ് എന്നിവയ്ക്ക് 24/7 അംഗീകൃത ICAR & CIBRC ഉപദേശം.',
      advisoryCta: 'AI വിദഗ്ദ്ധനോട് ചോദിക്കുക',
    },
    presetsBadge: 'വേഗത്തിലുള്ള വിള തിരഞ്ഞെടുക്കലുകൾ',
    presetsDesc: 'രോഗനിർണ്ണയം നേരിട്ട് തുടങ്ങാൻ ഏതെങ്കിലും വിളയിൽ ക്ലിക്ക് ചെയ്യുക:',
    cropNames: {
      Rice: 'നെല്ല് (Rice)',
      Wheat: 'ഗോതമ്പ് (Wheat)',
      Chilli: 'മുളക് (Chilli)',
      Tomato: 'തക്കാളി (Tomato)',
      Cotton: 'പരുത്തി (Cotton)',
      Coffee: 'കാപ്പി (Coffee)',
    },
    telemetry: {
      cropsTitle: 'ഇന്ത്യൻ & ആഗോള വിളകൾ',
      cropsSub: 'എല്ലാ വിള വിഭാഗങ്ങളും ലഭ്യം',
      tankValue: '16 ലിറ്റർ',
      tankTitle: 'സ്പ്രേ ടാങ്ക് കണക്ക്',
      tankSub: 'സാധാരണ ഇന്ത്യൻ സ്പ്രേയർ',
      savedTitle: 'സേവ് ചെയ്ത ഉപദേശങ്ങൾ',
      savedSub: 'സുരക്ഷിതമായ വിള ചരിത്രം',
      safetyValue: '0% അമിത അളവ്',
      safetyTitle: 'വിളവെടുപ്പ് PHI സുരക്ഷ',
      safetySub: 'വിഷാംശ അവശിഷ്ടങ്ങളില്ല',
    },
    footerTagline: 'ഇന്ത്യൻ & ആഗോള കർഷകർക്കായുള്ള സ്മാർട്ട് വിള രോഗ & മരുന്ന് ഉപദേശകൻ',
    footerPrescriptions: 'കൃഷിയിട മരുന്ന് നിർദ്ദേശങ്ങൾ',
    footerCalibration: 'സാധാരണ 16L സ്പ്രേയർ അളവുകോൽ',
  },
};
