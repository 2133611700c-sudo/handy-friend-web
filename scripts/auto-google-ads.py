#!/usr/bin/env python3
"""
Auto Google Ads Configuration
Automatically enables/disables ad groups and sets budget for Handy & Friend campaign
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import sys
import os

# Configuration
ACCOUNT_ID = "637-606-8452"
CAMPAIGN_NAME = "LA Search - Core Services"
EMAIL = "2133611700c@gmail.com"
TARGET_BUDGET = "5.00"

# Ad groups to ENABLE
ENABLE_GROUPS = [
    "Interior Painting",
    "Cabinet Painting",
    "Flooring (LVP Installation)",
    "Drywall Repair",
    "TV Mounting"
]

# Ad groups to DISABLE
DISABLE_GROUPS = [
    "Vanity",
    "Door Installation",
    "Backsplash",
    "Lighting",
    "Plumbing",
    "Electrical",
    "Handyman General"
]

def log(msg, level="INFO"):
    """Log messages with color"""
    colors = {
        "INFO": "\033[92m",    # Green
        "WARN": "\033[93m",    # Yellow
        "ERROR": "\033[91m",   # Red
        "DEBUG": "\033[94m"    # Blue
    }
    reset = "\033[0m"
    print(f"{colors.get(level, '')}{level:5}{reset} | {msg}")

def setup_driver():
    """Setup Chrome driver with proper options"""
    chrome_options = Options()
    # Don't use headless - we need to see login page
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    log("Starting Chrome browser...", "INFO")
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def navigate_to_google_ads(driver):
    """Navigate to Google Ads and handle login"""
    log("Opening Google Ads...", "INFO")
    driver.get("https://ads.google.com")

    time.sleep(3)

    # Check if login is needed
    try:
        email_field = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.ID, "identifierId"))
        )
        log("Login required. Please sign in with: " + EMAIL, "WARN")
        email_field.send_keys(EMAIL)

        # Click Next
        next_button = driver.find_element(By.ID, "identifierNext")
        next_button.click()

        time.sleep(3)

        # Wait for password field
        password_field = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.NAME, "password"))
        )
        log("Enter your password when prompted...", "WARN")

        # Wait for user to complete login (30 seconds)
        time.sleep(30)

    except:
        log("Already logged in or login skipped", "INFO")

    # Wait for ads.google.com to load
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    log("Google Ads loaded", "INFO")

def select_account(driver):
    """Select the correct Google Ads account"""
    log(f"Selecting account {ACCOUNT_ID}...", "INFO")

    time.sleep(2)

    try:
        # Look for account selector
        account_selector = driver.find_element(By.CLASS_NAME, "sxPU7d")  # Account selector
        account_selector.click()
        time.sleep(1)

        # Find and click the right account
        accounts = driver.find_elements(By.CLASS_NAME, "UAEw5c")  # Account options
        for account in accounts:
            if ACCOUNT_ID in account.text:
                account.click()
                log(f"Selected account {ACCOUNT_ID}", "INFO")
                time.sleep(3)
                return

        log(f"Could not find account {ACCOUNT_ID}", "WARN")
    except Exception as e:
        log(f"Account selection error: {e}", "DEBUG")

def navigate_to_campaign(driver):
    """Navigate to the LA Search - Core Services campaign"""
    log(f"Navigating to campaign '{CAMPAIGN_NAME}'...", "INFO")

    time.sleep(2)

    try:
        # Click on Campaigns in left menu
        campaigns_link = driver.find_element(By.XPATH, "//a[contains(text(), 'Campaigns')]")
        campaigns_link.click()
        time.sleep(3)

        # Search for campaign
        search_box = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search campaigns']"))
        )
        search_box.send_keys(CAMPAIGN_NAME)
        time.sleep(2)

        # Click on the campaign result
        campaign_result = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, f"//a[contains(text(), '{CAMPAIGN_NAME}')]"))
        )
        campaign_result.click()

        log(f"Opened campaign '{CAMPAIGN_NAME}'", "INFO")
        time.sleep(3)

    except Exception as e:
        log(f"Campaign navigation error: {e}", "ERROR")
        return False

    return True

def enable_disable_ad_groups(driver):
    """Enable/disable ad groups"""

    # Enable groups
    for group_name in ENABLE_GROUPS:
        try:
            log(f"Enabling: {group_name}...", "INFO")

            # Find the ad group row
            row = driver.find_element(By.XPATH, f"//a[contains(text(), '{group_name}')]/..")

            # Check current status
            status_elem = row.find_element(By.CLASS_NAME, "qFfOxd")  # Status column

            if "Paused" in status_elem.text:
                # Click on the group to open it
                group_link = row.find_element(By.TAG_NAME, "a")
                group_link.click()
                time.sleep(2)

                # Find and click Enable button
                enable_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Enable')]"))
                )
                enable_btn.click()
                log(f"✅ Enabled: {group_name}", "INFO")

                # Go back to campaign view
                driver.back()
                time.sleep(2)
            else:
                log(f"⊙ Already enabled: {group_name}", "DEBUG")

        except Exception as e:
            log(f"Error enabling {group_name}: {e}", "WARN")

    # Disable groups
    for group_name in DISABLE_GROUPS:
        try:
            log(f"Disabling: {group_name}...", "INFO")

            # Find the ad group row
            row = driver.find_element(By.XPATH, f"//a[contains(text(), '{group_name}')]/..")

            # Check current status
            status_elem = row.find_element(By.CLASS_NAME, "qFfOxd")  # Status column

            if "Enabled" in status_elem.text or "Running" in status_elem.text:
                # Click on the group to open it
                group_link = row.find_element(By.TAG_NAME, "a")
                group_link.click()
                time.sleep(2)

                # Find and click Pause button
                pause_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Pause')]"))
                )
                pause_btn.click()
                log(f"✅ Paused: {group_name}", "INFO")

                # Go back to campaign view
                driver.back()
                time.sleep(2)
            else:
                log(f"⊙ Already paused: {group_name}", "DEBUG")

        except Exception as e:
            log(f"Error disabling {group_name}: {e}", "WARN")

def set_budget(driver):
    """Set daily budget to $5.00"""
    log(f"Setting budget to ${TARGET_BUDGET}...", "INFO")

    try:
        # Click on Settings
        settings_btn = driver.find_element(By.XPATH, "//a[contains(text(), 'Settings')]")
        settings_btn.click()
        time.sleep(3)

        # Find budget field
        budget_field = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//input[@aria-label='Daily budget']"))
        )

        # Clear and set new budget
        budget_field.triple_click()
        budget_field.send_keys(TARGET_BUDGET)

        # Click Save
        save_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Save')]")
        save_btn.click()

        log(f"✅ Budget set to ${TARGET_BUDGET}/day", "INFO")
        time.sleep(2)

    except Exception as e:
        log(f"Error setting budget: {e}", "ERROR")

def main():
    """Main execution"""
    log("=" * 60, "INFO")
    log("Google Ads Auto Configuration - Handy & Friend", "INFO")
    log("=" * 60, "INFO")
    log(f"Account: {ACCOUNT_ID}", "INFO")
    log(f"Campaign: {CAMPAIGN_NAME}", "INFO")
    log(f"Target Budget: ${TARGET_BUDGET}/day", "INFO")
    log("=" * 60, "INFO")

    driver = None

    try:
        driver = setup_driver()
        navigate_to_google_ads(driver)
        select_account(driver)

        if navigate_to_campaign(driver):
            enable_disable_ad_groups(driver)
            set_budget(driver)

        log("=" * 60, "INFO")
        log("✅ CONFIGURATION COMPLETE!", "INFO")
        log("=" * 60, "INFO")
        log("Next steps:", "INFO")
        log("1. Verify all changes in Google Ads", "INFO")
        log("2. Wait 24 hours for impressions/clicks", "INFO")
        log("3. Monitor /api/health for lead stats", "INFO")

        input("\nPress Enter to close browser...")

    except Exception as e:
        log(f"Fatal error: {e}", "ERROR")
        sys.exit(1)

    finally:
        if driver:
            driver.quit()
            log("Browser closed", "INFO")

if __name__ == "__main__":
    main()
