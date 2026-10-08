import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ReefFloor } from "@/components/SeaLife";
import Explore from "@/pages/Explore";
import { scrollToSection } from "@/lib/scroll";

const SECTIONS = ["top", "explore", "restore", "insights", "act", "about"];

export default function App() {
  const [active, setActive] = useState("top");

  // Highlight the nav item for whichever section is currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar active={active} onNavigate={scrollToSection} />
      <main>
        <Explore />
      </main>
      <ReefFloor />
      <Footer />
    </div>
  );
}
