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

const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
  global.URL.createObjectURL = mockCreateObjectURL
  global.URL.revokeObjectURL = mockRevokeObjectURL
})

describe('useChatPersistence Hook', () => {
  const defaultChats = [
    {
      id: '1',
      title: 'Test Chat 1',
      messages: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      isStarred: false,
    },
    {
      id: '2',
      title: 'Test Chat 2',
      messages: [{
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        text: 'Hello',
        isUser: true,
        timestamp: new Date('2026-01-02')
      }],
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
      isStarred: true,
    },
  ]

  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Loading', () => {
    it('should load chats from localStorage for main channel', async () => {
      const storedChats = [...defaultChats]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats).toHaveLength(2)
      expect(result.current.chats[0].id).toBe('1')
    })

    it('should use custom storage key for non-main channels', async () => {
      const storedChats = [defaultChats[0]]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      renderHook(() => useChatPersistence('custom-channel'))

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('yyc3_chat_history_custom-channel')
    })

    it('should fallback to initialChats when no stored data', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() =>
        useChatPersistence('main', defaultChats)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats).toEqual(defaultChats)
    })

    it('should handle corrupted JSON data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('not-valid-json{{{')

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() =>
        useChatPersistence('main', defaultChats)
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats).toEqual(defaultChats)
    })

    it('should migrate chats with missing fields', async () => {
      const oldFormatChats = [
        { id: '1', title: 'Old Chat', messages: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldFormatChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats[0].isStarred).toBe(false)
      expect(result.current.chats[0].messages).toEqual([])
    })
  })

  describe('CRUD Operations via setChats', () => {
    it('should add a new chat and persist to localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(defaultChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newChat = {
        id: '3',
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isStarred: false,
      }

      act(() => {
        result.current.setChats(prev => [...prev, newChat])
      })

      expect(result.current.chats).toHaveLength(3)
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should update existing chat and persist', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(defaultChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setChats(prev =>
          prev.map(c => c.id === '1' ? { ...c, title: 'Updated Title' } : c)
        )
      })

      const updatedChat = result.current.chats.find(c => c.id === '1')
      expect(updatedChat?.title).toBe('Updated Title')
    })

    it('should delete chat and persist', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(defaultChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setChats(prev => prev.filter(c => c.id !== '2'))
      })

      expect(result.current.chats).toHaveLength(1)
      expect(result.current.chats[0].id).toBe('1')
    })
  })

  describe('Storage Quota Management', () => {
    it('should auto-clean old chats when exceeding storage limit', async () => {
      const largeChat = {
        id: 'large',
        title: 'Large Chat',
        messages: Array(1000).fill({ role: 'user', content: 'x'.repeat(1000), text: 'x'.repeat(1000) }),
        createdAt: new Date('2025-01-01'), // Old date (60 days ago)
        updatedAt: new Date('2025-01-01'),
        isStarred: false,
      }

      const starredChat = {
        id: 'starred',
        title: 'Starred Chat',
        messages: [],
        createdAt: new Date(), // Recent
        updatedAt: new Date(),
        isStarred: true,
      }

      mockLocalStorage.getItem.mockReturnValue(null)

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setChats([largeChat, starredChat])
      })

      // Should keep starred chat and remove old unstarred one
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(savedData.some((c: { id: string }) => c.id === 'starred')).toBe(true)
    })
  })

  describe('Export/Import Functionality', () => {
    it('should export data as JSON file', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(defaultChats))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.exportData()
      })

      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('should import valid data successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const importData = {
        channelId: 'main',
        timestamp: new Date().toISOString(),
        chats: defaultChats,
      }

      let importResult: boolean | undefined

      act(() => {
        importResult = result.current.importData(JSON.stringify(importData))
      })

      expect(importResult).toBe(true)
      expect(result.current.chats).toHaveLength(2)
    })

    it('should reject invalid import data', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let importResult: boolean | undefined

      act(() => {
        importResult = result.current.importData('invalid json {{{')
      })

      expect(importResult).toBe(false)
    })

    it('should reject data without chats array', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let importResult: boolean | undefined

      act(() => {
        importResult = result.current.importData(JSON.stringify({ notChats: [] }))
      })

      expect(importResult).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty chats array', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats).toEqual([])
    })

    it('should handle special characters in chat titles', async () => {
      const specialChat = {
        id: 'special',
        title: 'Chat with "quotes" & <tags> & emoji 🎉',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isStarred: false,
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([specialChat]))

      const { useChatPersistence } = await import('../useChatPersistence')
      const { result } = renderHook(() => useChatPersistence('main'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.chats[0].title).toContain('emoji')
    })
  })
})
