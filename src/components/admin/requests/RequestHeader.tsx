import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import React from "react";

interface RequestHeaderProps {
    onExportCSV: () => void;
    onExportPDF: () => void;
}

const RequestHeader: React.FC<RequestHeaderProps> = ({ onExportCSV, onExportPDF }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Gear Requests</h1>
        <div className="flex gap-2">
            <Button onClick={onExportCSV} variant="outline" size="sm" className="px-3 py-1">
                <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
            <Button onClick={onExportPDF} variant="outline" size="sm" className="px-3 py-1">
                <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
        </div>
    </div>
);

export default RequestHeader; 