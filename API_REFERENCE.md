# OPTIVIEW API Reference

Base URL: `http://localhost:3000/api`

## Panorama Service

### Stores

#### Create Store
```
POST /panorama/stores
Content-Type: application/json

{
  "name": "Default Optical Shop",
  "imageUrl": "https://example.com/panorama.jpg"
}

Response (201):
{
  "id": "clx...",
  "name": "Default Optical Shop",
  "imageUrl": "https://example.com/panorama.jpg",
  "createdAt": "2026-06-14T22:00:00.000Z",
  "updatedAt": "2026-06-14T22:00:00.000Z"
}
```

#### List All Stores
```
GET /panorama/stores

Response (200):
[
  {
    "id": "clx...",
    "name": "Default Optical Shop",
    "imageUrl": "https://example.com/panorama.jpg",
    "createdAt": "2026-06-14T22:00:00.000Z",
    "updatedAt": "2026-06-14T22:00:00.000Z"
  }
]
```

#### Get Store with Hotspots
```
GET /panorama/stores/:id

Response (200):
{
  "id": "clx...",
  "name": "Default Optical Shop",
  "imageUrl": "https://example.com/panorama.jpg",
  "createdAt": "2026-06-14T22:00:00.000Z",
  "updatedAt": "2026-06-14T22:00:00.000Z",
  "hotspots": [
    {
      "id": "clx...",
      "storeId": "clx...",
      "module": "clients",
      "label": "Clients",
      "x": 0.1,
      "y": 0.3,
      "w": 0.2,
      "h": 0.3,
      "createdAt": "2026-06-14T22:00:00.000Z",
      "updatedAt": "2026-06-14T22:00:00.000Z"
    }
  ]
}
```

#### Update Store
```
PUT /panorama/stores/:id
Content-Type: application/json

{
  "name": "Updated Shop Name",
  "imageUrl": "https://example.com/new-panorama.jpg"
}

Response (200): Updated store object
```

#### Delete Store
```
DELETE /panorama/stores/:id

Response (200): Deleted store object
```

### Hotspots

#### Create Hotspot
```
POST /panorama/hotspots
Content-Type: application/json

{
  "storeId": "clx...",
  "module": "clients",
  "label": "Clients",
  "x": 0.1,
  "y": 0.3,
  "w": 0.2,
  "h": 0.3
}

Response (201):
{
  "id": "clx...",
  "storeId": "clx...",
  "module": "clients",
  "label": "Clients",
  "x": 0.1,
  "y": 0.3,
  "w": 0.2,
  "h": 0.3,
  "createdAt": "2026-06-14T22:00:00.000Z",
  "updatedAt": "2026-06-14T22:00:00.000Z"
}
```

#### Get Hotspots for Store
```
GET /panorama/hotspots/store/:storeId

Response (200):
[
  {
    "id": "clx...",
    "storeId": "clx...",
    "module": "clients",
    "label": "Clients",
    "x": 0.1,
    "y": 0.3,
    "w": 0.2,
    "h": 0.3,
    "createdAt": "2026-06-14T22:00:00.000Z",
    "updatedAt": "2026-06-14T22:00:00.000Z"
  }
]
```

#### Update Hotspot
```
PUT /panorama/hotspots/:id
Content-Type: application/json

{
  "x": 0.15,
  "y": 0.35,
  "w": 0.25,
  "h": 0.35
}

Response (200): Updated hotspot object
```

#### Delete Hotspot
```
DELETE /panorama/hotspots/:id

Response (200): Deleted hotspot object
```

## Validation Rules

### Coordinates
- All coordinates (`x`, `y`, `w`, `h`) must be between **0.0 and 1.0**
- Represents percentage position on panorama image
- **x**: horizontal position (0 = left, 1 = right)
- **y**: vertical position (0 = top, 1 = bottom)
- **w**: width as fraction of image
- **h**: height as fraction of image

### Constraints
- Only ONE hotspot per module per store
- Attempting to create duplicate hotspot will fail with unique constraint error
- Deleting store cascades to delete all hotspots

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "x must be a number conforming to the range 0 to 1"
  ],
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Unique constraint failed on the fields: (`storeId`,`module`)"
}
```

## Example Workflow

```bash
# 1. Create a store
STORE_ID=$(curl -s -X POST http://localhost:3000/api/panorama/stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Shop",
    "imageUrl": "https://example.com/pano.jpg"
  }' | jq -r '.id')

# 2. Create hotspots
curl -X POST http://localhost:3000/api/panorama/hotspots \
  -H "Content-Type: application/json" \
  -d "{
    \"storeId\": \"$STORE_ID\",
    \"module\": \"clients\",
    \"label\": \"Clients\",
    \"x\": 0.1, \"y\": 0.3, \"w\": 0.2, \"h\": 0.3
  }"

curl -X POST http://localhost:3000/api/panorama/hotspots \
  -H "Content-Type: application/json" \
  -d "{
    \"storeId\": \"$STORE_ID\",
    \"module\": \"eyewear\",
    \"label\": \"Eyewear\",
    \"x\": 0.4, \"y\": 0.2, \"w\": 0.25, \"h\": 0.35
  }"

# 3. Retrieve complete store
curl http://localhost:3000/api/panorama/stores/$STORE_ID
```
