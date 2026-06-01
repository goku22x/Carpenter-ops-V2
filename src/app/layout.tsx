import "./globals.css";

export const metadata = {
  title: "Carpenter Operations Hub",
  description: "Construction field operations platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
