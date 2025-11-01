# Principle 3: Data Down, Events Up

**Regla:** Componentes reciben data como props, emiten eventos vía callbacks.

## The Pattern

```
[Parent Component]
    ↓ data (props)
[Child Component]
    ↑ events (callbacks)
[Parent Component]
```

**En español:**

- **Data baja** (parent → child vía props)
- **Eventos suben** (child → parent vía callbacks)

## Por qué

- ✅ **Componentes reutilizables** - No acoplados a estado global
- ✅ **Testing más fácil** - Mock props y callbacks
- ✅ **Menos acoplamiento** - Child no conoce implementación de parent
- ✅ **Flujo de datos predecible** - Unidirectional data flow

## Ejemplo Correcto

### ✅ CORRECTO: Data down, events up

```typescript
// components/forms/products/product-form.tsx
interface ProductFormProps {
  initialData?: Product // ← Data down
  onSuccess: () => void // ← Events up
  onCancel: () => void  // ← Events up
}

export function ProductForm({
  initialData,
  onSuccess,
  onCancel
}: ProductFormProps) {
  const form = useForm<ProductFormData>({
    defaultValues: initialData || { name: '', price: 0 }
  })

  async function handleSubmit(data: ProductFormData) {
    await saveProduct(data)
    onSuccess() // ← Emit event up
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Input {...form.register('name')} />
      <Button type="submit">Save</Button>
      <Button type="button" onClick={onCancel}>Cancel</Button>
    </form>
  )
}
```

**Uso:**

```typescript
// components/dialogs/products/new-product-dialog.tsx
export function NewProductDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <ProductForm
          onSuccess={() => {
            setOpen(false)         // ← Parent decide qué hacer
            toast.success('Saved!')
            router.refresh()
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
```

**Beneficios:**

- ✅ `ProductForm` es reutilizable (no sabe sobre Dialog)
- ✅ Parent controla qué pasa después del submit
- ✅ Fácil de testear (mock callbacks)

---

### ❌ INCORRECTO: Componente maneja su propio estado global

```typescript
// ❌ Tight coupling con estado global
'use client'

import { useProductsStore } from '@/stores/products-store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ProductForm() {
  const { products, addProduct } = useProductsStore() // ← Acoplamiento
  const router = useRouter()

  async function handleSubmit(data) {
    await saveProduct(data)
    addProduct(data)           // ← Modifica estado global directamente
    toast.success('Saved!')    // ← Side effect hardcodeado
    router.push('/products')   // ← Navegación hardcodeada
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**Problemas:**

- ❌ NO reutilizable (acoplado a store específico)
- ❌ Difícil de testear (necesitas mockear store, router, toast)
- ❌ Side effects hardcodeados (toast, navegación)
- ❌ Parent NO puede customizar comportamiento

---

## Patrón Completo: CRUD Example

### Parent Component (orchestrator)

```typescript
// app/products/page.tsx
'use client'

import { useState } from 'react'
import { ProductsTable } from '@/components/tables/products-table'
import { NewProductDialog } from '@/components/dialogs/products/new-product-dialog'

export default function ProductsPage({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts)

  async function handleProductCreated() {
    // Parent decide cómo actualizar lista
    const updated = await fetch('/api/products').then(r => r.json())
    setProducts(updated)
  }

  return (
    <div>
      <NewProductDialog onSuccess={handleProductCreated} /> {/* ← Event up */}
      <ProductsTable data={products} />                     {/* ← Data down */}
    </div>
  )
}
```

---

### Child Component (reusable form)

```typescript
// components/forms/products/product-form.tsx
interface ProductFormProps {
  initialData?: Product
  onSuccess: () => void
  onCancel?: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  async function handleSubmit(data) {
    await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    onSuccess() // ← Emit event, parent decide qué hacer
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button type="submit">Save</Button>
      {onCancel && <Button onClick={onCancel}>Cancel</Button>}
    </form>
  )
}
```

**Reutilización:**

```typescript
// Caso 1: Crear en dialog
<ProductForm
  onSuccess={() => {
    setDialogOpen(false)
    router.refresh()
  }}
  onCancel={() => setDialogOpen(false)}
/>

// Caso 2: Editar en página dedicada
<ProductForm
  initialData={product}
  onSuccess={() => router.push('/products')}
/>

// Caso 3: Quick create inline
<ProductForm
  onSuccess={() => {
    fetchProducts()
    setShowForm(false)
  }}
/>
```

**Mismo componente, 3 contextos diferentes!**

---

## Advanced: Pasar Data Compleja

### Caso 1: Función como prop (data derivada)

```typescript
// Parent
<ProductCard
  product={product}
  getPrice={(p) => p.price * (1 + taxRate)} // ← Function down
  onBuy={(p) => handleBuy(p)}               // ← Event up
/>

