import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ValueProp } from "@/components/sections/ValueProp";
import { AynaiScore } from "@/components/sections/AynaiScore";
import { Audience } from "@/components/sections/Audience";
import { BusinessModel } from "@/components/sections/BusinessModel";
import { FinalCta } from "@/components/sections/FinalCta";

/** Landing pública de AynAI. Navbar y Footer viven en el layout de (marketing). */
export default function Home() {
  return (
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
  );
}
