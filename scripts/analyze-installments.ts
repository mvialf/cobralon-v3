import * as fs from 'fs'
import * as path from 'path'

const paymentsFilePath = path.join(process.cwd(), 'payment.txt')
const paymentsContent = fs.readFileSync(paymentsFilePath, 'utf-8')
const paymentsLines = paymentsContent.split('\n').slice(2).filter((line) => line.trim())

console.log('📊 ANÁLISIS DE CUOTAS EN PAGOS\n')

const paymentsWithInstallments: Array<{
  line: number
  installments: number
  amount: number
  paymentMethod: string
  docId: string
}> = []

for (let i = 0; i < paymentsLines.length; i++) {
  const line = paymentsLines[i]
  const parts = line.split('\t')

  if (parts.length < 11) continue

  const [docId, amount, , , , installments, , paymentMethod] = parts

  const cleanInstallments = installments.trim() === '' ? 0 : parseInt(installments)

  if (cleanInstallments > 0) {
    paymentsWithInstallments.push({
      line: i + 3, // +3 porque saltamos 2 líneas de header y arrays son 0-indexed
      installments: cleanInstallments,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod.replace(/"/g, ''),
      docId: docId,
    })
  }
}

console.log(`Total de pagos con cuotas: ${paymentsWithInstallments.length}\n`)

// Agrupar por número de cuotas
const byInstallments = new Map<number, number>()
for (const payment of paymentsWithInstallments) {
  const count = byInstallments.get(payment.installments) || 0
  byInstallments.set(payment.installments, count + 1)
}

console.log('📈 DISTRIBUCIÓN POR NÚMERO DE CUOTAS:\n')
const sortedInstallments = Array.from(byInstallments.entries()).sort((a, b) => a[0] - b[0])
for (const [installments, count] of sortedInstallments) {
  console.log(`${installments} cuota(s): ${count} pago(s)`)
}

console.log('\n📝 DETALLE DE PAGOS CON CUOTAS:\n')
const sortedPayments = paymentsWithInstallments.sort((a, b) => a.installments - b.installments)

for (const payment of sortedPayments) {
  console.log(`Línea ${payment.line}:`)
  console.log(`  Cuotas: ${payment.installments}`)
  console.log(`  Monto: $${payment.amount.toLocaleString('es-CL')}`)
  console.log(`  Método: ${payment.paymentMethod}`)
  console.log(`  ID: ${payment.docId}`)
  console.log('')
}

// Verificar si todos los pagos con cuotas son tarjeta de crédito
console.log('🔍 VERIFICACIÓN DE MÉTODO DE PAGO:\n')
const notCreditCard = paymentsWithInstallments.filter(
  (p) => !p.paymentMethod.toLowerCase().includes('tarjeta')
)

if (notCreditCard.length === 0) {
  console.log('✅ Todos los pagos con cuotas son tarjeta de crédito')
} else {
  console.log(`⚠️  Hay ${notCreditCard.length} pago(s) con cuotas que NO son tarjeta de crédito:`)
  for (const payment of notCreditCard) {
    console.log(`  - Línea ${payment.line}: ${payment.paymentMethod}`)
  }
}
