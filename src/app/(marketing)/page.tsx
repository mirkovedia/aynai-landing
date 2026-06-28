import { Hero } from "@/components/sections/Hero";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Pricing } from "@/components/sections/Pricing";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { BusinessModel } from "@/components/sections/BusinessModel";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";

/** Landing pública de AynAI. Navbar y Footer viven en el layout de (marketing). */
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
