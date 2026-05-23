import { describe, expect, it } from 'vitest'

describe('Vitest Framework Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve(42)
    const result = await promise
    expect(result).toBe(42)
  })

  it('should have access to jest-dom matchers', () => {
    const div = document.createElement('div')
    div.innerHTML = '<span>Hello</span>'
    document.body.appendChild(div)
    expect(div).toBeInTheDocument()
    expect(div).toHaveTextContent('Hello')
    document.body.removeChild(div)
  })
})
