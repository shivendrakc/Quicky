import type { Product } from "../types";

export type ActionType = 'add' | 'remove' | 'none' | 'new' | 'unmatched'

export type CompareResult = {
    name: string
    description: string
    category: 'Normal item' | 'Dining chair'
    previousStock: number
    currentStock: number
    threshold: number
    action: ActionType
    reason: string
}

export type CompareSettings = {
    normalThreshold: number
    chairThreshold: number
    keywords: string[]
}

export const classifyProduct = (
    name: string,
    description: string,
    keywords: string[]
): 'Normal item' | 'Dining chair' => {
    const combined = `${name} ${description}`.toLowerCase()
    const isChair = keywords.some(kw => combined.includes(kw.toLowerCase()))
    return isChair ? 'Dining chair' : 'Normal item'
}

export const getAction = (
    previousStock: number,
    currentStock: number,
    threshold: number
): { action: ActionType, reason: string } => {
    const wasAbove = previousStock >= threshold
    const isAbove = currentStock >= threshold

    if (!wasAbove && isAbove) {
        return {
            action: 'add',
            reason: `Stock increased from ${previousStock} to ${currentStock} and crossed threshold ${threshold}`
        }
    }

    if (wasAbove && !isAbove) {
        return {
            action: 'remove',
            reason: `Stock dropped from ${previousStock} to ${currentStock} and fell below threshold ${threshold}`
        }
    }

    return {
        action: 'none',
        reason: 'No threshold crossed'
    }
}
export const compareSnapshots = (
    previous: Product[],
    current: Product[],
    settings: CompareSettings
): CompareResult[] => {

    const results: CompareResult[] = []

    const previousMap = new Map<string, Product>()
    previous.forEach(p => previousMap.set(p.name.trim().toLowerCase(), p))

    const currentMap = new Map<string, Product>()
    current.forEach(p => currentMap.set(p.name.trim().toLowerCase(), p))

    current.forEach(currentProduct => {
        const key = currentProduct.name.trim().toLowerCase()
        const previousProduct = previousMap.get(key)

        const category = classifyProduct(
            currentProduct.name,
            currentProduct.description,
            settings.keywords
        )

        const threshold = category === 'Dining chair'
            ? settings.chairThreshold
            : settings.normalThreshold

        const prevStock = previousProduct ? previousProduct.stock : 0

        const { action, reason } = getAction(
            prevStock,
            currentProduct.stock,
            threshold
        )

        results.push({
            name: currentProduct.name,
            description: currentProduct.description,
            category,
            previousStock: prevStock,
            currentStock: currentProduct.stock,
            threshold,
            action,
            reason
        })
    })



    return results
}