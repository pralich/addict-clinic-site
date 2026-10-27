// Глобальная разметка schema.org (была в index.html)
export const ROOT_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": [
        "MedicalClinic",
        "MedicalOrganization",
        "LocalBusiness"
      ],
      "@id": "https://addict.clinic/#clinic",
      "name": "addict.clinic",
      "url": "https://addict.clinic/",
      "logo": {
        "@id": "https://addict.clinic/#logo"
      },
      "image": "https://addict.clinic/og-image.jpg?v=3",
      "description": "Медицинский центр анонимного лечения зависимостей: алкоголизм, наркомания, лекарственная зависимость, игромания. Выезд врача 24/7.",
      "telephone": "+7-800-222-11-25",
      "email": "info@acrrc.digital",
      "priceRange": "₽₽",
      "currenciesAccepted": "RUB",
      "isAcceptingNewPatients": true,
      "medicalSpecialty": [
        "Psychiatric",
        "Emergency"
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Ленинградский проспект, д. 58, помещ. 1П",
        "addressLocality": "Москва",
        "addressRegion": "Москва",
        "postalCode": "125167",
        "addressCountry": "RU"
      },
      "areaServed": [
        {
          "@type": "City",
          "name": "Москва"
        },
        {
          "@type": "AdministrativeArea",
          "name": "Московская область"
        }
      ],
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "00:00",
        "closes": "23:59"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+7-800-222-11-25",
        "contactType": "emergency",
        "availableLanguage": [
          "ru"
        ]
      },
      "parentOrganization": {
        "@id": "https://addict.clinic/#organization"
      },
      "availableService": [
        {
          "@type": "MedicalTherapy",
          "name": "Лечение алкоголизма и вывод из запоя"
        },
        {
          "@type": "MedicalTherapy",
          "name": "Лечение наркомании"
        },
        {
          "@type": "MedicalTherapy",
          "name": "Лечение лекарственной зависимости"
        },
        {
          "@type": "MedicalTherapy",
          "name": "Лечение игромании"
        },
        {
          "@type": "MedicalTherapy",
          "name": "Реабилитация и психотерапия"
        }
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://addict.clinic/#organization",
      "name": "АНО «АЦРРС»",
      "legalName": "Автономная некоммерческая организация «Агентство Цифрового Развития Реабилитационных Систем»",
      "url": "https://addict.clinic",
      "email": "info@acrrc.digital",
      "taxID": "9714091602",
      "identifier": [
        {
          "@type": "PropertyValue",
          "propertyID": "ОГРН",
          "value": "1267700158483"
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Ленинградский проспект, д. 58, помещ. 1П",
        "addressLocality": "Москва",
        "addressRegion": "Москва",
        "postalCode": "125167",
        "addressCountry": "RU"
      },
      "logo": {
        "@id": "https://addict.clinic/#logo"
      }
    },
    {
      "@type": "ImageObject",
      "@id": "https://addict.clinic/#logo",
      "url": "https://addict.clinic/logo.png",
      "contentUrl": "https://addict.clinic/logo.png",
      "caption": "addict.clinic"
    },
    {
      "@type": "WebSite",
      "@id": "https://addict.clinic/#website",
      "url": "https://addict.clinic/",
      "name": "addict.clinic",
      "inLanguage": "ru-RU",
      "publisher": {
        "@id": "https://addict.clinic/#clinic"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://addict.clinic/articles?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
};
