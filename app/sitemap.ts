import type { MetadataRoute } from 'next'

const BASE = 'https://billcraft.aakasa.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:              `${BASE}/`,
      lastModified:     new Date(),
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${BASE}/login`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.5,
    },
    {
      url:              `${BASE}/register`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${BASE}/faq`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${BASE}/docs`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.8,
    },
    {
      url:              `${BASE}/docs/getting-started`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${BASE}/docs/invoices`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${BASE}/docs/estimates`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/docs/recurring-billing`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/docs/payments`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/docs/expenses`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/docs/ai-features`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${BASE}/docs/notifications-and-email`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/docs/faq`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${BASE}/privacy`,
      lastModified:     new Date(),
      changeFrequency:  'yearly',
      priority:         0.3,
    },
    {
      url:              `${BASE}/terms`,
      lastModified:     new Date(),
      changeFrequency:  'yearly',
      priority:         0.3,
    },
  ]
}
