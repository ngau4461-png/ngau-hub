const DB_NAME = 'study-hub-image-storage'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface StoredImage {
  id: string
  blob: Blob
  name: string
  type: string
  createdAt: number
}

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(
        new Error(
          'Trình duyệt không hỗ trợ IndexedDB.'
        )
      )

      return
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    )

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(
          STORE_NAME,
          {
            keyPath: 'id',
          }
        )
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(
        request.error ||
          new Error(
            'Không thể mở Image Database.'
          )
      )
    }
  })
}

const generateImageId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `img_${crypto.randomUUID()}`
  }

  return `img_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`
}

export const imageStorage = {
  async save(
    blob: Blob,
    name = 'image'
  ): Promise<string> {
    const db =
      await openDatabase()

    const id =
      generateImageId()

    const data: StoredImage = {
      id,
      blob,
      name,
      type:
        blob.type ||
        'image/jpeg',
      createdAt: Date.now(),
    }

    return new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_NAME,
            'readwrite'
          )

        const store =
          transaction.objectStore(
            STORE_NAME
          )

        const request =
          store.put(data)

        request.onsuccess = () => {
          db.close()
          resolve(id)
        }

        request.onerror = () => {
          db.close()

          reject(
            request.error ||
              new Error(
                'Không thể lưu ảnh.'
              )
          )
        }
      }
    )
  },

  async get(
    id: string
  ): Promise<Blob | null> {
    try {
      const db =
        await openDatabase()

      return await new Promise(
        (resolve, reject) => {
          const transaction =
            db.transaction(
              STORE_NAME,
              'readonly'
            )

          const store =
            transaction.objectStore(
              STORE_NAME
            )

          const request =
            store.get(id)

          request.onsuccess = () => {
            db.close()

            const result =
              request.result as
                | StoredImage
                | undefined

            resolve(
              result?.blob ?? null
            )
          }

          request.onerror = () => {
            db.close()

            reject(
              request.error ||
                new Error(
                  'Không thể đọc ảnh.'
                )
            )
          }
        }
      )
    } catch (error) {
      console.error(
        'Lỗi lấy ảnh:',
        error
      )

      return null
    }
  },

  async getUrl(
    id: string
  ): Promise<string | null> {
    const blob =
      await this.get(id)

    if (!blob) {
      return null
    }

    return URL.createObjectURL(
      blob
    )
  },

  async remove(
    id: string
  ): Promise<boolean> {
    try {
      const db =
        await openDatabase()

      return await new Promise(
        (resolve) => {
          const transaction =
            db.transaction(
              STORE_NAME,
              'readwrite'
            )

          const store =
            transaction.objectStore(
              STORE_NAME
            )

          const request =
            store.delete(id)

          request.onsuccess = () => {
            db.close()
            resolve(true)
          }

          request.onerror = () => {
            db.close()
            resolve(false)
          }
        }
      )
    } catch (error) {
      console.error(
        'Lỗi xóa ảnh:',
        error
      )

      return false
    }
  },

  async removeMany(
    ids: string[]
  ): Promise<void> {
    for (const id of ids) {
      await this.remove(id)
    }
  },

  async clear(): Promise<boolean> {
    try {
      const db =
        await openDatabase()

      return await new Promise(
        (resolve) => {
          const transaction =
            db.transaction(
              STORE_NAME,
              'readwrite'
            )

          const store =
            transaction.objectStore(
              STORE_NAME
            )

          const request =
            store.clear()

          request.onsuccess = () => {
            db.close()
            resolve(true)
          }

          request.onerror = () => {
            db.close()
            resolve(false)
          }
        }
      )
    } catch (error) {
      console.error(
        'Lỗi xóa Image Database:',
        error
      )

      return false
    }
  },
}