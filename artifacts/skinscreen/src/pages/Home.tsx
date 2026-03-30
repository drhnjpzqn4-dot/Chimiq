import { LandingPage } from "@/components/LandingPage";
import { generalConfig } from "@/lib/landing-config";

export default function Home() {
  return <LandingPage config={generalConfig} />;
}
