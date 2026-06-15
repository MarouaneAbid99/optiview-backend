# OPTIVIEW Backend - Setup Guide

## ✅ Phase 1 Complete: Backend Foundation

### What's Installed
- **NestJS 11.0.1** - Full framework with decorators, modules, services, controllers
- **Prisma 5.8.0** - ORM with migrations and type generation
- **PostgreSQL** - Database provider (configured)
- **CORS** - Cross-Origin support enabled
- **Class Validator** - DTO validation
- **Class Transformer** - Data transformation

### Project Structure
```
optiview-backend/
├── src/
│   ├── main.ts                           ✓ Bootstrap with CORS + validation
│   ├── app.module.ts                     ✓ PrismaModule + PanoramaModule
│   ├── prisma/
│   │   ├── prisma.service.ts             ✓ Database connection service
│   │   └── prisma.module.ts              ✓ Reusable module
│   └── panorama/
│       ├── panorama.service.ts           ✓ Store & hotspot CRUD
│       ├── panorama.controller.ts        ✓ API endpoints
│       ├── panorama.module.ts            ✓ Feature module
│       ├── entities/
│       │   ├── store.entity.ts           ✓ Store DTO
│       │   └── hotspot.entity.ts         ✓ Hotspot DTO
│       └── dto/
│           ├── create-store.dto.ts       ✓ Validated input
│           ├── update-store.dto.ts       ✓ Partial updates
│           ├── create-hotspot.dto.ts     ✓ Coordinate validation (0.0-1.0)
│           └── update-hotspot.dto.ts     ✓ Partial updates
├── prisma/
│   └── schema.prisma                     ✓ Complete 11-model schema
├── .env                                  ✓ Local config
├── .env.example                          ✓ Template for deployment
├── dist/                                 ✓ Compiled JavaScript (ready to run)
└── package.json                          ✓ All dependencies installed
```

### Database Schema (Prisma)
**Implemented Models:**
- **Panorama**: Store, Hotspot
- **Clients**: Client, Prescription, Appointment
- **Eyewear**: Frame
- **Lenses**: Lens
- **Atelier**: Order, OrderItem, Purchase

See `prisma/schema.prisma` for full schema definition.

### API Endpoints (Ready)

#### Stores
```
POST   /api/panorama/stores                    Create store
GET    /api/panorama/stores                    List all stores
GET    /api/panorama/stores/:id                Get store with hotspots
PUT    /api/panorama/stores/:id                Update store
DELETE /api/panorama/stores/:id                Delete store
```

#### Hotspots
```
POST   /api/panorama/hotspots                  Create hotspot
GET    /api/panorama/hotspots/store/:storeId   Get hotspots for store
PUT    /api/panorama/hotspots/:id              Update hotspot
DELETE /api/panorama/hotspots/:id              Delete hotspot
```

## 🚀 Next Steps

### 1. Setup PostgreSQL Database
```bash
# Option A: Local PostgreSQL
# Install PostgreSQL, then:
createdb optiview_dev

# Option B: Docker
docker run --name optiview-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

### 2. Create Database Schema
```bash
cd optiview-backend
npx prisma migrate dev --name init
```

This will:
- Create all tables defined in `schema.prisma`
- Generate Prisma client types
- Create `prisma/migrations/` folder

### 3. Start Development Server
```bash
npm run start:dev
```

Server will run on `http://localhost:3000`

### 4. Test API Endpoints
```bash
# Create store
curl -X POST http://localhost:3000/api/panorama/stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Shop",
    "imageUrl": "https://example.com/panorama.jpg"
  }'

# Response: { "id": "...", "name": "Main Shop", ... }

# Get all stores
curl http://localhost:3000/api/panorama/stores
```

### 5. View Database
```bash
npx prisma studio
```
Opens GUI at `http://localhost:5555` to browse/edit data.

## 📝 Configuration

### Environment Variables (`.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/optiview_db"
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Update `DATABASE_URL` with your PostgreSQL credentials.

### Validation Rules (DTOs)

**CreateStoreDto**
- `name` (string, required)
- `imageUrl` (string, required)

**CreateHotspotDto**
- `storeId` (string, required)
- `module` (string, required) - e.g., "clients", "eyewear", "lenses", "atelier"
- `label` (string, required) - Display name
- `x`, `y`, `w`, `h` (number, 0.0-1.0, required) - Normalized coordinates

## 🔧 Available Scripts

```bash
npm run start          # Start server (production)
npm run start:dev      # Start with hot-reload (development)
npm run build          # Compile to /dist
npm run lint           # Check code style
npm run test           # Run unit tests
npm run test:cov       # Test coverage report
```

## 📦 Build & Deploy

### Production Build
```bash
npm run build
npm run start:prod
```

### Deploy to Render
1. Push to GitHub (`optiview-backend` repo)
2. Connect Render → GitHub repository
3. Set environment variables in Render dashboard
4. Deploy!

## ✨ Key Features Implemented

✅ Full NestJS + Prisma foundation
✅ CORS enabled for React frontend (localhost:5173)
✅ Request validation (class-validator)
✅ Normalized hotspot coordinates (0.0-1.0 range)
✅ Cascading deletes (store → hotspots)
✅ Type-safe database queries
✅ Hot-reload development server
✅ Production-ready build output

## 📌 Important Notes

1. **Database Required**: Must setup PostgreSQL before running migrations
2. **Hotspot Coordinates**: Always normalized 0.0-1.0 (% of image, not pixels)
3. **Unique Hotspot**: Only one hotspot per module per store (`@@unique([storeId, module])`)
4. **Soft Delete**: No soft deletes implemented - deletes are permanent
5. **Authentication**: Not implemented in Phase 1 (add in Phase 2 if needed)

## 🆘 Troubleshooting

**npm install errors (Windows)**
```bash
set NODE_OPTIONS=--tls-max-v1.2
npm install --force
```

**Prisma client not found**
```bash
npx prisma generate
```

**Database connection fails**
- Verify PostgreSQL is running: `psql -U postgres`
- Check `DATABASE_URL` in `.env`
- Ensure database name matches in URL

**Port already in use**
```bash
npm run start:dev -- --port 3001
```

---

**Ready for Phase 2?** Create Clients, Eyewear, Lenses, Atelier modules following the same pattern (service, controller, DTOs, entities).
