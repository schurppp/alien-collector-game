Original prompt: Das sind ein paar Baxter drin das mit der Höhe und Tiefe funktioniert nicht Zugangs und ich möchte in die Häuser reingehen aber mein Modell ist irgendwie zu groß sonst passt das auch nicht so ganz verbessere generell alles, damit es gut funktioniert

- Adjusted player scale to a more realistic eye height and smaller collision radius.
- Added wall-only colliders with door openings for the island house and villa so you can enter through doors while still blocking walls.
- Reworked inside-house/villa detection to be consistent and based on player position (not camera).
- Fixed island/villa floor height logic to use feet height and correct world-space floor levels.
- Added deterministic time stepping and render_game_to_text for test automation.
- Updated spawn positions to sit properly on island ground based on new player height.
- Replaced Date.now/elapsedTime usage with a unified gameTime for deterministic updates.

TODOs / next checks:
- Verify door opening alignment and that you can walk into the island house + villa without clipping.
- If you want city houses enterable too, we need to add door gaps + interior ground for those buildings.
- Screenshots from the Playwright run were black; if this persists, re-run in headed mode to verify rendering.

- Added a real-time day/night cycle that updates sun position, colors, fog, exposure, and sky/environment reflections.
- Implemented dynamic street lights, vehicle lights, and window/interior light intensity based on night factor.
- Added emissive window tracking for residential homes, island house, and villa.
- Added walking limb animation and scale variance for NPCs.
- Improved water/river/lake materials for more realistic reflections.
