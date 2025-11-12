# 🔄 Fase 3: Invalidaciones Inteligentes con Predicates

**Prioridad:** 🟡 Alta | **Esfuerzo:** 2-3 días | **Riesgo:** Bajo

**Prerequisito:** Fase 2 completada (Mutations implementadas)

---

## 📋 Objetivo

Optimizar las invalidaciones de cache usando **predicates** para invalidar múltiples query families en una sola llamada.

**Beneficios:**

- ✅ Menos código (1 llamada vs 5+)
- ✅ Más eficiente (un solo pase por cache)
- ✅ Más mantenible (lógica centralizada)

---

## 🎯 Patrón de Referencia (Cobrolox)

**Archivo:** `hooks/queries/use-payments.ts` (líneas 333-361)

```typescript
// useCreatePayment en Cobrolox
onSuccess: (createdPayment) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0]

      // Invalidar todas las queries de payments
      if (key === 'payments') return true

      // Invalidar invoices (balance cambió)
      if (key === 'invoices') return true

      // Invalidar customer-invoices del cliente específico
      if (key === 'customer-invoices' && query.queryKey[1] === createdPayment.customerId) {
        return true
      }

      // Invalidar customers (balance total cambió)
      if (key === 'customers') return true

      return false
    },
  })

  toast.success('Pago creado exitosamente')
}
```

---

## 🔧 Aplicación a Cobralon: useCreatePayment

```typescript
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePaymentPayload): Promise<Payment> => {
      // ... validaciones pre-fetch (ver Fase 4)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear pago')
      }

      return response.json()
    },
    onSuccess: (createdPayment) => {
      // ✅ Invalidación inteligente con predicate
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0]

          // Invalidar payments
          if (key === 'payments') return true

          // Invalidar projects (balance cambió)
          if (key === 'projects') return true

          // Invalidar customers (balance cambió)
          if (key === 'customers') return true

          // Invalidar aftersales (puede afectar visualización)
          if (key === 'aftersales') return true

          return false
        },
      })

      toast.success('Pago creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
      console.error('Error creating payment:', error)
    },
  })
}
```

---

## 📋 Mapa de Invalidaciones por Mutation

### CREATE Payment → Invalida

```typescript
predicate: (query) => {
  const key = query.queryKey[0]
  return ['payments', 'projects', 'customers'].includes(key)
}
```

### UPDATE Project → Invalida

```typescript
predicate: (query) => {
  const key = query.queryKey[0]
  return ['projects', 'aftersales', 'payments'].includes(key)
}
```

### DELETE Customer → Invalida

```typescript
predicate: (query) => {
  const key = query.queryKey[0]
  return ['customers', 'projects', 'payments'].includes(key)
}
```

### CREATE Aftersale → Invalida

```typescript
predicate: (query) => {
  const key = query.queryKey[0]
  return ['aftersales', 'projects'].includes(key)
}
```

---

## 🧪 Testing de Invalidaciones

```typescript
describe('useCreatePayment invalidations', () => {
  it('invalida queries relacionadas', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    // Mock success
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', customerId: 'abc' }),
    })

    await act(async () => {
      result.current.mutate(mockPaymentData)
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      })
    })
  })
})
```

---

## ✅ Checklist

- [ ] useCreatePayment usa predicate
- [ ] useUpdatePayment usa predicate
- [ ] useDeletePayment usa predicate
- [ ] useCreateProject usa predicate
- [ ] useUpdateProject usa predicate
- [ ] useDeleteProject usa predicate
- [ ] Todas las mutations tienen invalidaciones correctas

---

## 🚀 Siguiente Fase

→ **[Fase 4: Hooks Especializados Completos](./fase-4-hooks-especializados.md)**

---

**Última actualización:** 2025-11-12
