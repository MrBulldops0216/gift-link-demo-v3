#!/bin/bash
curl -X POST http://localhost:5050/api/sentry \
  -H "Content-Type: application/json" \
  -d '{
    "history": [],
    "parent_text": "Don'\''t click that popup, it might be dangerous.",
    "state": null
  }' | jq .
