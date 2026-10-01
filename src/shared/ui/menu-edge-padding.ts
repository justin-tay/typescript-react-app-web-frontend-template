/**
 * How far from the viewport edge a menu is kept (the `containerPadding` of an OUI `Menu`). Open, a
 * menu locks page scrolling and is placed against the full viewport width; when it closes the
 * scrollbar returns, and the menu, still fading out, would overhang it and flash a horizontal
 * scrollbar. This is more than a scrollbar is wide, so a menu at the right edge never does.
 */
export const MENU_EDGE_PADDING = 24
