#!/usr/bin/env python3
"""Back up a harvest ZIP to the configured Drive folder using OAuth refresh credentials."""
import json, os, sys, urllib.parse, urllib.request
from pathlib import Path
credentials = json.loads(os.environ['JOKELAB_DRIVE_OAUTH_JSON'])
folder = os.environ['JOKELAB_DRIVE_FOLDER_ID']
path = Path(sys.argv[1])
body = urllib.parse.urlencode({k: credentials[k] for k in ('client_id', 'client_secret', 'refresh_token')} | {'grant_type': 'refresh_token'}).encode()
with urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token', data=body), timeout=30) as r:
    token = json.load(r)['access_token']
metadata = json.dumps({'name': path.name, 'parents': [folder], 'description': 'JokeLab source snapshots, database and collection report.'}).encode()
request = urllib.request.Request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink', data=metadata, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'application/zip'}, method='POST')
with urllib.request.urlopen(request, timeout=30) as response:
    upload_url = response.headers['Location']
with urllib.request.urlopen(urllib.request.Request(upload_url, data=path.read_bytes(), headers={'Content-Type': 'application/zip'}, method='PUT'), timeout=120) as response:
    result = json.load(response)
print(json.dumps(result))
