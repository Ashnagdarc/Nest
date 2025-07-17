import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Button } from './button';
import Image from 'next/image';

interface ImageCropperModalProps {
    open: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
    aspect?: number; // e.g. 1 for square
}

function getCroppedImg(imageSrc: string, crop: any, zoom: number, aspect: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new window.Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = image.naturalWidth / image.width;
            const cropX = crop.x * scale;
            const cropY = crop.y * scale;
            const cropWidth = crop.width * scale;
            const cropHeight = crop.height * scale;
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('No 2d context'));
            ctx.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas is empty'));
            }, 'image/jpeg');
        };
        image.onerror = reject;
    });
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ open, imageSrc, onClose, onCropComplete, aspect = 1 }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);

    const onCropChange = (newCrop: any) => setCrop(newCrop);
    const onZoomChange = (newZoom: number) => setZoom(newZoom);
    const onCropCompleteInternal = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Live preview effect
    useEffect(() => {
        if (!imageSrc || !croppedAreaPixels) return;
        let active = true;
        getCroppedImg(imageSrc, croppedAreaPixels, zoom, aspect).then(blob => {
            if (!active) return;
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            // Clean up previous preview
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = url;
        });
        return () => { active = false; };
    }, [imageSrc, croppedAreaPixels, zoom, aspect]);

    // Clean up preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);

    const handleCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setLoading(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, zoom, aspect);
            onCropComplete(croppedBlob);
            onClose();
        } catch (e) {
            alert('Failed to crop image');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg w-full">
                <DialogTitle>Crop Profile Photo</DialogTitle>
                <div className="flex flex-col gap-4 items-center">
                    <div className="w-full">
                        <p className="text-sm text-muted-foreground mb-2 text-center">Drag to reposition. Use the slider to zoom. Only the visible area will be saved as your profile photo.</p>
                        <div className="relative w-full h-64 bg-black rounded-md overflow-hidden">
                            {imageSrc && (
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={aspect}
                                    onCropChange={onCropChange}
                                    onZoomChange={onZoomChange}
                                    onCropComplete={onCropCompleteInternal}
                                />
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-muted-foreground">Zoom</span>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={e => setZoom(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                    </div>
                    <div className="w-full flex flex-col items-center mt-2">
                        <span className="text-xs text-muted-foreground mb-1">Preview</span>
                        <div className="w-24 h-24 rounded-full overflow-hidden border border-muted bg-background flex items-center justify-center">
                            {previewUrl ? (
                                <Image src={previewUrl} alt="Cropped preview" width={400} height={400} className="object-cover w-full h-full" />
                            ) : (
                                <span className="text-xs text-muted-foreground">No preview</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 w-full justify-end">
                        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button onClick={handleCrop} disabled={loading || !imageSrc} loading={loading}>
                            Crop & Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 