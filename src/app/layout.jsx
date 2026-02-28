import { Montserrat } from "next/font/google";
import "./globals.css";
import ScrollToTop from "./components/ScrollToTop";
import ProgressBarProvider from "./components/ProgressBarProvider";
import GlobalApiNotifier from "./components/GlobalApiNotifier";
import Script from "next/script";
const montserrat = Montserrat({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <link rel="icon" type="image/jpeg" href="/images/telegram-cloud-document-2-5352691370182082102.jpg" />
        <link rel="apple-touch-icon" href="/images/telegram-cloud-document-2-5352691370182082102.jpg" />

        <title>BS MARKET</title>
        <meta
          name="description"
          content="BS Market – крупнейший онлайн-магазин в Ташкенте и Узбекистане. Телефоны, ноутбуки, бытовая техника, одежда, спорттовары и многое другое по выгодным ценам."
        />
        <meta
          name="keywords"
          content="BS Market, bsmarket, онлайн магазин Ташкент, интернет магазин Узбекистан, купить онлайн Ташкент, магазин телефонов Ташкент, ноутбуки онлайн Узбекистан, бытовая техника Ташкент, одежда онлайн магазин, спорттовары Узбекистан, здоровье товары Ташкент, авто товары интернет магазин"
        />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BS Market",
              url: "https://bsmarket.uz",
              logo: "https://bsmarket.uz/logo.png",
              sameAs: [
                "https://t.me/bsmarket_uz",
                "https://www.instagram.com/bsmarket_uz",
                "https://www.facebook.com/profile.php?id=61579159990235",
                "https://t.me/BsMarket_support_bot",
              ],
              potentialAction: {
                "@type": "SearchAction",
                target: "https://bsmarket.uz/search?name={search_term_string}",
                "query-input": "required name=search_term_string",
              },
              hasPart: [
                {
                  "@type": "WebPage",
                  name: "Телефоны",
                  url: "https://bsmarket.uz/search?category=689dc67ee9443d84b885e451",
                },
                {
                  "@type": "WebPage",
                  name: "Ноутбуки и компьютер",
                  url: "https://bsmarket.uz/search?category=689dc751e9443d84b885e458",
                },
                {
                  "@type": "WebPage",
                  name: "Бытовая техника",
                  url: "https://bsmarket.uz/search?category=689dc7bce9443d84b885e45d",
                },
                {
                  "@type": "WebPage",
                  name: "Одежда",
                  url: "https://bsmarket.uz/search?category=689dc83de9443d84b885e478",
                },
                {
                  "@type": "WebPage",
                  name: "Спорт и отдых",
                  url: "https://bsmarket.uz/search?category=689dc8d8e9443d84b885e47e",
                },
                {
                  "@type": "WebPage",
                  name: "Здоровье",
                  url: "https://bsmarket.uz/search?category=689dc92de9443d84b885e483",
                },
                {
                  "@type": "WebPage",
                  name: "Хобби и творчество",
                  url: "https://bsmarket.uz/search?category=689dc9cbe9443d84b885e499",
                },
                {
                  "@type": "WebPage",
                  name: "Автотовары",
                  url: "https://bsmarket.uz/search?category=689dca33e9443d84b885e4a3",
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${montserrat.variable} antialiased`}
        style={{ fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}
        suppressHydrationWarning
      >
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7JLGFF9Z1L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7JLGFF9Z1L');
          `}
        </Script>
        <ProgressBarProvider>
          <GlobalApiNotifier />
          {children}
          <ScrollToTop />
        </ProgressBarProvider>
      </body>
    </html>
  );
}
