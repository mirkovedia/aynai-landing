import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { HowItWorks } from "@/components/sections/HowItWorks";

// Secciones below-the-fold: se cargan de forma diferida para reducir el JS inicial
const Pricing = dynamic(() => import("@/components/sections/Pricing").then((m) => ({ default: m.Pricing })));
const AynaiScore = dynamic(() => import("@/components/sections/AynaiScore").then((m) => ({ default: m.AynaiScore })));
const Audience = dynamic(() => import("@/components/sections/Audience").then((m) => ({ default: m.Audience })));
const BusinessModel = dynamic(() => import("@/components/sections/BusinessModel").then((m) => ({ default: m.BusinessModel })));
const Faq = dynamic(() => import("@/components/sections/Faq").then((m) => ({ default: m.Faq })));
const FinalCta = dynamic(() => import("@/components/sections/FinalCta").then((m) => ({ default: m.FinalCta })));

/** Landing pública de AYNAI. Navbar y Footer viven en el layout de (marketing). */
export default function Home() {
  return (
    <main id="contenido">
      <Hero />
      <ProductPreview />
      <HowItWorks />
      <Pricing />
      <AynaiScore />
      <Audience />
      <BusinessModel />
      <Faq />
      <FinalCta />
    </main>
  );
}
