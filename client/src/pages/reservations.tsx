import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/date-utils";
import { calculateCancellationPenalty } from "@/lib/penalty-calculator";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: number;
  userId: number;
  slot: string;
  date: string;
  status: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
  } | null;
}

export default function Reservations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's reservations
  const { data: reservations, isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations", { userId: user?.id }],
    enabled: !!user,
  });

  // Fetch settings for penalty calculation
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Cancel reservation mutation
  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      return apiRequest("DELETE", `/api/reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking-slots"] });
      toast({
        title: "Reservation Cancelled",
        description: "Your reservation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel reservation.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, date: string) => {
    const today = new Date();
    const resDate = new Date(date);
    
    if (status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    
    if (status === "completed" || resDate < today) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    
    if (status === "active") {
      return <Badge variant="default">Active</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  const getCancellationPenalty = (reservationDate: string) => {
    if (!settings) return null;
    
    return calculateCancellationPenalty(
      reservationDate,
      parseFloat(settings.LATE_CANCELLATION_PENALTY || "1")
    );
  };

  const activeReservations = reservations?.filter(r => r.status === "active") || [];
  const totalPenaltyPoints = user?.penaltyPoints || 0;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="My Reservations" />
        <main className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="My Reservations" />
      
      <main className="p-6 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Reservation Summary</span>
              <Badge variant="outline" className="text-red-600 border-red-200">
                {totalPenaltyPoints} penalty points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{activeReservations.length}</p>
                <p className="text-sm text-gray-600">Active Reservations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reservations?.length || 0}</p>
                <p className="text-sm text-gray-600">Total Reservations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{totalPenaltyPoints}</p>
                <p className="text-sm text-gray-600">Penalty Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {!reservations || reservations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No reservations found.</p>
                <p className="text-sm">Make your first reservation from the dashboard.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reserved At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => {
                    const cancellationPenalty = getCancellationPenalty(reservation.date);
                    const canCancel = reservation.status === "active";
                    
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          Slot {reservation.slot}
                        </TableCell>
                        <TableCell>{reservation.date}</TableCell>
                        <TableCell>{formatDateTime(reservation.createdAt)}</TableCell>
                        <TableCell>
                          {getStatusBadge(reservation.status, reservation.date)}
                        </TableCell>
                        <TableCell>
                          {canCancel ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  disabled={cancelReservationMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                                    Cancel Reservation
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel your reservation for Slot {reservation.slot} on {reservation.date}?
                                    
                                    {cancellationPenalty && cancellationPenalty.points > 0 && (
                                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-red-800 text-sm font-medium">
                                          <strong>Warning:</strong> Cancelling this reservation will incur{" "}
                                          <Badge variant="outline" className="mx-1 border-red-300 text-red-700">
                                            {cancellationPenalty.points} penalty point{cancellationPenalty.points !== 1 ? 's' : ''}
                                          </Badge>
                                          because it's {cancellationPenalty.reason.toLowerCase()}.
                                        </p>
                                      </div>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => cancelReservationMutation.mutate(reservation.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Cancel Anyway
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
