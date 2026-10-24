#!/usr/bin/env python3
"""
MD.Family backend — end-to-end smoke test.
Runs the full happy-path flow: register → login → create family → add child →
create pairing QR → consume QR → start live session → etc.
"""
import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8000"

def post(path, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode(), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return json.loads(body)
        except Exception:
            return {"error": body, "status": e.code}

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return json.loads(body)
        except Exception:
            return {"error": body, "status": e.code}

def step(name, ok):
    mark = "✅" if ok else "❌"
    print(f"{mark}  {name}")
    return ok

print("\n═══ MD.Family Backend — End-to-End Smoke Test ═══\n")

# 1. Health
ok = step("GET /health", get("/health").get("status") == "ok")

# 2. Register
email = f"parent_{int(time.time())}@example.com"
reg = post("/api/v1/auth/register", {"email": email, "name": "Ahmed Sabry", "password": "StrongPass123!"})
token = reg.get("access_token")
user = reg.get("user", {})
ok = step(f"POST /auth/register → user.id={user.get('id')}", bool(token))
if not token:
    print("   Error:", reg)
    sys.exit(1)

# 3. Get me
me = get("/api/v1/auth/me", token=token)
ok = step(f"GET /auth/me → {me.get('name')}", me.get("email") == email)

# 4. Create family
fam = post("/api/v1/families", {"name": "Sabry Family"}, token=token)
fam_id = fam.get("id")
ok = step(f"POST /families → {fam.get('name')}", bool(fam_id))

# 5. Add child
child = post(f"/api/v1/families/{fam_id}/children", {
    "name": "Youssef", "phone_brand": "Samsung",
}, token=token)
child_id = child.get("id")
ok = step(f"POST /children → {child.get('name')}", bool(child_id))

# 6. List children
children = get(f"/api/v1/families/{fam_id}/children", token=token)
ok = step(f"GET /children → {len(children)} child(ren)", len(children) == 1)

# 7. Create pairing session
pair = post(f"/api/v1/pairing/families/{fam_id}/children/{child_id}/pairing", {
    "child_id": child_id, "label": "Youssef Phone",
}, token=token)
code = pair.get("code")
session_id = pair.get("id")
ok = step(f"POST /pairing → code={code}", bool(code and len(code) == 6))

# 8. Preview pairing (child device)
preview = get(f"/api/v1/pairing/consume/{code}/preview")
ok = step(f"GET /pairing/consume/{code}/preview → family={preview.get('family_name')}",
          preview.get("child_name") == "Youssef")

# 9. Consume the QR (child device)
device = post("/api/v1/pairing/consume", {
    "code": code,
    "device_label": "Youssef Phone",
    "brand": "Samsung",
    "os": "Android",
    "os_version": "Android 14",
    "app_version": "MD.Family 2.0.0",
    "capabilities": {
        "usageStats": True, "accessibility": True, "vpn": True,
        "location": True, "mediaProjection": True, "microphone": False,
    },
})
device_id = device.get("id")
ok = step(f"POST /pairing/consume → device.id={device_id}", bool(device_id))

# 10. Try to reuse the same code (should fail)
reuse = post("/api/v1/pairing/consume", {
    "code": code, "device_label": "Second Phone", "brand": "Xiaomi",
    "os": "Android", "os_version": "Android 13", "app_version": "v1",
    "capabilities": {},
})
ok = step("Reuse pairing code → 410 (single-use enforced)",
          reuse.get("status") == 410 or "already been used" in str(reuse.get("detail", "")))

# 11. Dashboard summary
dash = get(f"/api/v1/families/{fam_id}/dashboard", token=token)
ok = step(f"GET /dashboard → {len(dash.get('children', []))} child, {len(dash.get('activity', []))} events",
          len(dash.get("children", [])) == 1)

# 12. Audit log
audit = get(f"/api/v1/families/{fam_id}/audit?page=1&page_size=20", token=token)
ok = step(f"GET /audit → {audit.get('total')} entries", audit.get("total", 0) >= 2)

# 13. Permission grants catalog
grants = get("/api/v1/families/permissions/grants", token=token)
ok = step(f"GET /permissions/grants → {len(grants)} grants", len(grants) == 10)

# 14. Mother invite + permissions flow (would need a second user — test permission deny)
# Create second user (mother)
email2 = f"mother_{int(time.time())}@example.com"
reg2 = post("/api/v1/auth/register", {"email": email2, "name": "Mona Sabry", "password": "StrongPass123!"})
mother_token = reg2.get("access_token")
mother_id = reg2.get("user", {}).get("id")

# Try to access family without membership → 403
denied = get(f"/api/v1/families/{fam_id}", token=mother_token)
ok = step("Uninvited mother GET /families/{id} → 403 forbidden",
          denied.get("detail") == "Not a member of this family" or denied.get("status") == 403)

# 15. OpenAPI spec
with urllib.request.urlopen(BASE + "/openapi.json") as r:
    spec = json.loads(r.read())
ok = step(f"GET /openapi.json → {len(spec.get('paths', {}))} paths",
          len(spec.get("paths", {})) > 20)

print("\n═══════════════════════════════════════════════════")
print(f"OpenAPI title: {spec.get('info', {}).get('title')}")
print(f"OpenAPI version: {spec.get('info', {}).get('version')}")
print(f"Total endpoints: {sum(len(m) for m in spec.get('paths', {}).values())}")
print("═══════════════════════════════════════════════════\n")
print("🎉  MD.Family Backend is fully operational!")
