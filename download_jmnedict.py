import requests
import json
import os
import zipfile
import io

def download_jmnedict():
    print("Fetching latest release info from GitHub...")
    response = requests.get("https://api.github.com/repos/Doublevil/JmdictFurigana/releases/latest")
    response.raise_for_status()
    release_data = response.json()
    
    asset_url = None
    print("Release Name:", release_data.get('name'))
    for asset in release_data['assets']:
        print(f"Found asset: {asset['name']}")
        if asset['name'] == "JmnedictFurigana.json.zip":
            asset_url = asset['browser_download_url']
            break
            
    if not asset_url:
        print("Could not find JmnedictFurigana.json.zip in the latest release.")
        return

    print(f"Downloading {asset_url}...")
    r = requests.get(asset_url)
    
    print("Download complete. Extracting...")
    
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        z.extract("JmnedictFurigana.json", ".")
            
    print("Extraction complete: JmnedictFurigana.json")

if __name__ == "__main__":
    download_jmnedict()
