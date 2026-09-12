export const storage = { 
  get<T>(key: string, defaultValue: T): T { 
    try { 
      const item = localStorage.getItem(key) 
      if (item === null) return defaultValue 
      return JSON.parse(item) as T 
    } catch (error) { 
      console.error(`Lỗi đọc localStorage key "${key}":`, error) 
      return defaultValue 
    } 
  }, 
 
  set<T>(key: string, value: T): boolean { 
    try { 
      localStorage.setItem(key, JSON.stringify(value)) 
      return true 
    } catch (error) { 
      console.error(`Lỗi ghi localStorage key "${key}":`, error) 
      return false 
    } 
  }, 
 
  remove(key: string): boolean { 
    try { 
      localStorage.removeItem(key) 
      return true 
    } catch (error) { 
      console.error(`Lỗi xóa localStorage key "${key}":`, error) 
      return false 
    } 
  }, 
 
  clearAll(): boolean { 
    try { 
      localStorage.clear() 
      return true 
    } catch (error) { 
      console.error('Lỗi xóa toàn bộ localStorage:', error) 
      return false 
    } 
  }, 
} 
