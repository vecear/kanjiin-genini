import subprocess
import sys
import time

def run_script(script_name):
    print(f"=== Running {script_name} ===")
    start = time.time()
    try:
        # We run as subprocess to avoid namespace pollution and ensure clean execution
        result = subprocess.run([sys.executable, script_name], check=True)
        print(f"=== {script_name} Completed in {time.time() - start:.2f}s ===\n")
    except subprocess.CalledProcessError as e:
        print(f"!!! Error running {script_name}: {e} !!!")
        sys.exit(1)

def build_all():
    print("Starting Full Dictionary Build...\n")
    
    # 1. Base Kanji Dictionary (Fast)
    run_script('build_dict.py')
    
    # 2. Conjugated Dictionary (Fast)
    run_script('build_conjugated_dict.py')
    
    # 3. Name Dictionary (Medium - Requires JmnedictFurigana.json)
    run_script('build_name_dict.py')
    
    # 4. JDD Frequency Dictionary (Slow optimized - Requires JmdictFurigana.json & jdd_data/)
    run_script('build_jdd_dict.py')
    
    print("All dictionaries generated successfully!")

if __name__ == "__main__":
    build_all()
