import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  ACCEPT_ATTRIBUTE,
  getSupportedFormatSummary,
  isSupportedImageFile,
} from '@/utils/imageFormats';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = useCallback((file: File | undefined) => {
    if (!file) return;

    if (!isSupportedImageFile(file)) {
      toast.error(`Unsupported format. Use ${getSupportedFormatSummary()}.`);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    selectFile(e.dataTransfer.files[0]);
  }, [disabled, selectFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
    // Reset the input value to allow re-uploading the same file.
    e.target.value = '';
  }, [selectFile]);

  return (
    <div
      className={`upload-zone cursor-pointer group ${isDragging ? 'upload-zone-active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-surface-elevated flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center animate-pulse-glow">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-1">
            Drag your image here
          </p>
          <p className="text-sm text-muted-foreground">
            or <span className="text-primary font-medium">click to select</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground text-center">
          <div className="w-2 h-2 rounded-full bg-primary/50 flex-shrink-0"></div>
          <span>Supported: {getSupportedFormatSummary()}</span>
        </div>

        <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
          JPEG XL requires a recent browser (Chrome 155+, Firefox 158+, Safari 17+).
        </p>
      </div>
    </div>
  );
}
