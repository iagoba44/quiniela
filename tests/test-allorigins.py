import urllib.request
import json
url = "https://api.allorigins.win/get?url=" + urllib.parse.quote("https://www.loteriasyapuestas.es/servicios/fechasv2?game_id=LAQU")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print(response.read().decode('utf-8')[:300])
except Exception as e:
    print(e)
