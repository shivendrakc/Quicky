import * as XLSX from 'xlsx'
import type { Product } from '../types'

const REQUIRED_COLUMNS = [
    'Display Name',
    'Description',
    'Revesby Warehouse - SOH'
]

export type ParseResult = {
    valid: boolean
    missingColumns: string[]
    products: Product[]
    rawHeaders: string[]
}

export const parseSpreadsheet = async (file: File): Promise<ParseResult> => {
    try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' })
        
        if (jsonData.length === 0) {
            return { valid: false, missingColumns: REQUIRED_COLUMNS, products: [], rawHeaders: [] }
        }

        const rawHeaders = (jsonData[0] || []).map(h => String(h).trim())

        const missingColumns = REQUIRED_COLUMNS.filter(
            col => !rawHeaders.includes(col)
        )

        if (missingColumns.length > 0) {
            return { valid: false, missingColumns, products: [], rawHeaders }
        }

        const nameIdx = rawHeaders.indexOf('Display Name')
        const descIdx = rawHeaders.indexOf('Description')
        const stockIdx = rawHeaders.indexOf('Revesby Warehouse - SOH')

        const products: Product[] = []

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length === 0) continue

            const name = String(row[nameIdx] || '')
            if (!name || name.trim() === '') continue

            const stockVal = row[stockIdx]
            let stock = 0
            if (typeof stockVal === 'number') {
                stock = stockVal
            } else if (typeof stockVal === 'string') {
                stock = Number(stockVal.replace(/[^\d.-]/g, '')) || 0
            }

            products.push({
                name,
                description: String(row[descIdx] || ''),
                stock
            })
        }

        return { valid: true, missingColumns: [], products, rawHeaders }
    } catch (err) {
        throw err
    }
}