from pathlib import Path
import runpy

patch = Path('scripts/apply_bot_archetypes.py')
text = patch.read_text()
old = "    t = t[:end] + f', archetype: {arch}' + t[end:]"
new = "    t = t[:end] + f' archetype: {arch},' + t[end:]"
if old not in text:
    raise SystemExit('archetype insertion line not found')
patch.write_text(text.replace(old, new, 1))
runpy.run_path(str(patch), run_name='__main__')
