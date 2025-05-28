import { cn } from "@/lib/utils";
import { Car } from "lucide-react";

interface ParkingSlotProps {
  slot: string;
  available: boolean;
  selected?: boolean;
  reservedBy?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ParkingSlot({ 
  slot, 
  available, 
  selected, 
  reservedBy, 
  onClick, 
  disabled 
}: ParkingSlotProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || !available}
      className={cn(
        "relative border-2 rounded-lg p-4 transition-all duration-200 min-h-[100px] flex flex-col items-center justify-center",
        "hover:shadow-md",
        available && !disabled && "hover:border-primary cursor-pointer",
        !available && "cursor-not-allowed opacity-60",
        selected && "border-primary bg-primary/10",
        available && !selected && "border-green-300 bg-green-50",
        !available && "border-red-300 bg-red-50"
      )}
    >
      <div className="text-2xl font-bold text-gray-900 mb-2">
        {slot}
      </div>
      
      <div className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        selected && "bg-primary text-white"
      )}>
        <Car className="w-3 h-3 mr-1" />
        {selected ? "Selected" : available ? "Available" : "Reserved"}
      </div>
      
      {!available && reservedBy && (
        <div className="text-xs text-gray-500 mt-1">
          by {reservedBy}
        </div>
      )}
    </button>
  );
}
