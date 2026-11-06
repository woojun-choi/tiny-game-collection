#!/bin/sh
# spellcheck-ko/korean-dict-nikl (CC BY-SA 2.0 KR) 미러에서 국립국어원 사전 XML을 받는다.
set -e
mkdir -p "$(dirname "$0")/raw" && cd "$(dirname "$0")/raw"
for d in opendict stdict krdict; do
  mkdir -p $d
  curl -s https://api.github.com/repos/spellcheck-ko/korean-dict-nikl/contents/$d |
    python3 -c "import json,sys;[print(f['download_url']) for f in json.load(sys.stdin) if f['name'].endswith('.xml')]" |
    while read url; do
      f=$d/$(basename "$url")
      [ -s "$f" ] || curl -sfL --retry 3 -o "$f" "$url"
      echo "$f"
    done
done
echo DONE