// Child
interface ProductCardProps {
  product: Product
  getPrice: (product: Product) => number // ← Receive function
  onBuy: (product: Product) => void
}

export function ProductCard({ product, getPrice, onBuy }) {
  const price = getPrice(product) // ← Call parent's function

  return (
    <div>
      {product.name} - ${price}
      <button onClick={() => onBuy(product)}>Buy</button>
    </div>
  )
}
```

---

### Caso 2: Render props

```typescript
// Parent
<DataFetcher
  url="/api/products"
  render={(data, loading) => {
    if (loading) return <Spinner />
    return <ProductsList products={data} />
  }}
/>

// Child (reusable fetcher)
interface DataFetcherProps<T> {
  url: string
  render: (data: T[], loading: boolean) => React.ReactNode
}

export function DataFetcher<T>({ url, render }: DataFetcherProps<T>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [url])

  return <>{render(data, loading)}</>
}
```

---

## Testing Benefits

### Antes (coupled - difícil de testear)

```typescript
// ❌ Necesitas mockear store, router, toast...
test('should save product', () => {
  const mockStore = { addProduct: vi.fn() }
  const mockRouter = { push: vi.fn() }

  render(
    <StoreProvider value={mockStore}>
      <RouterProvider value={mockRouter}>
        <ProductForm />
      </RouterProvider>
    </StoreProvider>
  )

  // ... complicated test setup
})
```

---

### Después (decoupled - fácil de testear)

```typescript
// ✅ Solo mock callbacks
test('should call onSuccess after save', async () => {
  const mockOnSuccess = vi.fn()

  render(<ProductForm onSuccess={mockOnSuccess} />)

  await userEvent.type(screen.getByLabelText('Name'), 'Widget')
  await userEvent.click(screen.getByText('Save'))

  expect(mockOnSuccess).toHaveBeenCalled()
})
```

**Mucho más simple!**

---

## Common Mistakes

### ❌ Mistake 1: Child modifica prop directamente

```typescript
// ❌ NUNCA modifiques props directamente
export function ProductForm({ product }) {
  product.name = 'New name' // ❌ Mutating prop!
  return <div>{product.name}</div>
}
```

**Fix:** Usa callback para comunicar cambio:

```typescript
// ✅ Emit event up
export function ProductForm({ product, onUpdate }) {
  const handleChange = (newName) => {
    onUpdate({ ...product, name: newName }) // ← Parent decide qué hacer
  }

  return <input onChange={e => handleChange(e.target.value)} />
}
```

---

### ❌ Mistake 2: Event no devuelve data necesaria

```typescript
// ❌ Parent no sabe QUÉ producto se guardó
<ProductForm onSuccess={() => console.log('Saved')} />

// Parent necesita saber el ID para navegar:
router.push(`/products/${productId}`) // ← ¿De dónde sale productId?
```

**Fix:** Event devuelve data necesaria:

```typescript
// ✅ Event incluye data
<ProductForm onSuccess={(savedProduct) => {
  console.log('Saved', savedProduct.id)
  router.push(`/products/${savedProduct.id}`)
}} />

// Child emite con data
export function ProductForm({ onSuccess }) {
  async function handleSubmit(data) {
    const saved = await saveProduct(data)
    onSuccess(saved) // ← Pass saved product
  }
}
```

---

### ❌ Mistake 3: Demasiados niveles (prop drilling)

```typescript
// ❌ Props pasando por 5 niveles
<GrandParent>
  <Parent onSave={handleSave}>
    <Child onSave={handleSave}>
      <GrandChild onSave={handleSave}>
        <Form onSave={handleSave} />
      </GrandChild>
    </Child>
  </Parent>
</GrandParent>
```

**Fix:** Usar Context para datos compartidos:

```typescript
// ✅ Context para estado compartido
const ProductContext = createContext()

<ProductContext.Provider value={{ onSave: handleSave }}>
  <GrandParent>
    {/* No need to pass props through every level */}
  </GrandParent>
</ProductContext.Provider>

// En Form (deep child):
const { onSave } = useContext(ProductContext)
```

---

## Checklist

Antes de implementar un componente, verifica:

- [ ] ¿Recibe data como props (no fetch interno)?
- [ ] ¿Emite eventos vía callbacks (no modifica global state)?
- [ ] ¿Es reutilizable en diferentes contextos?
- [ ] ¿Se puede testear sin mocks complejos?

**Si 4/4 son SÍ → Good job!**

---

## Related

- [Pattern 2: CRUD Operations](../patterns/2-crud-operations.md) - Data down, events up en acción
- [Anti-Pattern: Mixing Concerns](../common-pitfalls/7-mixing-concerns.md)
- [Testing Strategy](../testing-strategy/) - Testing con mocks simples

---

**Remember:** Data flows down (props), events flow up (callbacks). Keep components decoupled and reusable.
