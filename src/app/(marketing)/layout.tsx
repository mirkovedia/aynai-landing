import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileCta } from "@/components/layout/MobileCta";

/** Shell de la zona pública (landing): navbar fija + footer. */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cocoa focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Saltar al contenido
      </a>
      <Navbar />
      {children}
      <Footer />
      <MobileCta />
    </>
  );
}
