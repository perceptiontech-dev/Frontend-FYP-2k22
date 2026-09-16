import type { Metadata } from "next";
import "./facultydashboard/style/global.css";

export const metadata: Metadata = {
  title: "IntelliPaper - Exam Moderation AI",
  description: "Sign in to access the IntelliPaper dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>

      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}