import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, File, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const RomUploader = () => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const { romFile, loadRom, removeRom } = useGame();

  const validateRomFile = (file) => {
    // Check file extension
    const validExtensions = ['.gba', '.rom', '.bin'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: 'Invalid file type. Please upload a .gba, .rom, or .bin file.'
      };
    }

    // Check file size (GBA ROMs are typically 4MB, 8MB, 16MB, or 32MB)
    const validSizes = [4, 8, 16, 32].map(mb => mb * 1024 * 1024);
    const isValidSize = validSizes.some(size => 
      Math.abs(file.size - size) < 1024 * 1024 // Allow 1MB tolerance
    );

    if (!isValidSize && file.size > 33 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size seems too large for a GBA ROM. Please check your file.'
      };
    }

    // Check for potential Pokémon ROM
    const isPokemonRom = /pokemon|fire\s*red|leaf\s*green|emerald|ruby|sapphire/i.test(file.name);
    
    return {
      isValid: true,
      isPokemon: isPokemonRom,
      size: file.size
    };
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    setIsValidating(true);
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validation = validateRomFile(file);
    
    if (!validation.isValid) {
      setIsValidating(false);
      return;
    }

    // Read file as ArrayBuffer for emulator
    const reader = new FileReader();
    reader.onload = (e) => {
      const romData = {
        name: file.name,
        size: file.size,
        data: e.target.result,
        isPokemon: validation.isPokemon,
        uploadedAt: new Date().toISOString()
      };
      
      loadRom(romData);
      setIsValidating(false);
    };
    
    reader.onerror = () => {
      setIsValidating(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveRom = () => {
    removeRom();
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="w-5 h-5" />
          ROM File Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {romFile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-green-900">{romFile.name}</div>
                <div className="text-sm text-green-700">
                  {formatFileSize(romFile.size)}
                  {romFile.isPokemon && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      Pokémon ROM
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveRom}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isValidating ? (
                <div className="space-y-2">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Validating ROM file...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drop your ROM file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .gba, .rom, and .bin files
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isValidating}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose ROM File
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".gba,.rom,.bin"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            <strong>Legal Notice:</strong> Only upload ROM files that you legally own. 
            This emulator does not provide ROM files - you must obtain them yourself.
          </AlertDescription>
        </Alert>

        <div className="text-center text-xs text-muted-foreground">
          <p><strong>Recommended:</strong> Pokémon Fire Red or Leaf Green for best multiplayer experience.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RomUploader;