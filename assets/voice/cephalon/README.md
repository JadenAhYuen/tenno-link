# Cephalon companion voice pack

13 original offline cycle announcements. This is not Ordis audio or a clone of the actor: Microsoft George system speech was rendered locally, then given short comb echoes, subtle ring modulation and a brief amplitude stutter. No game recordings or remote TTS services were used.

`lines.json` lists the exact spoken scripts. WAV files are mono PCM16. File names are selected from an explicit cycle/phase allowlist. Replace these files with reviewed original voice performances to upgrade the pack without changing runtime code. The pack uses one consistent companion voice. Announcements name Earth, Venus and Deimos for their open worlds. `chime.wav` is an original two-second mono PCM16 signal, played to completion before the announcement. No planet-specific tones remain.

`events.json` defines six additional original Live activity announcements (19 voice clips total). `event-*.wav` files use the same Microsoft George rendering and metallic processing as the cycle pack. The shared chime is preloaded/played through the same sequential audio path; it is not baked into the speech files.
