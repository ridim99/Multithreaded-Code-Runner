# File: testscraper.py

import sys, json, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service   

def scrape_sample_tests(contest_id: str, problem_index: str):
    url = f"https://codeforces.com/problemset/problem/{contest_id}/{problem_index}"

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920x1080")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.get(url)

    time.sleep(1.5)  # Let the page load

    try:
        sample_tests_div = driver.find_element(By.CLASS_NAME, "sample-tests")
        input_blocks = sample_tests_div.find_elements(By.CSS_SELECTOR, "div.input pre")
        output_blocks = sample_tests_div.find_elements(By.CSS_SELECTOR, "div.output pre")

        if len(input_blocks) != len(output_blocks):
            print(json.dumps({"error": "Mismatch input/output counts"}))
            driver.quit()
            sys.exit(1)

        results = []
        for input_tag, output_tag in zip(input_blocks, output_blocks):
            input_text = input_tag.text
            output_text = output_tag.text
            results.append({
                "input": input_text.rstrip(),
                "output": output_text.rstrip()
            })

        print(json.dumps(results, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        driver.quit()
        sys.exit(1)

    driver.quit()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python testscraper.py <contestId> <problemIndex>")
        sys.exit(1)

    scrape_sample_tests(sys.argv[1], sys.argv[2])
