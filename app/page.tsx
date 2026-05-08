import Topbar from "@/components/landing-page/Topbar";
import Hero from "@/components/landing-page/Hero";
import TrustedSuppliers from "@/components/landing-page/TrustedSuppliers";
import HowItWorks from "@/components/landing-page/HowItWorks";
import CTA from "@/components/landing-page/CTA";
import Footer from "@/components/landing-page/Footer";

export default function LandingPage() {
  return (
    <main className="bg-[#F6F7F9]">
      <Topbar />
      <Hero />
      <TrustedSuppliers />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  );
}
