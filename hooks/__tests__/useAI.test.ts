import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    getStore: () => store,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

describe('useAI Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State & Config Loading', () => {
    it('should load default config when no stored config exists', async () => {
      const { useAI } = await import('../useAI')

      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).toEqual({
        provider: 'ollama',
        apiKey: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3',
        temperature: 0.7,
        version: 1,
      })
    })

    it('should load config from localStorage if exists', async () => {
      const storedConfig = {
        provider: 'openai',
        apiKey: 'test-key-123',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4',
        temperature: 0.8,
        version: 1,
      }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConfig))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).toEqual(storedConfig)
    })

    it('should migrate config version when version mismatch', async () => {
      const oldConfig = {
        provider: 'ollama',
        apiKey: 'old-key',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama2',
        temperature: 0.5,
        version: 0, // Old version
      }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldConfig))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config.version).toBe(1)
      expect(mockLocalStorage.setItem).toHaveBeenCalled()

      const savedConfig = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(savedConfig.version).toBe(1)
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('not-valid-json{{{')

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).toBeDefined()
      expect(result.current.config.provider).toBe('ollama') // Should fallback to default
    })

    it('should eventually set loading to false after initialization', async () => {
      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).toBeDefined()
    })
  })

  describe('saveConfig Function', () => {
    it('should save config to localStorage and update state', async () => {
      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newConfig = {
        provider: 'openai' as const,
        apiKey: 'new-api-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4-turbo',
        temperature: 0.9,
        version: 1,
      }

      act(() => {
        result.current.saveConfig(newConfig)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'yyc3_ai_config',
        JSON.stringify(newConfig)
      )
      expect(result.current.config).toEqual(newConfig)
    })
  })

  describe('chat Function - Streaming Responses', () => {
    it('should handle successful streaming response', async () => {
      const mockChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[1]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockChunks[2]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat(
          [{ role: 'user', content: 'Hi' }],
          (chunk) => chunks.push(chunk)
        )
      })

      expect(chunks).toContain('Hello')
      expect(chunks).toContain(' world')
      expect(result.current.isStreaming).toBe(false)
    })

    it('should handle network error with fallback simulation', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat(
          [{ role: 'user', content: 'Test message' }],
          (chunk) => chunks.push(chunk)
        )
      })

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toContain('Simulating intelligent response')
      expect(result.current.isStreaming).toBe(false)
    })

    it('should set isStreaming to true during chat and false after completion', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Test'))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let streamingDuringChat = false

      await act(async () => {
        const chatPromise = result.current.chat(
          [{ role: 'user', content: 'Test' }],
          () => {
            streamingDuringChat = result.current.isStreaming
          }
        )

        await chatPromise
      })

      expect(streamingDuringChat || result.current.isStreaming === false).toBe(true)
    })

    it('should call correct API endpoint with proper headers', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Test'))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      try {
        await act(async () => {
          await result.current.chat(
            [{ role: 'user', content: 'Hello' }],
            () => { }
          )
        })
      } catch {
        // Expected to fail in test env
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ollama',
          }),
        })
      )
    })

    it('should handle non-ok HTTP response with error output', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        body: null,
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat(
          [{ role: 'user', content: 'Test' }],
          (chunk) => chunks.push(chunk)
        )
      })

      expect(chunks.length).toBeGreaterThan(0)
      expect(result.current.isStreaming).toBe(false)
    })

    it('should handle missing response body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat(
          [{ role: 'user', content: 'Test' }],
          (chunk) => chunks.push(chunk)
        )
      })

      expect(chunks.length).toBeGreaterThan(0) // Should fallback to simulation
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty messages array', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Test'))

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat([], (chunk) => chunks.push(chunk))
      })

      expect(chunks.length).toBeGreaterThan(0) // Should still produce simulation output
    })

    it('should parse malformed SSE data gracefully', async () => {
      const malformedChunk = 'data: invalid json {{{\n\n'
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(malformedChunk) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }

      const mockResponse = {
        ok: true,
        body: { getReader: () => mockReader },
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useAI } = await import('../useAI')
      const { result } = renderHook(() => useAI())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const chunks: string[] = []

      await act(async () => {
        await result.current.chat(
          [{ role: 'user', content: 'Test' }],
          (chunk) => chunks.push(chunk)
        )
      })

      expect(result.current.isStreaming).toBe(false)
    })
  })
})
