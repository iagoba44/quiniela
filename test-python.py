import urllib.request
import json

req = urllib.request.Request(
    'https://www.loteriasyapuestas.es/servicios/proximosv3?game_id=LAQU', 
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8')[:300])
except Exception as e:
    print(e)
