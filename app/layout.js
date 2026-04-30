export const metadata = {
  title: 'MigrateIQ',
  description: 'AI-powered CMS migration',
  icons: {
    icon: '/favicon.svg',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
