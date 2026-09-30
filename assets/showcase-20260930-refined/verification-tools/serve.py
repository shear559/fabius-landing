# Static test server with production headers and byte-range media delivery.
# python3 serve.py /path/to/site-root
import sys,os,json,re,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
ROOT=Path(sys.argv[1]).resolve();PORT=int(os.environ.get('PREVIEW_PORT','8814'))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def translate_path(self,path):
  p=Path(super().translate_path(path));return str(p.with_suffix('.html')) if not p.exists() and p.with_suffix('.html').is_file() else str(p)
 def end_headers(self):
  route=urllib.parse.urlsplit(self.path).path;headers={}
  for rule in json.loads((ROOT/'vercel.json').read_text())['headers']:
   if re.fullmatch(rule['source'],route):
    for h in rule['headers']:headers[h['key']]=h['value']
  for k,v in headers.items():self.send_header(k,v.replace('https://fabius-landing.vercel.app',f'http://127.0.0.1:{PORT}').replace('; upgrade-insecure-requests',''))
  super().end_headers()
 def send_head(self):
  p=Path(self.translate_path(self.path));match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
  self.byte_range=None
  if p.is_file() and match:
   size=p.stat().st_size;start=int(match[1]);end=min(int(match[2]) if match[2] else size-1,size-1)
   if start>=size:self.send_error(416);return None
   self.send_response(206);self.send_header('Content-type',self.guess_type(str(p)));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers();f=p.open('rb');f.seek(start);self.byte_range=end-start+1;return f
  return super().send_head()
 def copyfile(self,source,outputfile):
  if self.byte_range is None:return super().copyfile(source,outputfile)
  remaining=self.byte_range
  while remaining:
   chunk=source.read(min(65536,remaining))
   if not chunk:break
   try:outputfile.write(chunk)
   except (BrokenPipeError,ConnectionResetError):break
   remaining-=len(chunk)
 def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
