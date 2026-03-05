import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "競輪予想システム",
  description: "競輪レースのデータ閲覧・予想支援システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <div className="page-body">
          {children}
        </div>
      </body>
    </html>
  );
}
