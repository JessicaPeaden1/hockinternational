#!/bin/bash
# Test script for the add-textbook-file webhook
# Webhook URL: https://hockintl.app.n8n.cloud/webhook/add-textbook-file
#
# Usage: ./test-webhook-add-textbook-file.sh
# Prerequisites: curl must be installed and the n8n instance must be accessible.

WEBHOOK_URL="https://hockintl.app.n8n.cloud/webhook/add-textbook-file"

echo "========================================="
echo "Testing: POST $WEBHOOK_URL"
echo "========================================="

# -----------------------------------------------
# TEST 1: Valid textbook file upload payload
# -----------------------------------------------
echo ""
echo "--- TEST 1: Valid payload ---"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "studyUnitId": "SU-2796",
    "certificationProgram": "CIA",
    "taskName": "CIA Part 2 - Study Unit 3: Risk Management - 3c. Cybersecurity Risks",
    "textbookName": "CIA Part 2 - Study Unit 3: Risk Management",
    "section": "3c. Existing and Emerging Cybersecurity Risks and Data Security",
    "fileName": "SU-2796_textbook_2026-03-18.docx",
    "dropboxPath": "/HOCK/CIA/SU-2796/textbook/",
    "fileUrl": "",
    "timestamp": "2026-03-18T00:00:00Z",
    "source": "Generated in Claude project"
  }'

# -----------------------------------------------
# TEST 2: Missing required fields (expect 400)
# -----------------------------------------------
echo ""
echo "--- TEST 2: Missing required fields (expect 400) ---"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "studyUnitId": "SU-2796"
  }'

# -----------------------------------------------
# TEST 3: GET request (expect 405 Method Not Allowed)
# -----------------------------------------------
echo ""
echo "--- TEST 3: GET request (expect 404 or 405) ---"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X GET "$WEBHOOK_URL"

echo ""
echo "========================================="
echo "Tests complete."
echo "========================================="
