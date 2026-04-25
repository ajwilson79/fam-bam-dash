import { useEffect, useRef, useState } from 'react'
import { notifyPhotosChanged } from '../lib/photos'
import { adminHeaders } from '../lib/admin'

type UploadedFile = { name: string; url: string }
type UploadProgress = { name: string; done: boolean; error?: string }

export default function PhotoUpload() {
  const [photos, setPhotos] = useState<UploadedFile[]>([])
  const [progress, setProgress] = useState<UploadProgress[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  async function fetchList() {
    try {
      const res = await fetch('/api/photos/list')
      if (res.ok) setPhotos(await res.json() as UploadedFile[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  async function uploadFiles(files: File[]) {
    const images = files.filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (images.length === 0) return

    setProgress(images.map(f => ({ name: f.name, done: false })))

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      try {
        const res = await fetch(`/api/photos/upload?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type, ...adminHeaders() },
          body: file,
        })
        const errMsg = res.status === 401 ? 'PIN required — close Settings and re-enter via ⚙' : `HTTP ${res.status}`
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, done: true, error: res.ok ? undefined : errMsg } : x))
      } catch (err) {
        setProgress(p => p.map((x, idx) => idx === i ? { ...x, done: true, error: String(err) } : x))
      }
    }

    await fetchList()
    notifyPhotosChanged()
    setTimeout(() => setProgress([]), 2500)
  }

  async function deletePhoto(name: string) {
    await fetch(`/api/photos/delete?name=${encodeURIComponent(name)}`, { method: 'POST', headers: adminHeaders() })
    await fetchList()
    notifyPhotosChanged()
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="photo-upload">
      {/* Drop zone */}
      <div
        className={`photo-dropzone ${dragging ? 'is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && uploadFiles(Array.from(e.target.files))}
        />
        <div className="photo-dropzone-icon">⬆</div>
        <div className="photo-dropzone-label">Drop photos here or click to browse</div>
        <div className="photo-dropzone-hint">JPG · PNG · GIF · WebP · AVIF</div>
      </div>

      {/* Upload progress */}
      {progress.length > 0 && (
        <div className="photo-progress-list">
          {progress.map((p, i) => (
            <div key={i} className={`photo-progress-item ${p.done ? (p.error ? 'error' : 'done') : ''}`}>
              <span className="photo-progress-name">{p.name}</span>
              <span className="photo-progress-status">
                {p.error ? `Failed: ${p.error}` : p.done ? '✓ Done' : 'Uploading…'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Photo grid */}
      <div className="photo-upload-section-label">
        Uploaded photos ({photos.length})
      </div>

      {loading ? (
        <div className="photo-upload-empty">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="photo-upload-empty">No photos uploaded yet.</div>
      ) : (
        <div className="photo-grid">
          {photos.map(photo => (
            <div key={photo.name} className="photo-thumb">
              <img src={`/api/photos/thumb?name=${encodeURIComponent(photo.name)}`} alt={photo.name} loading="lazy" />
              <button
                className="photo-thumb-delete"
                onClick={() => deletePhoto(photo.name)}
                title={`Delete ${photo.name}`}
              >
                ×
              </button>
              <div className="photo-thumb-name">{photo.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
