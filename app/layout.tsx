import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { WebContainersLocaleProvider } from "@/components/web-containers-locale-provider";
import { IblaiProviders } from "@/providers/iblai-providers";

// The proxy's nonce-based CSP requires per-request rendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ibl.ai/sis",
    template: "%s · ibl.ai/sis",
  },
  description:
    "The open-source CRM for organizations on the ibl.ai platform — people, organizations, deals, activities.",
  applicationName: "ibl.ai/sis",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WebContainersLocaleProvider>
            <IblaiProviders>{children}</IblaiProviders>
          </WebContainersLocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
