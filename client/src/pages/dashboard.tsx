import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ParkingSlot } from "@/components/parking-slot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { getTodayString, getMinDate } from "@/lib/date-utils";
import { calculateReservationPenalty } from "@/lib/penalty-calculator";
import { Car, Calendar, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlotAvailability {
  slot: string;
  available: boolean;
  reservedBy: number | null;
}

interface DashboardStats {
  availableToday: number;
  reservedToday: number;
  myActiveReservations: number;
  myPenaltyPoints: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Fetch parking slots availability for selected date
  const { data: slotsData, isLoading: slotsLoading } = useQuery<SlotAvailability[]>({
    queryKey: ["/api/parking-slots", { date: selectedDate }],
    enabled: !!selectedDate,
  });

  // Fetch user's reservations for stats
  const { data: userReservations } = useQuery({
    queryKey: ["/api/reservations", { userId: user?.id }],
    enabled: !!user,
  });

  // Fetch today's reservations for stats
  const { data: todayReservations } = useQuery({
    queryKey: ["/api/reservations", { date: getTodayString() }],
  });

  // Fetch current settings for penalty calculation
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Create reservation mutation
  const createReservationMutation = useMutation({
    mutationFn: async ({ slot, date }: { slot: string; date: string }) => {
      return apiRequest("POST", "/api/reservations", {
        userId: user!.id,
        slot,
        date,
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking-slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setSelectedSlot(null);
      toast({
        title: "Reservation Created",
        description: "Your parking slot has been reserved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reservation Failed",
        description: error.message || "Failed to create reservation.",
        variant: "destructive",
      });
    },
  });

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    availableToday: todayReservations ? 8 - todayReservations.length : 8,
    reservedToday: todayReservations?.length || 0,
    myActiveReservations: userReservations?.filter((r: any) => r.status === "active").length || 0,
    myPenaltyPoints: user?.penaltyPoints || 0,
  };

  // Calculate penalty for selected date
  const penaltyCalculation = selectedDate && settings 
    ? calculateReservationPenalty(
        selectedDate, 
        parseFloat(settings.WEEKLY_PENALTY_MULTIPLIER || "1")
      )
    : null;

  const handleSlotSelect = (slot: string) => {
    if (!selectedDate) {
      toast({
        title: "Select Date First",
        description: "Please select a date before choosing a slot.",
        variant: "destructive",
      });
      return;
    }

    const slotData = slotsData?.find(s => s.slot === slot);
    if (!slotData?.available) {
      toast({
        title: "Slot Unavailable",
        description: "This slot is already reserved for the selected date.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSlot(slot === selectedSlot ? null : slot);
  };

  const handleReservation = () => {
    if (!selectedSlot || !selectedDate) return;
    
    createReservationMutation.mutate({ 
      slot: selectedSlot, 
      date: selectedDate 
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Dashboard" />
      
      <main className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Today</p>
                  <p className="text-2xl font-bold">{dashboardStats.availableToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reserved Today</p>
                  <p className="text-2xl font-bold">{dashboardStats.reservedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">My Reservations</p>
                  <p className="text-2xl font-bold">{dashboardStats.myActiveReservations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Penalty Points</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboardStats.myPenaltyPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reservation Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Reserve Parking Slot</CardTitle>
            <CardDescription>
              Select a date and available parking slot to make a reservation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                min={getMinDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-fit"
              />
              
              {penaltyCalculation && penaltyCalculation.points > 0 && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Penalty Warning:</strong> This reservation will incur{" "}
                    <Badge variant="outline" className="mx-1 border-orange-300 text-orange-700">
                      {penaltyCalculation.points} point{penaltyCalculation.points !== 1 ? 's' : ''}
                    </Badge>
                    ({penaltyCalculation.reason})
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Parking Slots Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Available Slots for {selectedDate}
              </h3>
              
              {slotsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                  {slotsData?.map((slotData) => (
                    <ParkingSlot
                      key={slotData.slot}
                      slot={slotData.slot}
                      available={slotData.available}
                      selected={selectedSlot === slotData.slot}
                      onClick={() => handleSlotSelect(slotData.slot)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Reservation Summary */}
            {selectedSlot && selectedDate && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Reservation Summary</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Slot:</strong> {selectedSlot}</p>
                  <p><strong>Date:</strong> {selectedDate}</p>
                  <p><strong>Penalty:</strong> {penaltyCalculation?.points || 0} points</p>
                </div>
                
                <Button 
                  onClick={handleReservation}
                  disabled={createReservationMutation.isPending}
                  className="mt-3"
                >
                  {createReservationMutation.isPending ? "Creating..." : "Confirm Reservation"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
