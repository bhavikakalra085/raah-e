// src/i18n/I18nProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const I18nContext = createContext(null);

const TRANSLATIONS = {
  en: {
    // Header
    header: {
      logoText: "Raahe",
      tagline: "Apna Punjab, Apna Safar",
      nav: {
        home: "Home",
        user: "User",
        driver: "Driver",
        admin: "Admin",
        womenSafety: "Women Safety",
        lostFound: "Lost & Found",
        about: "About",
        login: "Login",
        logout: "Logout",
        changeMethod: "Change method",
      },
      langLabel: "Language",
    },

    // HomePage
    home: {
      heroTitle: "Raahe — Real-time Bus Tracking for Punjab",
      heroDesc:
        "🚍 Find routes, track live buses, and travel safer. Comprehensive portals for Users, Drivers, and Admins.",
      trackNow: "Track Your Bus Now",

      portals: {
        userTitle: "User Portal",
        userDesc: "Search routes, live tracking, SOS alerts, and seamless travel planning.",
        driverTitle: "Driver Portal",
        driverDesc: "Start, pause, and end rides while sharing live location with passengers.",
        adminTitle: "Admin Portal",
        adminDesc: "Manage users, drivers, routes, and monitor real-time activity.",
      },

      whyTitle: "Why Choose Raahe?",
      why: {
        realTimeTitle: "Real-time Tracking",
        realTimeDesc: "Live GPS tracking for accurate arrival times",
        secureTitle: "Safe & Secure",
        secureDesc: "SOS features and verified driver profiles",
        easyTitle: "Easy to Use",
        easyDesc: "Simple interface for all age groups",
      },
    },
    // In TRANSLATIONS.en:
about: {
    badge: "Built for Punjab commuters",
    title: "About Raahe",
    subtitle: "Real-time tracking that makes everyday bus travel simpler, safer, and more reliable.",
  
    stats: { cities: "Cities covered", routes: "Active routes", users: "Registered users", uptime: "System uptime" },
  
    why: {
      title: "Why we built Raahe",
      p1: "Public transport works best when riders can see what's happening in real time.",
      p2: "We created Raahe to reduce uncertainty—no guesswork, fewer missed buses, safer trips.",
      points: {
        safe: "Safer journeys with SOS and verified profiles",
        reliable: "Reliable timing with live GPS and ETAs",
        accessible: "Accessible to everyone with a simple interface"
      }
    },
  
    mission: {
      title: "Our mission",
      p1: "Empower Punjab’s commuters with transparent, real-time information and safety-first tools.",
      pillars: {
        safety: { title: "Safety", desc: "SOS shortcuts, trusted drivers, and privacy-aware design." },
        timeliness: { title: "Timeliness", desc: "Live location + ETA so you spend less time waiting." },
        community: { title: "Community", desc: "Designed for everyday riders, students, and families." }
      }
    },
  
    features: {
      title: "What you can do with Raahe",
      subtitle: "Powerful features across passenger, driver, and admin portals.",
      items: {
        live:   { title: "Live Tracking", desc: "See buses move in real time with clear ETAs." },
        routes: { title: "Routes & Stops", desc: "Browse and search routes with stop-by-stop details." },
        alerts: { title: "Lost & Found", desc: "Register complaints for you lost items and let admins resolve it." },
        sos:    { title: "SOS & Safety", desc: "One-tap SOS and verified driver profiles." },
        portals:{ title: "Tailored Portals", desc: "Passengers, Drivers, & Admins each get focused tools." },
        admin:  { title: "Admin Controls", desc: "Manage routes, riders, drivers, and system health." }
      }
    },
  
    timeline: {
      title: "How we got here",
      items: {
        idea:   { title: "The Idea", desc: "We spoke to daily commuters and heard one theme: predictability matters." },
        pilot:  { title: "Pilot", desc: "We tested across a handful of Punjab routes and iterated with feedback." },
        launch: { title: "Launch", desc: "A stable release with portals for riders, drivers, and admins." }
      }
    },
  
    cta: {
      title: "Ready to ride with confidence?",
      desc: "Jump in and track your next bus—or start sharing your route as a driver.",
      buttons: { passenger: "I’m a Passenger", driver: "I’m a Driver" }
    }
  },
  
  
  
  },

  hi: {
    header: {
      logoText: "राहे",
      tagline: "अपना पंजाब, अपना सफर",
      nav: {
        home: "होम",
        user: "यूज़र",
        driver: "ड्राइवर",
        admin: "एडमिन",
        womenSafety: "महिला सुरक्षा",
        lostFound: "लॉस्ट & फाउंड",
        about: "अबाउट",
        login: "लॉगिन",
        logout: "लॉगआउट",
        changeMethod: "विधि बदलें",
      },
      langLabel: "भाषा",
    },

    home: {
      heroTitle: "राहे — पंजाब के लिए रियल-टाइम बस ट्रैकिंग",
      heroDesc:
        "🚍 रूट ढूँढें, लाइव बस ट्रैक करें और सुरक्षित यात्रा करें। यूज़र, ड्राइवर और एडमिन के लिए संपूर्ण पोर्टल।",
      trackNow: "अभी अपनी बस ट्रैक करें",

      portals: {
        userTitle: "यूज़र पोर्टल",
        userDesc: "रूट सर्च, लाइव ट्रैकिंग, SOS अलर्ट और आसान यात्रा योजना।",
        driverTitle: "ड्राइवर पोर्टल",
        driverDesc: "राइड शुरू/रोकें/समाप्त करें और यात्रियों के साथ लाइव लोकेशन शेयर करें।",
        adminTitle: "एडमिन पोर्टल",
        adminDesc: "यूज़र, ड्राइवर और रूट मैनेज करें तथा रियल-टाइम गतिविधि मॉनिटर करें।",
      },

      whyTitle: "राहे क्यों?",
      why: {
        realTimeTitle: "रियल-टाइम ट्रैकिंग",
        realTimeDesc: "सटीक आगमन समय के लिए लाइव GPS ट्रैकिंग",
        secureTitle: "सुरक्षित व भरोसेमंद",
        secureDesc: "SOS फीचर्स और वेरीफाइड ड्राइवर प्रोफ़ाइल",
        easyTitle: "आसान उपयोग",
        easyDesc: "हर उम्र के लिए सरल इंटरफ़ेस",
      },
    },
    // --- Add inside TRANSLATIONS.hi ---
about: {
    badge: "पंजाब के यात्रियों के लिए",
    title: "राहे के बारे में",
    subtitle: "रियल-टाइम ट्रैकिंग जो रोज़मर्रा की बस यात्रा को सरल, सुरक्षित और भरोसेमंद बनाती है।",
  
    stats: {
      cities: "कवर्ड शहर",
      routes: "सक्रिय रूट",
      users: "पंजीकृत उपयोगकर्ता",
      uptime: "सिस्टम अपटाइम",
    },
  
    why: {
      title: "हमने राहे क्यों बनाया",
      p1: "पब्लिक ट्रांसपोर्ट तब सबसे अच्छा काम करता है जब यात्रियों के पास रियल-टाइम जानकारी हो।",
      p2: "हमने राहे अनिश्चितता कम करने के लिए बनाया—कम अनुमान, कम मिस हुई बसें, ज़्यादा सुरक्षित सफ़र।",
      points: {
        safe: "SOS और सत्यापित प्रोफ़ाइल के साथ सुरक्षित यात्राएँ",
        reliable: "लाइव GPS और ETA के साथ भरोसेमंद समय",
        accessible: "हर किसी के लिए सरल इंटरफ़ेस",
      },
    },
  
    mission: {
      title: "हमारा उद्देश्य",
      p1: "पंजाब के यात्रियों को पारदर्शी, रियल-टाइम जानकारी और सुरक्षा-प्रथम टूल्स से सशक्त करना।",
      pillars: {
        safety: {
          title: "सुरक्षा",
          desc: "SOS शॉर्टकट, भरोसेमंद ड्राइवर और प्राइवेसी-सचेत डिज़ाइन।",
        },
        timeliness: {
          title: "समयबद्धता",
          desc: "लाइव लोकेशन + ETA ताकि इंतज़ार कम हो।",
        },
        community: {
          title: "समुदाय",
          desc: "दैनिक यात्रियों, छात्रों और परिवारों के लिए बनाया गया।",
        },
      },
    },
  
    features: {
      title: "राहे से आप क्या कर सकते हैं",
      subtitle: "पैसेंजर, ड्राइवर और एडमिन—तीनों के लिए शक्तिशाली फ़ीचर्स।",
      items: {
        live:   { title: "लाइव ट्रैकिंग", desc: "बसों को रियल-टाइम में देखें और स्पष्ट ETA पाएँ।" },
        routes: { title: "रूट व स्टॉप", desc: "स्टॉप-बाय-स्टॉप विवरण के साथ रूट ब्राउज़/सर्च करें।" },
        alerts: {
            title: "लॉस्ट एंड फाउंड",
            desc: "अपने खोए हुए सामान की शिकायत दर्ज करें और एडमिन से समाधान करवाएँ।",
          },
        sos:    { title: "SOS व सुरक्षा", desc: "वन-टैप SOS और सत्यापित ड्राइवर प्रोफ़ाइल।" },
        portals:{ title: "टेलर्ड पोर्टल", desc: "पैसेंजर, ड्राइवर और एडमिन के लिए अलग-अलग टूल्स।" },
        admin:  { title: "एडमिन कंट्रोल", desc: "रूट, यूज़र, ड्राइवर और सिस्टम हेल्थ मैनेज करें।" },
      },
    },
  
    timeline: {
      title: "हम यहाँ तक कैसे पहुँचे",
      items: {
        idea:   { title: "विचार", desc: "दैनिक यात्रियों से बात की—सब बोले, ‘प्रीडिक्टिबिलिटी ज़रूरी है’." },
        pilot:  { title: "पायलट", desc: "कुछ पंजाब रूट्स पर टेस्ट किया और फ़ीडबैक के साथ सुधार किए।" },
        launch: { title: "लॉन्च", desc: "पैसेंजर, ड्राइवर और एडमिन पोर्टल्स के साथ स्थिर रिलीज़।" },
      },
    },
  
    cta: {
      title: "आत्मविश्वास के साथ सफ़र के लिए तैयार?",
      desc: "अभी अपनी अगली बस ट्रैक करें—या ड्राइवर के रूप में अपना रूट साझा करना शुरू करें।",
      buttons: { passenger: "मैं पैसेंजर हूँ", driver: "मैं ड्राइवर हूँ" },
    },
  },
  
  },

  pa: {
    header: {
      logoText: "ਰਾਹੇ",
      tagline: "ਅਪਣਾ ਪੰਜਾਬ, ਅਪਣਾ ਸਫ਼ਰ",
      nav: {
        home: "ਘਰ",
        user: "ਯੂਜ਼ਰ",
        driver: "ਡਰਾਈਵਰ",
        admin: "ਐਡਮਿਨ",
        womenSafety: "ਮਹਿਲਾ ਸੁਰੱਖਿਆ",
        lostFound: "ਲਾਸਟ ਐਂਡ ਫਾਊਂਡ",
        about: "ਬਾਰੇ",
        login: "ਲੌਗਇਨ",
        logout: "ਲੌਗਆਉਟ",
        changeMethod: "ਤਰੀਕਾ ਬਦਲੋ",
      },
      langLabel: "ਭਾਸ਼ਾ",
    },

    home: {
      heroTitle: "ਰਾਹੇ — ਪੰਜਾਬ ਲਈ ਰੀਅਲ-ਟਾਈਮ ਬੱਸ ਟ੍ਰੈਕਿੰਗ",
      heroDesc:
        "🚍 ਰੂਟ ਲੱਭੋ, ਲਾਈਵ ਬੱਸ ਟ੍ਰੈਕ ਕਰੋ, ਤੇ ਸੁਰੱਖਿਅਤ ਯਾਤਰਾ ਕਰੋ। ਯੂਜ਼ਰ, ਡਰਾਈਵਰ ਅਤੇ ਐਡਮਿਨ ਲਈ ਪੂਰਨ ਪੋਰਟਲ।",
      trackNow: "ਹੁਣੇ ਆਪਣੀ ਬੱਸ ਟ੍ਰੈਕ ਕਰੋ",

      portals: {
        userTitle: "ਯੂਜ਼ਰ ਪੋਰਟਲ",
        userDesc: "ਰੂਟ ਖੋਜ, ਲਾਈਵ ਟ੍ਰੈਕਿੰਗ, SOS ਅਲਰਟ ਤੇ ਆਸਾਨ ਯਾਤਰਾ ਯੋਜਨਾ।",
        driverTitle: "ਡਰਾਈਵਰ ਪੋਰਟਲ",
        driverDesc: "ਰਾਈਡ ਸ਼ੁਰੂ/ਰੋਕੋ/ਖਤਮ ਕਰੋ ਤੇ ਯਾਤਰੀਆਂ ਨਾਲ ਲਾਈਵ ਲੋਕੇਸ਼ਨ ਸਾਂਝੀ ਕਰੋ।",
        adminTitle: "ਐਡਮਿਨ ਪੋਰਟਲ",
        adminDesc: "ਯੂਜ਼ਰ, ਡਰਾਈਵਰ, ਰੂਟ ਮੈਨੇਜ ਕਰੋ ਤੇ ਰੀਅਲ-ਟਾਈਮ ਗਤੀਵਿਧੀ ਦੀ ਨਿਗਰਾਨੀ ਕਰੋ।",
      },

      whyTitle: "ਰਾਹੇ ਕਿਉਂ?",
      why: {
        realTimeTitle: "ਰੀਅਲ-ਟਾਈਮ ਟ੍ਰੈਕਿੰਗ",
        realTimeDesc: "ਸਹੀ ਪਹੁੰਚ ਸਮੇਂ ਲਈ ਲਾਈਵ GPS ਟ੍ਰੈਕਿੰਗ",
        secureTitle: "ਸੁਰੱਖਿਅਤ ਅਤੇ ਭਰੋਸੇਯੋਗ",
        secureDesc: "SOS ਫੀਚਰ ਅਤੇ ਵੈਰੀਫਾਈਡ ਡਰਾਈਵਰ ਪ੍ਰੋਫ਼ਾਇਲ",
        easyTitle: "ਵਰਤੋਂ ਵਿੱਚ ਆਸਾਨ",
        easyDesc: "ਹਰ ਉਮਰ ਲਈ ਸੌਖਾ ਇੰਟਰਫੇਸ",
      },
    },
    // --- Add inside TRANSLATIONS.pa ---
about: {
    badge: "ਪੰਜਾਬ ਦੇ ਯਾਤਰੀਆਂ ਲਈ",
    title: "ਰਾਹੇ ਬਾਰੇ",
    subtitle: "ਰੀਅਲ-ਟਾਈਮ ਟ੍ਰੈਕਿੰਗ ਜੋ ਰੋਜ਼ਾਨਾ ਬੱਸ ਯਾਤਰਾ ਨੂੰ ਸੌਖਾ, ਸੁਰੱਖਿਅਤ ਤੇ ਭਰੋਸੇਯੋਗ ਬਣਾਂਦੀ ਹੈ।",
  
    stats: {
      cities: "ਜੁੜੇ ਸ਼ਹਿਰ",
      routes: "ਸਕ੍ਰਿਆ ਰੂਟ",
      users: "ਰਜਿਸਟਰਡ ਯੂਜ਼ਰ",
      uptime: "ਸਿਸਟਮ ਅਪਟਾਈਮ",
    },
  
    why: {
      title: "ਅਸੀਂ ਰਾਹੇ ਕਿਉਂ ਬਣਾਇਆ",
      p1: "ਜਨਤਕ ਆਵਾਜਾਈ ਤਦੋਂ ਵਧੀਆ ਕੰਮ ਕਰਦੀ ਹੈ ਜਦੋਂ ਯਾਤਰੀਆਂ ਕੋਲ ਰੀਅਲ-ਟਾਈਮ ਜਾਣਕਾਰੀ ਹੁੰਦੀ ਹੈ।",
      p2: "ਅਸੀਂ ਅਣਸ਼ਚਿਤਤਾ ਘਟਾਉਣ ਲਈ ਰਾਹੇ ਬਣਾਇਆ—ਘੱਟ ਅਟਕਲਾਂ, ਘੱਟ ਛੁੱਟੀਆਂ ਬੱਸਾਂ, ਹੋਰ ਸੁਰੱਖਿਅਤ ਸਫ਼ਰ।",
      points: {
        safe: "SOS ਅਤੇ ਵੈਰੀਫਾਈਡ ਪ੍ਰੋਫ਼ਾਈਲ ਨਾਲ ਜ਼ਿਆਦਾ ਸੁਰੱਖਿਅਤ ਯਾਤਰਾ",
        reliable: "ਲਾਈਵ GPS ਅਤੇ ETA ਨਾਲ ਭਰੋਸੇਯੋਗ ਸਮਾਂ",
        accessible: "ਹਰ ਕਿਸੇ ਲਈ ਸਧਾਰਣ ਇੰਟਰਫੇਸ",
      },
    },
  
    mission: {
      title: "ਸਾਡਾ ਮਕਸਦ",
      p1: "ਪੰਜਾਬ ਦੇ ਯਾਤਰੀਆਂ ਨੂੰ ਪਾਰਦਰਸ਼ੀ, ਰੀਅਲ-ਟਾਈਮ ਜਾਣਕਾਰੀ ਅਤੇ ਸੁਰੱਖਿਆ-ਪਹਿਲਾਂ ਟੂਲ ਨਾਲ ਸਮਰੱਥ ਕਰਨਾ।",
      pillars: {
        safety: {
          title: "ਸੁਰੱਖਿਆ",
          desc: "SOS ਸ਼ੌਰਟਕੱਟ, ਭਰੋਸੇਯੋਗ ਡਰਾਈਵਰ ਅਤੇ ਪ੍ਰਾਈਵੇਸੀ-ਅਵੇਅਰ ਡਿਜ਼ਾਇਨ।",
        },
        timeliness: {
          title: "ਸਮੇਂਦਾਰੀ",
          desc: "ਲਾਈਵ ਲੋਕੇਸ਼ਨ + ETA ਤਾਂ ਜੋ ਉਡੀਕ ਘੱਟ ਹੋਵੇ।",
        },
        community: {
          title: "ਕਮਿਊਨਿਟੀ",
          desc: "ਰੋਜ਼ਾਨਾ ਯਾਤਰੀਆਂ, ਵਿਦਿਆਰਥੀਆਂ ਤੇ ਪਰਿਵਾਰਾਂ ਲਈ ਤਿਆਰ ਕੀਤਾ ਗਿਆ।",
        },
      },
    },
  
    features: {
      title: "ਰਾਹੇ ਨਾਲ ਤੁਸੀਂ ਕੀ ਕਰ ਸਕਦੇ ਹੋ",
      subtitle: "ਯਾਤਰੀ, ਡਰਾਈਵਰ ਤੇ ਐਡਮਿਨ—ਸਭ ਲਈ ਤਾਕਤਵਰ ਫੀਚਰ।",
      items: {
        live:   { title: "ਲਾਈਵ ਟ੍ਰੈਕਿੰਗ", desc: "ਬੱਸਾਂ ਨੂੰ ਰੀਅਲ-ਟਾਈਮ ਵਿੱਚ ਦੇਖੋ ਅਤੇ ਸਾਫ਼ ETA ਪਾਓ।" },
        routes: { title: "ਰੂਟ ਤੇ ਸਟਾਪ", desc: "ਸਟਾਪ-ਬਾਇ-ਸਟਾਪ ਵੇਰਵੇ ਨਾਲ ਰੂਟ ਬ੍ਰਾਊਜ਼/ਖੋਜ ਕਰੋ।" },
        // Punjabi (pa)
alerts: {
    title: "ਲਾਸਟ ਐਂਡ ਫਾਊਂਡ",
    desc: "ਆਪਣੇ ਗੁੰਮ ਹੋਏ ਸਮਾਨ ਲਈ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ ਅਤੇ ਐਡਮਿਨ ਉਸ ਦਾ ਨਿਪਟਾਰਾ ਕਰਨਗੇ।",
  }
  ,
        sos:    { title: "SOS ਤੇ ਸੁਰੱਖਿਆ", desc: "ਇੱਕ-ਟੈਪ SOS ਅਤੇ ਵੈਰੀਫਾਈਡ ਡਰਾਈਵਰ ਪ੍ਰੋਫ਼ਾਈਲ।" },
        portals:{ title: "ਖਾਸ ਪੋਰਟਲ", desc: "ਯਾਤਰੀ, ਡਰਾਈਵਰ ਅਤੇ ਐਡਮਿਨ ਲਈ ਵੱਖ-ਵੱਖ ਟੂਲ।" },
        admin:  { title: "ਐਡਮਿਨ ਕੰਟਰੋਲ", desc: "ਰੂਟ, ਯੂਜ਼ਰ, ਡਰਾਈਵਰ ਤੇ ਸਿਸਟਮ ਹੈਲਥ ਮੈਨੇਜ ਕਰੋ।" },
      },
    },
  
    timeline: {
      title: "ਅਸੀਂ ਇੱਥੇ ਤੱਕ ਕਿਵੇਂ ਪਹੁੰਚੇ",
      items: {
        idea:   { title: "ਵਿਚਾਰ", desc: "ਰੋਜ਼ ਦੇ ਯਾਤਰੀਆਂ ਨਾਲ ਗੱਲ ਕੀਤੀ—ਇੱਕ ਗਲ ਸੀਧੀ: 'ਪ੍ਰਡਿਕਟੇਬਿਲਟੀ ਮਹੱਤਵਪੂਰਨ ਹੈ'." },
        pilot:  { title: "ਪਾਇਲਟ", desc: "ਪੰਜਾਬ ਦੇ ਕੁਝ ਰੂਟਾਂ ’ਤੇ ਟੈਸਟ ਕੀਤਾ ਅਤੇ ਫੀਡਬੈਕ ਨਾਲ ਸੁਧਾਰ ਕੀਤੇ।" },
        launch: { title: "ਲਾਂਚ", desc: "ਯਾਤਰੀ, ਡਰਾਈਵਰ ਅਤੇ ਐਡਮਿਨ ਪੋਰਟਲਾਂ ਨਾਲ ਸਥਿਰ ਰਿਲੀਜ਼।" },
      },
    },
  
    cta: {
      title: "ਭਰੋਸੇ ਨਾਲ ਯਾਤਰਾ ਲਈ ਤਿਆਰ?",
      desc: "ਅਗਲੀ ਬੱਸ ਹੁਣੇ ਟ੍ਰੈਕ ਕਰੋ—ਜਾਂ ਡਰਾਈਵਰ ਵਜੋਂ ਆਪਣਾ ਰੂਟ ਸਾਂਝਾ ਕਰਨਾ ਸ਼ੁਰੂ ਕਰੋ।",
      buttons: { passenger: "ਮੈਂ ਯਾਤਰੀ ਹਾਂ", driver: "ਮੈਂ ਡਰਾਈਵਰ ਹਾਂ" },
    },
  },
  
  },
};

function get(obj, path, fallback) {
  // path like "header.nav.home"
  return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj) ?? fallback;
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    // optional: set document lang attribute
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => {
    return (key, fallback) => {
      const table = TRANSLATIONS[lang] || TRANSLATIONS.en;
      return get(table, key, fallback ?? key);
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, TRANSLATIONS }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
