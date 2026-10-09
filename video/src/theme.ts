// Fonts from reefsense/index.html (Fraunces + Inter); colours and frame size live in palette.ts.
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export { C, FPS, H, W } from "./palette";

export const display = loadFraunces("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
loadFraunces("italic", { weights: ["400"], subsets: ["latin"] });
export const sans = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
