# Pattern 4: Complex Relations (N:M)

## Pattern 4: Complex Relations (N:M)

### When to Use

- Many-to-many relationships
- Allocation/assignment scenarios
- Join tables con data adicional
- Aggregations complejas

**Ejemplos:**

- Order con OrderItems (Order ← OrderItem → Product)
- Project con Payments vía Allocations
- User con Roles vía UserRole

---

### Architecture

```
┌─────────────────────────┐
│  Server Component       │
│                         │
│  1. Fetch with includes │
│  2. Transform N:M       │
│  3. Pass processed data │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Transformer (optional) │
│                         │
│  - Flatten structure    │
│  - Calculate aggregates │
│  - Group/filter         │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Client Component       │
│                         │
│  Display data           │
└─────────────────────────┘
```

---

### Example: Order with Line Items

**Database schema:**

```prisma
model Order {
  id          String      @id @default(uuid())
  orderNumber String      @unique
  customerId  String
  customer    Customer    @relation(fields: [customerId], references: [id])
  items       OrderItem[]
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id         String  @id @default(uuid())
  orderId    String
  order      Order   @relation(fields: [orderId], references: [id])
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  quantity   Int
  unitPrice  Decimal @db.Decimal(12, 2)
}

model Product {
  id    String @id @default(uuid())
  name  String
  price Decimal @db.Decimal(12, 2)
}
```

---

#### Step 1: Fetch with Includes

```typescript
// app/orders/[id]/page.tsx
import { db } from '@/lib/db'
import { calculateOrderTotals } from '@/lib/transformers/order-transformers'
import { OrderDetailsView } from '@/components/orders/order-details-view'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!order) {
    return <div>Order not found</div>
  }

  // Transform if complex (>10 lines)
  const totals = calculateOrderTotals(order)

  return (
    <AppLayout pageTitle={`Order #${order.orderNumber}`}>
      <OrderDetailsView order={order} totals={totals} />
    </AppLayout>
  )
}
```

---

#### Step 2: Transformer (Pure Functions)

```typescript
// lib/transformers/order-transformers.ts
import type { OrderWithItems } from '@/lib/types/order.types'

export interface OrderTotals {
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

/**
 * Calculate order totals from line items
 */
export function calculateOrderTotals(order: OrderWithItems): OrderTotals {
  const subtotal = order.items.reduce((sum, item) => {
    return sum + item.quantity * Number(item.unitPrice)
  }, 0)

  const tax = subtotal * 0.19 // 19% IVA

  return {
    subtotal,
    tax,
    total: subtotal + tax,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

/**
 * Group order items by product category
 */
export function groupItemsByCategory(items: OrderItem[]): Record<string, OrderItem[]> {
  return items.reduce(
    (acc, item) => {
      const category = item.product.category.name
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    },
    {} as Record<string, OrderItem[]>
  )
}
```

---

#### Step 3: Display Components

```typescript
// components/orders/order-details-view.tsx
'use client'

import type { OrderWithItems, OrderTotals } from '@/lib/types/order.types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  order: OrderWithItems
  totals: OrderTotals
}

export function OrderDetailsView({ order, totals }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Order #{order.orderNumber}</h2>
        <p className="text-muted-foreground">
          Customer: {order.customer.name}
        </p>
      </div>

      <OrderItemsTable items={order.items} />

      <OrderSummary totals={totals} />
    </div>
  )
}

function OrderItemsTable({ items }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.product.name}</td>
            <td>{item.quantity}</td>
            <td>{formatCurrency(item.unitPrice)}</td>
            <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OrderSummary({ totals }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Subtotal ({totals.itemCount} items)</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax (19%)</span>
        <span>{formatCurrency(totals.tax)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
    </div>
  )
}
```

---

### Testing N:M Transformers

```typescript
// lib/transformers/__tests__/order-transformers.test.ts
import { describe, it, expect } from 'vitest'
import { calculateOrderTotals } from '../order-transformers'

describe('calculateOrderTotals', () => {
  it('should calculate totals correctly', () => {
    const order = {
      id: '1',
      items: [
        { quantity: 2, unitPrice: 1000, product: { name: 'A' } },
        { quantity: 1, unitPrice: 500, product: { name: 'B' } },
      ],
    }

    const totals = calculateOrderTotals(order)

    expect(totals.subtotal).toBe(2500)
    expect(totals.tax).toBe(475) // 19% of 2500
    expect(totals.total).toBe(2975)
    expect(totals.itemCount).toBe(3)
  })

  it('should handle empty order', () => {
    const order = { id: '1', items: [] }
    const totals = calculateOrderTotals(order)

    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)
    expect(totals.itemCount).toBe(0)
  })
})
```
\n---

## Related

- [Pattern 2: CRUD Operations](2-crud-operations.md)
- [Pattern 3: Modal/Dialog](3-modal-dialog-interactions.md)
- [Core Principle: Extract When It Hurts](../core-principles/2-extract-when-it-hurts.md)

---

**Done with Patterns!** Check [Decision Framework](../decision-framework/) next.
