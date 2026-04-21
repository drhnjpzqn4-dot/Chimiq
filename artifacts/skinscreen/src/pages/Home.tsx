import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { LandingPage } from "@/components/LandingPage";
import { generalConfig } from "@/lib/landing-config";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari home-screen flag
  return Boolean((window.navigator as { standalone?: boolean }).standalone);
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isStandaloneDisplay()) {
      navigate("/app/scan", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return <LandingPage config={generalConfig} />;
}
