import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ValueProp } from "@/components/sections/ValueProp";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { BusinessModel } from "@/components/sections/BusinessModel";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * Página principal de la landing de AynAI.
 * Ensambla las secciones en el orden definido por la consigna.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <ValueProp />
        <AynaiScore />
        <Audience />
        <BusinessModel />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
