Interface art that is not world content and not a character.

  title   the game's logo, shown on the main menu in place of its text title
  cover   the title screen: the shut book the player taps to begin
  awaken  what the tap opens — shown through the white flash, before the menu

`cover` and `awaken` go together: the opening sequence only plays when both
are present, and the game boots straight to the menu when either is missing.
Each is shown whole over a blurred copy of itself, so any proportions work
and nothing is cropped away — but they are full-screen stills, so give them
room: roughly square or taller reads best on a phone.

Any format the art pipeline accepts (`.png`, `.jpg`, `.webp`), any
capitalisation. A slot with no file simply falls back — the menu draws its
text title when there is no `title` image — so nothing here is required.

Run `npm run optimize:art` after adding one.
