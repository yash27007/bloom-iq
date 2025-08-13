'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  uploading?: boolean;
  uploadProgress?: number;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  uploading = false,
  uploadProgress = 0,
  accept = { 'application/pdf': ['.pdf'] },
  maxSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          alert('File is too large. Please select a file under 10MB.');
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          alert('Invalid file type. Please select a PDF file.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <Card className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragActive || dragActive
            ? "border-blue-500 bg-blue-50 shadow-lg"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        )}>
          <CardContent
            {...getRootProps()}
            className="flex flex-col items-center justify-center p-8 text-center space-y-4"
          >
            <input {...getInputProps()} />
            <div className={cn(
              "p-4 rounded-full transition-colors duration-300",
              isDragActive || dragActive ? "bg-blue-100" : "bg-gray-100"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors duration-300",
                isDragActive || dragActive ? "text-blue-600" : "text-gray-600"
              )} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Course Material
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your PDF file here, or click to browse
              </p>
              <Button variant="outline" className="bg-white hover:bg-gray-50">
                Choose File
              </Button>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Supported formats: PDF</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  {uploading && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Progress value={uploadProgress} className="flex-1" />
                        <span className="text-xs text-gray-600">{uploadProgress}%</span>
                      </div>
                      <p className="text-xs text-blue-600">Uploading...</p>
                    </div>
                  )}
                  {!uploading && uploadProgress === 100 && (
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Upload complete</span>
                    </div>
                  )}
                </div>
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFileRemove}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
