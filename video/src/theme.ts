// Colours from reefsense/src/lib/palette.ts; fonts from reefsense/index.html (Fraunces + Inter).
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const C = {
  ground: "#F3F8FB",
  white: "#FFFFFF",
  shelf: "#E7F0F6",
  line: "#D3E2EC",
  ink: "#0A2540",
  slate: "#4A6378",
  ocean: "#0E5E8C",
  reef: "#0B7285",
  coral: "#E8603F",
  coralText: "#B2432A",
  abyss: "#03121F",
  foam: "#EAF5FB",
  surf: "#5CDBE8",
  high: "#1E9E8F",
  medium: "#E3B55B",
  low: "#E2593B",
};

export const display = loadFraunces("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
loadFraunces("italic", { weights: ["400"], subsets: ["latin"] });
export const sans = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;

export const FPS = 30;
export const W = 1920;
export const H = 1080;
