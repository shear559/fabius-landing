from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import json,re,urllib.parse,sys,os
ROOT=Path(sys.argv[1]).resolve();PORT=int(os.environ.get('PREVIEW_PORT','8806'))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def translate_path(self,path):
  candidate=Path(super().translate_path(path))
  return str(candidate.with_suffix(".html")) if not candidate.exists() and candidate.with_suffix(".html").is_file() else str(candidate)
 def end_headers(self):
  route=urllib.parse.urlsplit(self.path).path
  headers={}
  for rule in json.loads((ROOT/'vercel.json').read_text())['headers']:
   if re.fullmatch(rule['source'],route):
    for h in rule['headers']:headers[h['key']]=h['value']
  for key,value in headers.items():
   value=value.replace('https://fabius-landing.vercel.app',f'http://127.0.0.1:{PORT}').replace('; upgrade-insecure-requests','')
   self.send_header(key,value)
  super().end_headers()
 def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
