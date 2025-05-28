import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
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
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/date-utils";
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  Clock,
  CalendarX
} from "lucide-react";

interface Analytics {
  totalPenalties: number;
  activeReservations: number;
  utilization: number;
  topPenaltyUsers: Array<{
    id: number;
    username: string;
    penaltyPoints: number;
  }>;
  penaltyBreakdown: {
    futureWeek: number;
    lateCancellation: number;
  };
}

interface PenaltyRecord {
  id: number;
  userId: number;
  type: string;
  points: number;
  reason: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
  } | null;
}

export default function Analytics() {
  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
  });

  // Fetch penalty records
  const { data: penalties, isLoading: penaltiesLoading } = useQuery<PenaltyRecord[]>({
    queryKey: ["/api/penalties"],
  });

  const getPenaltyTypeBadge = (type: string) => {
    switch (type) {
      case "future_week":
        return (
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            <Calendar className="w-3 h-3 mr-1" />
            Future Week
          </Badge>
        );
      case "late_cancellation":
        return (
          <Badge variant="outline" className="border-red-300 text-red-700">
            <CalendarX className="w-3 h-3 mr-1" />
            Late Cancellation
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (analyticsLoading || penaltiesLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Analytics" />
        <main className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Analytics" />
      
      <main className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Penalties</p>
                  <p className="text-2xl font-bold text-red-600">
                    {analytics?.totalPenalties || 0}
                  </p>
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
                  <p className="text-sm text-gray-600">Active Reservations</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics?.activeReservations || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Slot Utilization</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics?.utilization || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Penalties/User</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics?.topPenaltyUsers?.length 
                      ? Math.round((analytics.totalPenalties / analytics.topPenaltyUsers.length) * 10) / 10
                      : 0
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Penalty Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Penalty Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Future Week Penalties</span>
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    {analytics?.penaltyBreakdown?.futureWeek || 0} points
                  </Badge>
                </div>
                <Progress 
                  value={analytics?.totalPenalties ? 
                    (analytics.penaltyBreakdown.futureWeek / analytics.totalPenalties) * 100 : 0
                  } 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Late Cancellation Penalties</span>
                  <Badge variant="outline" className="border-red-300 text-red-700">
                    {analytics?.penaltyBreakdown?.lateCancellation || 0} points
                  </Badge>
                </div>
                <Progress 
                  value={analytics?.totalPenalties ? 
                    (analytics.penaltyBreakdown.lateCancellation / analytics.totalPenalties) * 100 : 0
                  } 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Penalty Users</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics?.topPenaltyUsers?.length ? (
                <p className="text-gray-500 text-center py-4">No penalty data available</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topPenaltyUsers.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <Badge variant={user.penaltyPoints > 0 ? "destructive" : "secondary"}>
                        {user.penaltyPoints} points
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Penalty History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Penalty History</CardTitle>
          </CardHeader>
          <CardContent>
            {!penalties || penalties.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No penalty records found.</p>
                <p className="text-sm">Users are following the rules well!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((penalty) => (
                    <TableRow key={penalty.id}>
                      <TableCell className="font-medium">
                        {penalty.user?.username || "Unknown User"}
                      </TableCell>
                      <TableCell>
                        {getPenaltyTypeBadge(penalty.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{penalty.points}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(penalty.createdAt)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {penalty.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
