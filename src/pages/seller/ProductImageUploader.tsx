// src/components/seller/ProductImageUploader.tsx

import { useCallback, useMemo, useRef, useState } from 'react';
import { ImagePlus, X, Star } from 'lucide-react';

// ============================================
// TYPES
// ============================================

/**
 * An image in the uploader — either a freshly-added File or an existing
 * image already on the server.
 */
export interface UploaderImage {
  id: string;                    // local uuid for React keys
  file?: File;                   // present when newly added
  url?: string;                  // present for existing images
  is_primary: boolean;
}

interface Props {
  value: UploaderImage[];
  onChange: (next: UploaderImage[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
];

// ============================================
// COMPONENT
// ============================================

const ProductImageUploader = ({
  value,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  disabled,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(
    () => Math.max(0, maxFiles - value.length),
    [maxFiles, value.length],
  );

  // ---- Add files ----
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const arr = Array.from(incoming);

      if (arr.length > remaining) {
        setError(`Maximum ${maxFiles} images. You can add ${remaining} more.`);
        return;
      }

      const rejected: string[] = [];
      const accepted: UploaderImage[] = [];

      for (const file of arr) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          rejected.push(`${file.name} (unsupported type)`);
          continue;
        }
        if (file.size > maxSizeBytes) {
          rejected.push(
            `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > limit)`,
          );
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          is_primary: false,
        });
      }

      if (rejected.length) {
        setError(`Skipped: ${rejected.join(', ')}`);
      }

      const next = [...value, ...accepted];
      // Ensure exactly one primary
      if (next.length > 0 && !next.some((i) => i.is_primary)) {
        next[0].is_primary = true;
      }
      onChange(next);
    },
    [value, remaining, maxFiles, maxSizeBytes, onChange],
  );

  // ---- Remove ----
  const remove = (id: string) => {
    const next = value.filter((i) => i.id !== id);
    // If we removed the primary, promote the new first
    if (next.length > 0 && !next.some((i) => i.is_primary)) {
      next[0].is_primary = true;
    }
    onChange(next);
  };

  // ---- Set primary ----
  const setPrimary = (id: string) => {
    onChange(value.map((i) => ({ ...i, is_primary: i.id === id })));
  };

  // ---- Drag handlers ----
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ---- Click to browse ----
  const onClickBrowse = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    // Reset so selecting the same file twice still fires
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClickBrowse}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-amber-700 bg-amber-50/60'
            : 'border-stone-200 bg-white/60 hover:border-amber-700/50 hover:bg-white/90'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={onFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <ImagePlus size={28} className="text-stone-400" />
          <p className="text-sm font-medium text-stone-700">
            {dragActive
              ? 'Drop images here'
              : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-stone-400">
            JPEG, PNG, WEBP, GIF, HEIC · up to {maxFiles} files · max{' '}
            {maxSizeBytes / 1024 / 1024}MB each
          </p>
          <p className="text-xs text-stone-400 mt-1">
            {value.length} / {maxFiles} added
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-700 bg-red-50/80 border border-red-200/60 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Thumbnails grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100"
            >
              {img.url && (
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Primary badge */}
              {img.is_primary && (
                <span className="absolute top-1.5 left-1.5 bg-amber-800 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Primary
                </span>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(img.id);
                    }}
                    disabled={disabled}
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-amber-800 transition-colors"
                    title="Set as primary"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(img.id);
                  }}
                  disabled={disabled}
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-red-600 transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary hint */}
      {value.length > 0 && (
        <p className="text-[11px] text-stone-400">
          <Star size={10} className="inline mb-0.5" /> Click the star on an
          image to set it as the primary thumbnail.
        </p>
      )}
    </div>
  );
};

export default ProductImageUploader;