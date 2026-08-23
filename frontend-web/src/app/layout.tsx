import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '당근마켓 실시간 시세 대시보드',
  description: '중고거래 데이터 분석 및 시세 시각화 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
