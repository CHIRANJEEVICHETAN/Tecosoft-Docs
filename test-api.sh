#!/bin/bash

echo "Testing /api/user/role endpoint..."

# Test without authentication (should return 401)
echo "1. Testing without auth (should return 401):"
curl -X GET http://localhost:3000/api/user/role \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "2. Testing debug auth endpoint:"
curl -X GET http://localhost:3000/api/debug/auth \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "3. Testing debug user endpoint:"
curl -X GET http://localhost:3000/api/debug/user \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"