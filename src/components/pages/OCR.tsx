'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/hooks/useData'

export default function OCR() {
  const router = useRouter()
  const { addVisitor } = useData()
  
  // Tab selection: 'image' or 'excel'
  const [activeTab, setActiveTab] = useState<'image' | 'excel'>('image')
  const [XLSX, setXLSX] = useState<any>(null)
  
  // Load xlsx library on mount
  useEffect(() => {
    import('xlsx').then((mod) => {
      setXLSX(mod)
    })
  }, [])
  
  // Image OCR state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  
  // Excel upload state
  const [selectedExcel, setSelectedExcel] = useState<File | null>(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelResult, setExcelResult] = useState<{total: number, success: number, failed: number} | null>(null)
  
  // Form data from OCR
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    business_field: '',
    company: '',
    chapter: '',
    referral_name: '',
  })

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedImage(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    
    setOcrResult(null)
    setFormData({
      name: '',
      phone: '',
      email: '',
      business_field: '',
      company: '',
      chapter: '',
      referral_name: '',
    })
  }

  // OCR extraction with Ollama Qwen2.5-VL
  const handleExtractOCR = async () => {
    if (!selectedImage) return
    
    setOcrLoading(true)
    
    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(selectedImage)
      })
      
      // Remove data:image/...;base64, prefix
      const cleanBase64 = base64Image.split(',')[1]
      
      // Call Ollama API with Qwen 3.5 (supports vision)
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3.5:cloud',
          prompt: `Ekstrak informasi visitor dari gambar ini. Berikan hasil HANYA dalam format JSON tanpa teks lain:
{
  "name": "nama lengkap",
  "phone": "nomor whatsapp (format 08xxx)",
  "email": "email",
  "business_field": "bidang usaha",
  "company": "perusahaan",
  "chapter": "chapter bni",
  "referral_name": "nama yang mengajak"
}

Jika ada field yang tidak ditemukan, isi dengan string kosong "".`,
          images: [cleanBase64],
          stream: false,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      const extractedText = data.response
      
      console.log('Qwen raw output:', extractedText)
      
      // Extract JSON from response (sometimes Qwen adds markdown code blocks)
      let jsonStr = extractedText.trim()
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?|```\n?/g, '').trim()
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?|```\n?/g, '').trim()
      }
      
      // Parse JSON result
      const extracted = JSON.parse(jsonStr)
      
      setOcrResult(extracted)
      setFormData({
        name: extracted.name || '',
        phone: extracted.phone || '',
        email: extracted.email || '',
        business_field: extracted.business_field || '',
        company: extracted.company || '',
        chapter: extracted.chapter || '',
        referral_name: extracted.referral_name || '',
      })
    } catch (error: any) {
      console.error('OCR Error:', error)
      
      let errorMsg = error.message || 'Gagal ekstrak data'
      
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = 'Ollama tidak berjalan. Pastikan Ollama sudah diinstall dan jalankan: ollama serve'
      } else if (errorMsg.includes('qwen')) {
        errorMsg = 'Model qwen3.5:cloud belum tersedia. Jalankan: ollama pull qwen3.5:cloud'
      }
      
      alert(errorMsg)
    } finally {
      setOcrLoading(false)
    }
  }

  // Handle Excel file selection
  const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Format file tidak valid. Gunakan file Excel (.xlsx, .xls) atau CSV')
      return
    }
    
    setSelectedExcel(file)
    setExcelResult(null)
  }

  // Process Excel file with xlsx library
  const handleProcessExcel = async () => {
    if (!selectedExcel) return
    
    setExcelLoading(true)
    
    try {
      // Dynamic import xlsx library
      const XLSX = await import('xlsx')
      
      // Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = reject
        reader.readAsArrayBuffer(selectedExcel)
      })
      
      // Parse workbook
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Get first sheet
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // Convert to JSON
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
      
      if (jsonData.length === 0) {
        throw new Error('File Excel kosong')
      }
      
      // Validate and process each row
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNum = i + 2 // Excel row number (1-indexed + header)
        
        // Validate required fields
        if (!row['Nama'] || !row['No WhatsApp']) {
          failedCount++
          errors.push(`Baris ${rowNum}: Nama dan No WhatsApp wajib diisi`)
          continue
        }
        
        try {
          // Map Excel columns to database fields
          const visitorData = {
            name: String(row['Nama'] || '').trim(),
            phone: String(row['No WhatsApp'] || row['No WA'] || row['WhatsApp'] || '').trim(),
            email: String(row['Email'] || '').trim() || null,
            business_field: String(row['Bidang Usaha'] || row['Bidang'] || '').trim() || null,
            company: String(row['Perusahaan'] || row['Company'] || '').trim() || null,
            chapter: String(row['Chapter'] || '').trim() || null,
            referral_name: String(row['Diajak oleh'] || row['Referral'] || '').trim() || null,
            meeting_date: new Date().toISOString().split('T')[0],
            status: 'new' as const,
            notes: 'Imported from Excel bulk upload',
          }
          
          // Save to database
          await addVisitor(visitorData)
          successCount++
        } catch (error: any) {
          failedCount++
          errors.push(`Baris ${rowNum}: ${error.message}`)
        }
      }
      
      setExcelResult({
        total: jsonData.length,
        success: successCount,
        failed: failedCount,
      })
      
      // Show errors if any
      if (errors.length > 0) {
        console.error('Import errors:', errors.slice(0, 10).join('\n'))
        alert(`Import selesai dengan ${failedCount} error. Cek console untuk detail.`)
      }
    } catch (error: any) {
      console.error('Excel Error:', error)
      alert('Gagal proses Excel: ' + (error.message || 'Pastikan format file benar'))
    } finally {
      setExcelLoading(false)
    }
  }

  // Save single visitor from OCR
  const handleSaveVisitor = async () => {
    if (!formData.name || !formData.phone) {
      alert('Nama dan No WhatsApp wajib diisi')
      return
    }
    
    try {
      await addVisitor({
        ...formData,
        meeting_date: new Date().toISOString().split('T')[0],
        status: 'new',
        notes: 'Imported from OCR',
      })
      
      alert('Visitor berhasil ditambahkan!')
      
      // Reset form
      setSelectedImage(null)
      setImagePreview('')
      setOcrResult(null)
      setFormData({
        name: '',
        phone: '',
        email: '',
        business_field: '',
        company: '',
        chapter: '',
        referral_name: '',
      })
      
      // Navigate to visitors page
      router.push('/visitors')
    } catch (error: any) {
      alert('Gagal simpan visitor: ' + error.message)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent, type: 'image' | 'excel') => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    
    if (type === 'image' && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else if (type === 'excel') {
      handleExcelSelect({ target: { files: [file] } } as any)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">OCR & Import</h1>
        <p className="text-sm text-gray-500 mt-1">Ekstrak data visitor dari gambar atau bulk upload Excel</p>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'image'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📷 OCR dari Gambar
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'excel'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Bulk Upload Excel
        </button>
      </div>

      {/* Image OCR Tab */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">1. Upload Screenshot</h3>
            
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'image')}
              onClick={() => document.getElementById('ocr-image')?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${imagePreview ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-red-500 hover:bg-red-50'}
              `}
            >
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
                  <p className="text-sm text-green-600 mt-3 font-medium">✓ Gambar dipilih</p>
                  <p className="text-xs text-gray-500 mt-1">Klik untuk ganti gambar</p>
                </div>
              ) : (
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 mb-1">Klik atau drag gambar di sini</p>
                  <p className="text-xs text-gray-500">Screenshot email pendaftaran, formulir, dll.</p>
                  <p className="text-xs text-gray-400 mt-2">Support: JPG, PNG, GIF</p>
                </div>
              )}
              
              <input
                id="ocr-image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {imagePreview && !ocrResult && (
              <button
                onClick={handleExtractOCR}
                disabled={ocrLoading}
                className="w-full mt-4 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {ocrLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Mengekstrak...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Ekstrak Data dengan AI
                  </>
                )}
              </button>
            )}
          </div>

          {/* Result Section */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">2. Preview & Edit Data</h3>
            
            {!ocrResult ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <p className="text-sm">Data hasil ekstraksi akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Nama', key: 'name', value: formData.name },
                  { label: 'No WhatsApp', key: 'phone', value: formData.phone },
                  { label: 'Email', key: 'email', value: formData.email },
                  { label: 'Bidang Usaha', key: 'business_field', value: formData.business_field },
                  { label: 'Perusahaan', key: 'company', value: formData.company },
                  { label: 'Chapter', key: 'chapter', value: formData.chapter },
                  { label: 'Diajak oleh', key: 'referral_name', value: formData.referral_name },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                ))}

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={handleSaveVisitor}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✓ Simpan ke Database
                  </button>
                  <button
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview('')
                      setOcrResult(null)
                      setFormData({
                        name: '',
                        phone: '',
                        email: '',
                        business_field: '',
                        company: '',
                        chapter: '',
                        referral_name: '',
                      })
                    }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excel Upload Tab */}
      {activeTab === 'excel' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Upload File Excel</h3>
            
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'excel')}
              onClick={() => document.getElementById('excel-file')?.click()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                ${selectedExcel ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-red-500 hover:bg-red-50'}
              `}
            >
              {selectedExcel ? (
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M8 13h8M8 17h8M10 9h4" />
                  </svg>
                  <p className="text-sm font-medium text-green-700">{selectedExcel.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(selectedExcel.size / 1024).toFixed(2)} KB</p>
                  <p className="text-xs text-gray-400 mt-2">Klik untuk ganti file</p>
                </div>
              ) : (
                <div>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 mb-1">Klik atau drag file Excel di sini</p>
                  <p className="text-xs text-gray-500">Support: .xlsx, .xls, .csv</p>
                  <p className="text-xs text-gray-400 mt-2">Max size: 10MB</p>
                </div>
              )}
              
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelSelect}
                className="hidden"
              />
            </div>

            {selectedExcel && !excelResult && (
              <button
                onClick={handleProcessExcel}
                disabled={excelLoading}
                className="w-full mt-4 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {excelLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Proses & Import Data
                  </>
                )}
              </button>
            )}

            {excelResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h4 className="text-sm font-semibold text-green-800">Import Berhasil!</h4>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{excelResult.total}</div>
                    <div className="text-xs text-green-600">Total Data</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{excelResult.success}</div>
                    <div className="text-xs text-green-600">Berhasil</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{excelResult.failed}</div>
                    <div className="text-xs text-red-600">Gagal</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedExcel(null)
                    setExcelResult(null)
                  }}
                  className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Lihat Hasil di Visitor List
                </button>
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Format File Excel</h4>
                <p className="text-xs text-blue-700 mb-3">Pastikan kolom berikut ada di file Excel:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Nama (wajib)</li>
                  <li>• No WhatsApp (wajib)</li>
                  <li>• Email (opsional)</li>
                  <li>• Bidang Usaha (opsional)</li>
                  <li>• Perusahaan (opsional)</li>
                  <li>• Chapter (opsional)</li>
                  <li>• Diajak oleh (opsional)</li>
                </ul>
                <button
                  onClick={() => {
                    // Create Excel template on-the-fly
                    const ws = XLSX.utils.json_to_sheet([{
                      'Nama': 'Budi Santoso',
                      'No WhatsApp': '081234567890',
                      'Email': 'budi@example.com',
                      'Bidang Usaha': 'Digital Marketing',
                      'Perusahaan': 'PT Kreatif Digital',
                      'Chapter': 'BNI Grow Jakarta Selatan',
                      'Diajak oleh': 'Andi Wijaya'
                    }]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Template');
                    XLSX.writeFile(wb, 'template-visitor-import.xlsx');
                  }}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                >
                  📥 Download Template Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
