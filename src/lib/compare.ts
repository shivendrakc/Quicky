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

        const isFirstUpload = previous.length === 0

        if (!previousProduct) {
            if (isFirstUpload) {
                const isAbove = currentProduct.stock >= threshold
                results.push({
                    name: currentProduct.name,
                    description: currentProduct.description,
                    category,
                    previousStock: 0,
                    currentStock: currentProduct.stock,
                    threshold,
                    action: isAbove ? 'add' : 'none',
                    reason: isAbove 
                        ? `Initial upload: Stock ${currentProduct.stock} meets threshold ${threshold}`
                        : `Initial upload: Stock ${currentProduct.stock} is below threshold ${threshold}`
                })
            } else {
                results.push({
                    name: currentProduct.name,
                    description: currentProduct.description,
                    category,
                    previousStock: 0,
                    currentStock: currentProduct.stock,
                    threshold,
                    action: 'new',
                    reason: 'Product not found in previous upload'
                })
            }
            return
        }

        const { action, reason } = getAction(
            previousProduct.stock,
            currentProduct.stock,
            threshold
        )

        results.push({
            name: currentProduct.name,
            description: currentProduct.description,
            category,
            previousStock: previousProduct.stock,
            currentStock: currentProduct.stock,
            threshold,
            action,
            reason
        })
    })

    previous.forEach(previousProduct => {
        const key = previousProduct.name.trim().toLowerCase()
        if (!currentMap.has(key)) {
            results.push({
                name: previousProduct.name,
                description: previousProduct.description,
                category: classifyProduct(
                    previousProduct.name,
                    previousProduct.description,
                    settings.keywords
                ),
                previousStock: previousProduct.stock,
                currentStock: 0,
                threshold: 0,
                action: 'unmatched',
                reason: 'Product missing from current upload'
            })
        }
    })

    return results
}