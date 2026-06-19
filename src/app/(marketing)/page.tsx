import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Pricing } from "@/components/sections/Pricing";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { FinalCta } from "@/components/sections/FinalCta";

/** Landing pública de AynAI. Navbar y Footer viven en el layout de (marketing). */
export default function Home() {
  return (
    <main id="contenido">
      <Hero />
      <HowItWorks />
      <Pricing />
      <AynaiScore />
      <Audience />
      <FinalCta />
    </main>
  );
}
