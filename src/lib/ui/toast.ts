export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastPayload {
  title: string
  description?: string
  variant?: ToastVariant
}

export function showToast(payload: ToastPayload) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent<ToastPayload>('app-toast', {
    detail: {
      variant: 'success',
      ...payload,
    },
  }))
}

export function notifyDataChanged(action: 'insert' | 'update' | 'delete') {
  const labels = {
    insert: 'Data berhasil ditambahkan',
    update: 'Data berhasil diperbarui',
    delete: 'Data berhasil dihapus',
  }

  showToast({
    title: labels[action],
    description: 'Perubahan sudah tersimpan di database.',
    variant: 'success',
  })
}
