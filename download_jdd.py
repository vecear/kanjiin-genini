import requests
import json
import os

TOPICS = ['topic1', 'topic2', 'topic3', 'topic4', 'topic5']
BASE_URL = "https://raw.githubusercontent.com/jqk09a/japanese-daily-dialogue/main/data/{topic}.json"

def download_jdd():
    if not os.path.exists('jdd_data'):
        os.makedirs('jdd_data')
        
    for topic in TOPICS:
        url = BASE_URL.format(topic=topic)
        filename = f"jdd_data/{topic}.json"
        print(f"Downloading {topic} from {url}...")
        try:
            r = requests.get(url)
            print(f"Status Code: {r.status_code}")
            if r.status_code == 200:
                with open(filename, 'wb') as f:
                    f.write(r.content)
                print(f"Saved {filename}")
            else:
                print(f"Failed to download {topic}: {r.status_code}")
                # print(r.text[:200])
        except Exception as e:
            print(f"Exception for {topic}: {e}")

if __name__ == "__main__":
    download_jdd()
