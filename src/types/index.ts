export type Product = {
    name: string
    description: string
    stock: number
}

export type ValidationStatus = 'idle' | 'valid' | 'invalid'