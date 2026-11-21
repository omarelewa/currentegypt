"""Build assets/redesign.min.css from assets/redesign.css (the commented
source you edit). Pages load the .min file. Run after every CSS edit:

    python3 .tools/minify-css.py

Strings are protected; comments and spare whitespace go. Nothing else is
rewritten, so the output means exactly what the source says."""
import re, pathlib, gzip
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'assets/redesign.css').read_text()
keep = []
def stash(m):
    keep.append(m.group(0)); return f'\x00{len(keep) - 1}\x00'
s = re.sub(r'/\*.*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'',
           lambda m: '' if m.group(0).startswith('/*') else stash(m), src, flags=re.S)
s = re.sub(r'\s+', ' ', s)
s = re.sub(r'\s*([{};,>])\s*', r'\1', s)
s = re.sub(r'\s*:\s*(?=[^{}]*[;}])', ':', s)      # inside declarations only
s = s.replace(';}', '}').strip()
s = re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], s)
(root / 'assets/redesign.min.css').write_text(s + '\n')
print(f'{len(src):,} -> {len(s):,} bytes; gzip {len(gzip.compress(src.encode(), 9)):,} -> {len(gzip.compress(s.encode(), 9)):,}')
