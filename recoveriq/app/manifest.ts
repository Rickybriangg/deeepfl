import type { MetadataRoute } from 'next'

// Web app manifest (roadmap 1.9 — installable mobile app). Lets recovery
// agents add RecoverIQ to their home screen and run it standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RecoverIQ — YEDF Loan Recovery',
    short_name: 'RecoverIQ',
    description: 'Loan recovery operations for the Youth Enterprise Development Fund Credit Unit',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
