#!/usr/bin/env python3
"""Render docs/SmartTrack-API.postman_collection.json to a styled API reference PDF."""

import json
import os

from _pdf_common import build_pdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTION_PATH = os.path.join(BASE_DIR, "SmartTrack-API.postman_collection.json")
PDF_PATH = os.path.join(BASE_DIR, "SmartTrack_API_Documentation.pdf")


def main():
    with open(COLLECTION_PATH, "r", encoding="utf-8") as f:
        collection = json.load(f)
    path = build_pdf(collection, PDF_PATH, footer_title="SmartTrack API Documentation")
    print(f"PDF generated: {path}")


if __name__ == "__main__":
    main()
