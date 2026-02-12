# Visual Assets Drop Zone

This folder is where you place generated assets first.

## Folder map

- `hardscape/<slug>/...`
- `plants/<slug>/...`
- `substrate/<slug>/...`

Use prompts from:
- `/Users/jacob/Projects/planted-tank-lab/docs/visual-asset-prompts.md`

Use technical requirements from:
- `/Users/jacob/Projects/planted-tank-lab/docs/visual-asset-pack-spec.md`

## After you generate assets

1. Clean cutouts in Canva (hardscape/plants) and export transparent PNG.
2. Keep exact target dimensions from the spec.
3. Keep the exact filenames from the prompt pack.
4. Copy final production files into runtime folders under:
   - `/Users/jacob/Projects/planted-tank-lab/public/images/visual-assets/`

## Runtime path notes

Current design-asset records already point to flat hardscape files like:
- `/images/visual-assets/hardscape/seiryu-boulder-large.png`

You can keep grouped source assets here, then select best variants and copy/rename into those runtime names.
