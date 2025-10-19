# Database Setup Guide - Prisma + Neon

Guía completa para configurar la base de datos PostgreSQL con Prisma ORM y Neon en tu proyecto.

## 📋 Prerequisitos

- Node.js 20.x o superior
- Cuenta en [Neon](https://neon.tech) (gratuita)
- Este template ya incluye Prisma configurado

## 🚀 Setup en 5 Pasos

### **Paso 1: Crear Proyecto en Neon**

1. Visita [https://neon.tech](https://neon.tech)
2. Inicia sesión o crea una cuenta gratuita
3. Click en **"New Project"**
4. Configura tu proyecto:
   - **Project name**: Nombre descriptivo (ej: `mi-saas-app`)
   - **Region**: Selecciona la más cercana a tus usuarios
     - US East (Ohio) - `us-east-2` (recomendado para Latinoamérica)
     - US West (Oregon) - `us-west-2`
     - Europe (Frankfurt) - `eu-central-1`
   - **Postgres version**: Dejar por defecto (16.x)
5. Click **"Create Project"**

### **Paso 2: Obtener Connection Strings**

Neon crea automáticamente dos branches:

- **`main`** (producción) - Compute más grande
- **`dev`** (desarrollo) - Compute más pequeño

Para desarrollo local, usa el branch `dev`:

1. En el dashboard de Neon, selecciona el branch **`dev`**
2. Click en **"Connection Details"**
3. Verás dos tipos de conexión:

#### **A) Pooled Connection** (para queries de la app)

```
Connection string: postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb
```

- Nota el sufijo **`-pooler`** en el hostname
- Usa esta para `DATABASE_URL`

#### **B) Direct Connection** (para migraciones)

```
Direct connection: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb
```

- SIN el sufijo `-pooler`
- Usa esta para `DIRECT_URL`

### **Paso 3: Configurar Variables de Entorno**

1. **Copia el archivo de ejemplo:**

   ```bash
   cp .env.example .env.local
   ```

2. **Edita `.env.local`** con tus credenciales de Neon:

   ```bash
   # Pooled connection (copia de Neon dashboard)
   DATABASE_URL="postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

   # Direct connection (SIN -pooler)
   DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

   **⚠️ Importante:**
   - Reemplaza `user`, `password`, y `ep-xxx` con tus valores reales
   - Asegúrate de incluir `?sslmode=require` al final
   - NO commitees `.env.local` a git (ya está en `.gitignore`)

### **Paso 4: Generar Prisma Client y Aplicar Schema**

```bash
# 1. Generar Prisma Client (crea tipos TypeScript)
npm run db:generate

# 2. Aplicar schema a la base de datos
npm run db:push
```

**Salida esperada:**

```
✔ Generated Prisma Client
✔ The database is now in sync with your Prisma schema
```

### **Paso 5: (Opcional) Seed Data de Ejemplo**

```bash
# Poblar DB con usuarios de ejemplo
npm run db:seed
```

**Salida esperada:**

```
🌱 Seeding database...
✅ Seed completed successfully
📊 Created/Updated users: { user1: {...}, user2: {...} }
```

---

## ✅ Verificación

### **1. Prisma Studio (GUI para ver datos)**

```bash
npm run db:studio
```

Se abrirá http://localhost:5555 con una interfaz visual para:

- Ver todos los modelos (User, etc.)
- Crear/editar/eliminar registros
- Ejecutar queries

### **2. Test API Route**

El template incluye `/api/users` de ejemplo:

```bash
# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, probar el endpoint:
curl http://localhost:3000/api/users
```

**Respuesta esperada:**

```json
{
  "data": [
    {
      "id": "uuid-here",
      "email": "demo@example.com",
      "name": "Demo User",
      "createdAt": "2025-01-17T...",
      "updatedAt": "2025-01-17T..."
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## 📚 Scripts Disponibles

| Comando                     | Descripción                                      |
| --------------------------- | ------------------------------------------------ |
| `npm run db:generate`       | Genera Prisma Client (después de cambiar schema) |
| `npm run db:push`           | Aplica schema a DB sin crear migración (dev)     |
| `npm run db:migrate`        | Crea migración y la aplica (producción)          |
| `npm run db:migrate:deploy` | Aplica migraciones pendientes (CI/CD)            |
| `npm run db:studio`         | Abre Prisma Studio (GUI)                         |
| `npm run db:seed`           | Ejecuta seed script                              |

---

## 🛠️ Personalizar el Schema

### **Editar `prisma/schema.prisma`**

```prisma
// Ejemplo: Agregar modelo Post
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published])
}

// Actualizar modelo User para la relación
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]   // ← Agregar esta línea
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

### **Aplicar cambios**

```bash
# Desarrollo (más rápido, no crea migración)
npm run db:push

# Producción (crea migración versionada)
npm run db:migrate
```

---

## 🔄 Workflow Recomendado

### **Desarrollo Local**

1. Modificar `prisma/schema.prisma`
2. `npm run db:push` (aplica cambios inmediatamente)
3. `npm run db:generate` (regenera tipos TypeScript)
4. Desarrollar features

### **Producción / CI/CD**

1. Modificar `prisma/schema.prisma`
2. `npm run db:migrate` (crea migración versionada)
3. Commit migración a git
4. Deploy → `npm run db:migrate:deploy` (aplica migraciones)

---

## 🌿 Database Branching (Feature de Neon)

Neon permite crear "branches" de tu DB como Git:

```bash
# Crear branch para nueva feature
neon branches create --name feature-payments

# Obtener connection string del branch
neon connection-string feature-payments

# Usar en .env.local temporal
DATABASE_URL="postgresql://...feature-payments..."

# Desarrollar sin afectar 'main'
npm run db:push

# Si funciona → merge
# Si no → delete branch
neon branches delete feature-payments
```

**Beneficio:** Cambios destructivos sin miedo. Cada feature puede tener su propia DB.

---

## ❓ Troubleshooting

### **Error: `P1001: Can't reach database server`**

**Causa:** Connection string incorrecta o DB no accesible.

**Solución:**

1. Verifica que `.env.local` existe y tiene las credenciales correctas
2. Verifica que incluyes `?sslmode=require` en las URLs
3. Verifica que el proyecto Neon está activo (no suspendido)

### **Error: `Environment variable not found: DATABASE_URL`**

**Causa:** `.env.local` no existe o Next.js no lo carga.

**Solución:**

```bash
# Verificar que existe
ls -la .env.local

# Si no existe, copiar ejemplo
cp .env.example .env.local

# Reiniciar servidor dev
npm run dev
```

### **Error: `Table 'User' does not exist`**

**Causa:** Schema no aplicado a la DB.

**Solución:**

```bash
npm run db:push
```

### **Queries lentas después de inactividad**

**Causa:** Neon suspende compute después de 5 min sin actividad (free tier).

**Comportamiento esperado:**

- Primera query después de inactividad: ~500ms-1s (cold start)
- Queries subsecuentes: <10ms

**Solución:** No es un error. En producción considera plan Pro con compute activo 24/7.

---

## 📖 Recursos Adicionales

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Prisma + Neon Guide](https://neon.tech/docs/guides/prisma)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## 🎯 Siguientes Pasos

1. ✅ **DB configurada** - Ya puedes hacer queries con Prisma
2. 🔐 **Agregar Autenticación** - Considerar NextAuth.js
3. 🎨 **Crear tus modelos** - Customizar `schema.prisma`
4. 🚀 **Desarrollar features** - Usar Prisma Client en API routes/Server Components

---

**¿Problemas?** Abre un issue en el repositorio del template.
