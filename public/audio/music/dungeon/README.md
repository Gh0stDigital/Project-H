# Dungeon music

Drop audio files in this folder. Every one of them becomes a dungeon track,
and a run picks one at random when it starts — the same track then plays for
that whole run, through every corridor and back out of every battle, so the
music does not change under you. Start another run and it picks again.

- **Any number of files.** Two is enough for it to do anything; there is no
  upper limit.
- **Any name.** The filename is only a label — nothing in the game refers to
  these by name.
- **`.mp3`, `.m4a`, `.ogg`, `.webm` or `.wav`.** Run `npm run optimize:audio`
  to convert anything large; a looping track wants to be an mp3, not a wav.
- **Make them loop.** They are played as a seamless loop, so a track that
  ends on silence will have a gap in it every time round.

The folder is picked up automatically: the dev server rescans when a file is
added or removed, and a build rescans before it starts. There is no list to
edit.

With this folder empty, `../dungeon.mp3` plays as it always has — that file
is the fallback, not one of the alternates, so keep it there.

The same works for any other music slot: `music/battle/`, `music/boss/`,
`music/rest/`, `music/menu/`, `music/results/`. A world can also ship its own
set at `public/worlds/<world>/music/dungeon/`, which takes precedence over
this folder for runs in that world.
