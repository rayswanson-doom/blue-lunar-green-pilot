import type { AccessoryId, MuseId, ThemeId } from "./content";

export type Riddle = {
  greeting: string;
  success: string;
  fail: string;
  hint: string;
  options: { id: AccessoryId; label: string }[];
};

const RIDDLES: Record<MuseId, Record<ThemeId, Riddle>> = {
  luma: {
    victorian: {
      greeting: "Hold up, hunter. I'm Luma of the gaslights. What sits in my hair and finishes this gown?",
      success: "Oh you saw it! Take this lantern sabre. Don't drop it in the dark.",
      fail: "Mmm, not that one. A spark just winked out.",
      hint: "Look up — a tiny sunburst crown pin.",
      options: [
        { id: "crown", label: "Sunburst crown pin" },
        { id: "umbrella", label: "Cloud parasol" },
        { id: "gloves", label: "Lace gloves" },
      ],
    },
    cyberpunk: {
      greeting: "Neon's loud, hunter. I'm Luma. What glowing piece crowns this look?",
      success: "Sharp. Here's a plasma edge — keep it from the rain.",
      fail: "Cold guess. A circuit just dimmed.",
      hint: "A tiny LED sunburst sits in my hair.",
      options: [
        { id: "crown", label: "LED sunburst halo" },
        { id: "umbrella", label: "Rain visor" },
        { id: "gloves", label: "Haptic gloves" },
      ],
    },
    battlefield: {
      greeting: "Medic Luma. In this smoke, what pin marks me as lantern-bearer?",
      success: "Good eyes. Take the field sabre.",
      fail: "Wrong kit. That cost a spark.",
      hint: "A brass sunburst pin on my collar-hair.",
      options: [
        { id: "crown", label: "Brass sunburst pin" },
        { id: "umbrella", label: "Canvas tarp" },
        { id: "gloves", label: "Field dressings" },
      ],
    },
    hell: {
      greeting: "Ember halls. I'm Luma. What diadem keeps my fire from going out?",
      success: "Yes. An ember blade — don't let it cool.",
      fail: "Ash. Wrong.",
      hint: "A glowing sun diadem in my hair.",
      options: [
        { id: "crown", label: "Ember diadem" },
        { id: "umbrella", label: "Cinder shade" },
        { id: "gloves", label: "Ash gauntlets" },
      ],
    },
    forest: {
      greeting: "Moss and hush. I'm Luma. What wooden sun charm finishes me?",
      success: "You noticed. A livingwood blade for you.",
      fail: "The grove says no.",
      hint: "A carved sun charm tucked in my hair.",
      options: [
        { id: "crown", label: "Wooden sun charm" },
        { id: "umbrella", label: "Leaf canopy" },
        { id: "gloves", label: "Gardener mitts" },
      ],
    },
  },
  ruby: {
    victorian: {
      greeting: "Ruby Finch. I don't step aside. What's the flourish in my hair?",
      success: "Ha. Cute eyes. A parlor pistol — don't miss.",
      fail: "Nope. That guess cost a spark, darling.",
      hint: "A wide crimson ribbon. Not subtle.",
      options: [
        { id: "watch", label: "Pocket watch" },
        { id: "ribbon", label: "Crimson ribbon" },
        { id: "teacup", label: "Travel teacup" },
      ],
    },
    cyberpunk: {
      greeting: "Ruby on the strip. What's my neon flourish?",
      success: "Taste. Take the pulse pistol.",
      fail: "Missed. Spark gone.",
      hint: "A holographic crimson ribbon in my hair.",
      options: [
        { id: "watch", label: "Chrono cuff" },
        { id: "ribbon", label: "Holo crimson ribbon" },
        { id: "teacup", label: "Stim flask" },
      ],
    },
    battlefield: {
      greeting: "Ruby, corridor runner. What's tied through this copper hair?",
      success: "That's it. A trench pistol. Hunt well.",
      fail: "Wrong kit.",
      hint: "A torn crimson field ribbon.",
      options: [
        { id: "watch", label: "Compass watch" },
        { id: "ribbon", label: "Field crimson ribbon" },
        { id: "teacup", label: "Mess tin" },
      ],
    },
    hell: {
      greeting: "Ruby of the pits. What's the lava-glow in my hair?",
      success: "Yes. An inferno sidearm.",
      fail: "Burned that guess.",
      hint: "A ribbon that glows like magma.",
      options: [
        { id: "watch", label: "Soul hourglass" },
        { id: "ribbon", label: "Magma ribbon" },
        { id: "teacup", label: "Ember cup" },
      ],
    },
    forest: {
      greeting: "Ruby in the autumn wood. What's my flourish?",
      success: "Ha. A hunter's flintlock. Don't startle the deer.",
      fail: "The trees disagree.",
      hint: "A leaf-and-crimson ribbon.",
      options: [
        { id: "watch", label: "Acorn watch" },
        { id: "ribbon", label: "Autumn ribbon" },
        { id: "teacup", label: "Birch cup" },
      ],
    },
  },
  pearl: {
    victorian: {
      greeting: "Pearl Quinn. I see these halls better with one special piece. Which?",
      success: "Correct. Clarity suits you. A quiet sabre.",
      fail: "A reasonable guess. Not mine.",
      hint: "Round frames. Pale as a pearl. On my nose.",
      options: [
        { id: "raincoat", label: "Sky raincoat" },
        { id: "fan", label: "Paper fan" },
        { id: "spectacles", label: "Pearl spectacles" },
      ],
    },
    cyberpunk: {
      greeting: "Pearl. Data-noise is loud. What lets me see the maze?",
      success: "Correct. A chrome edge for you.",
      fail: "Not my optics.",
      hint: "Thin visor-spectacles, pearl-pale.",
      options: [
        { id: "raincoat", label: "Storm cloak" },
        { id: "fan", label: "Cooling fan" },
        { id: "spectacles", label: "Pearl visor glasses" },
      ],
    },
    battlefield: {
      greeting: "Pearl, scout. What sits on my nose in this dusk?",
      success: "Good. A scout's blade.",
      fail: "Wrong optic.",
      hint: "Dusty round spectacles.",
      options: [
        { id: "raincoat", label: "Oilskin" },
        { id: "fan", label: "Signal fan" },
        { id: "spectacles", label: "Scout spectacles" },
      ],
    },
    hell: {
      greeting: "Pearl of the ash. What smoked glass keeps me clear?",
      success: "Yes. An obsidian sabre.",
      fail: "Clouded guess.",
      hint: "Round smoked spectacles.",
      options: [
        { id: "raincoat", label: "Cinder cloak" },
        { id: "fan", label: "Bellows fan" },
        { id: "spectacles", label: "Smoked pearl glasses" },
      ],
    },
    forest: {
      greeting: "Pearl under fern-light. What helps me read the paths?",
      success: "Correct. A moss-steel blade.",
      fail: "The mist says no.",
      hint: "Round glasses, pale as dew.",
      options: [
        { id: "raincoat", label: "Moss cloak" },
        { id: "fan", label: "Fern fan" },
        { id: "spectacles", label: "Dewdrop spectacles" },
      ],
    },
  },
  cinder: {
    victorian: {
      greeting: "Cinder Hart. I stomp these halls. What's my lucky pair?",
      success: "Yes! Those boots. A riding pistol — keep up.",
      fail: "Wrong pair. That stumble cost a spark.",
      hint: "Huge cream boots with little stars.",
      options: [
        { id: "boots", label: "Star-painted boots" },
        { id: "fan", label: "Paper fan" },
        { id: "watch", label: "Riding watch" },
      ],
    },
    cyberpunk: {
      greeting: "Cinder. Streets are slick. What's my lucky pair?",
      success: "Those boots. A mag-pistol — try to keep up.",
      fail: "Wrong pair.",
      hint: "Chunky star-etched boots.",
      options: [
        { id: "boots", label: "Star-etched mag-boots" },
        { id: "fan", label: "Cooling vane" },
        { id: "watch", label: "HUD watch" },
      ],
    },
    battlefield: {
      greeting: "Cinder, trail stomper. What's the lucky pair in this mud?",
      success: "Yes. Combat boots. Here's a service pistol.",
      fail: "Wrong pair.",
      hint: "Star-painted combat boots.",
      options: [
        { id: "boots", label: "Star combat boots" },
        { id: "fan", label: "Map fan" },
        { id: "watch", label: "Field watch" },
      ],
    },
    hell: {
      greeting: "Cinder of the basalt. What's my lucky pair in this heat?",
      success: "Those iron stars. An infernal hand-cannon.",
      fail: "Wrong pair. Hot miss.",
      hint: "Iron boots with star stamps.",
      options: [
        { id: "boots", label: "Iron star boots" },
        { id: "fan", label: "Ember fan" },
        { id: "watch", label: "Brim watch" },
      ],
    },
    forest: {
      greeting: "Cinder on the trail. What's my lucky pair in this mud?",
      success: "Those boots. A woodland flintlock. Race you.",
      fail: "Wrong pair. Roots laugh.",
      hint: "Muddy boots with little stars.",
      options: [
        { id: "boots", label: "Star trail boots" },
        { id: "fan", label: "Leaf fan" },
        { id: "watch", label: "Wood watch" },
      ],
    },
  },
};

export function riddleFor(id: MuseId, theme: ThemeId): Riddle {
  return RIDDLES[id][theme];
}
