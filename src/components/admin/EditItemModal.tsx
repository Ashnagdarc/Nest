import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface EditItemModalProps {
    itemId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function EditItemModal({ itemId, open, onOpenChange, onSaved }: EditItemModalProps) {
    const supabase = createClient();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [item, setItem] = useState<any>({
        name: '',
        category: '',
        status: 'available',
        serial_number: '',
        description: '',
        notes: ''
    });

    useEffect(() => {
        if (open && itemId) {
            loadItem(itemId);
        }
    }, [open, itemId]);

    async function loadItem(id: string) {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gears')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setItem(data);
            }
        } catch (error: any) {
            toast({
                title: "Error loading item",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('gears')
                .update({
                    name: item.name,
                    category: item.category,
                    status: item.status,
                    serial_number: item.serial_number,
                    description: item.description,
                    notes: item.notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId);

            if (error) throw error;

            toast({
                title: "Item updated",
                description: "The gear item has been updated successfully.",
                variant: "default",
            });

            onSaved();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error saving item",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        setItem(prev => ({ ...prev, [name]: value }));
    }

    function handleSelectChange(name: string, value: string) {
        setItem(prev => ({ ...prev, [name]: value }));
    }

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>
                        Update the details for this gear item.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={item.name}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <Input
                                id="category"
                                name="category"
                                value={item.category || ''}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">Status</Label>
                            <Select
                                value={item.status}
                                onValueChange={(value) => handleSelectChange('status', value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="checked_out">Checked Out</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serial_number" className="text-right">Serial Number</Label>
                            <Input
                                id="serial_number"
                                name="serial_number"
                                value={item.serial_number || ''}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={item.description || ''}
                                onChange={handleInputChange}
                                className="col-span-3"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="notes" className="text-right">Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                value={item.notes || ''}
                                onChange={handleInputChange}
                                className="col-span-3"
                                rows={2}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 