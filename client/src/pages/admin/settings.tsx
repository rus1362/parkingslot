import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Settings as SettingsIcon, Save, RotateCcw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsData {
  WEEKLY_PENALTY_MULTIPLIER: string;
  LATE_CANCELLATION_PENALTY: string;
  AUTO_SUSPEND_PENALTY_THRESHOLD: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    weeklyPenaltyMultiplier: "1",
    lateCancellationPenalty: "1",
    autoSuspendPenaltyThreshold: "90",
  });
  const [storageBackend, setStorageBackend] = useState("json");

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        weeklyPenaltyMultiplier: settings.WEEKLY_PENALTY_MULTIPLIER || "1",
        lateCancellationPenalty: settings.LATE_CANCELLATION_PENALTY || "1",
        autoSuspendPenaltyThreshold:
          settings.AUTO_SUSPEND_PENALTY_THRESHOLD || "90",
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof formData) => {
      return apiRequest("PUT", "/api/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Penalty settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    },
  });

  // Fetch current storage backend
  const { data: backendData } = useQuery<{ backend: string }>({
    queryKey: ["/api/storage-backend"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/storage-backend");
      const data = await response.json();
      return data as { backend: string };
    },
  });

  useEffect(() => {
    if (backendData) {
      setStorageBackend(backendData.backend);
    }
  }, [backendData]);

  // Save storage backend mutation
  const saveBackendMutation = useMutation({
    mutationFn: async (newBackend: string) => {
      const response = await apiRequest("PUT", "/api/storage-backend", {
        backend: newBackend,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage-backend"] });
      toast({
        title: "Storage backend updated successfully",
        description:
          "The application will use the new storage backend for all operations.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update storage backend",
        description:
          "There was an error switching the storage backend. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const weeklyMultiplier = parseFloat(formData.weeklyPenaltyMultiplier);
    const lateCancelPenalty = parseFloat(formData.lateCancellationPenalty);
    const autoSuspendThreshold = parseFloat(
      formData.autoSuspendPenaltyThreshold
    );

    if (isNaN(weeklyMultiplier) || weeklyMultiplier < 0) {
      toast({
        title: "Invalid Input",
        description: "Weekly penalty multiplier must be a non-negative number.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(lateCancelPenalty) || lateCancelPenalty < 0) {
      toast({
        title: "Invalid Input",
        description: "Late cancellation penalty must be a non-negative number.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(autoSuspendThreshold) || autoSuspendThreshold < 1) {
      toast({
        title: "Invalid Input",
        description:
          "Auto-suspend penalty threshold must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      weeklyPenaltyMultiplier: "1",
      lateCancellationPenalty: "1",
      autoSuspendPenaltyThreshold: "90",
    });
  };

  const handleBackendChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStorageBackend(event.target.value);
  };

  const saveBackend = () => {
    saveBackendMutation.mutate(storageBackend);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Settings" />
        <main className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" />

      <main className="p-6 space-y-6">
        {/* Storage Backend Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Storage Backend Configuration
            </CardTitle>
            <CardDescription>
              Select the storage backend for the application. This setting
              determines how data is stored and retrieved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storage-backend">Storage Backend</Label>
              <div className="flex items-center gap-4">
                <select
                  id="storage-backend"
                  value={storageBackend}
                  onChange={handleBackendChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="json">JSON File Storage</option>
                  <option value="sqlitecloud">SQLiteCloud Database</option>
                </select>
                <Button
                  onClick={saveBackend}
                  disabled={saveBackendMutation.isPending}
                  className="min-w-[100px]"
                >
                  {saveBackendMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {storageBackend === "json"
                  ? "Using local JSON file storage. Data will be persisted in data.json."
                  : "Using SQLiteCloud database. Data will be persisted in the cloud."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Penalty Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Penalty Configuration
            </CardTitle>
            <CardDescription>
              Configure penalty multipliers for the parking reservation system.
              These settings affect how penalty points are calculated for users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="weeklyPenaltyMultiplier">
                    Penalty Multiplier (per 10 days)
                  </Label>
                  <Input
                    id="weeklyPenaltyMultiplier"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weeklyPenaltyMultiplier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeklyPenaltyMultiplier: e.target.value,
                      })
                    }
                    placeholder="1.0"
                  />
                  <p className="text-sm text-gray-500">
                    Points multiplied by weeks ahead when reserving for future
                    weeks.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateCancelPenalty">
                    Late Cancellation Penalty
                  </Label>
                  <Input
                    id="lateCancelPenalty"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.lateCancellationPenalty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lateCancellationPenalty: e.target.value,
                      })
                    }
                    placeholder="1.0"
                  />
                  <p className="text-sm text-gray-500">
                    Penalty points when cancelling less than 12 hours before
                    reservation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoSuspendPenaltyThreshold">
                    Auto-Suspend Penalty Threshold
                  </Label>
                  <Input
                    id="autoSuspendPenaltyThreshold"
                    type="number"
                    min={1}
                    value={formData.autoSuspendPenaltyThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoSuspendPenaltyThreshold: e.target.value,
                      })
                    }
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Users will be automatically suspended when their penalty
                    points reach this value.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>

                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveSettingsMutation.isPending
                    ? "Saving..."
                    : "Save Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Penalty Calculation Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Penalty Calculation Examples
            </CardTitle>
            <CardDescription>
              Examples of how penalty points are calculated with current
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">
                  Future days Reservations
                </h4>
                <div className="space-y-2 text-sm text-orange-800">
                  <div className="flex justify-between">
                    <span>Reserving 2 days after next 10 days:</span>
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-700"
                    >
                      1 × {formData.weeklyPenaltyMultiplier} × 2 ={" "}
                      {(
                        1 *
                        parseFloat(formData.weeklyPenaltyMultiplier) *
                        2
                      ).toFixed(1)}{" "}
                      points
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Reserving 1 day, 10 days ahead:</span>
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-700"
                    >
                      2 × {formData.weeklyPenaltyMultiplier} × 1 ={" "}
                      {(
                        2 *
                        parseFloat(formData.weeklyPenaltyMultiplier) *
                        1
                      ).toFixed(1)}{" "}
                      points
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Reserving 3 days, 30 days ahead:</span>
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-700"
                    >
                      3 × {formData.weeklyPenaltyMultiplier} × 3 ={" "}
                      {(
                        3 *
                        parseFloat(formData.weeklyPenaltyMultiplier) *
                        3
                      ).toFixed(1)}{" "}
                      points
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">
                  Late Cancellation
                </h4>
                <div className="space-y-2 text-sm text-red-800">
                  <div className="flex justify-between">
                    <span>Cancelling 8 hours before:</span>
                    <Badge
                      variant="outline"
                      className="border-red-300 text-red-700"
                    >
                      {formData.lateCancellationPenalty} points
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelling 2 hours before:</span>
                    <Badge
                      variant="outline"
                      className="border-red-300 text-red-700"
                    >
                      {formData.lateCancellationPenalty} points
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelling 24 hours before:</span>
                    <Badge
                      variant="outline"
                      className="border-green-300 text-green-700"
                    >
                      0 points (no penalty)
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">
                  Total Parking Slots:
                </span>
                <Badge variant="outline">8 slots</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Slot Numbers:</span>
                <Badge variant="outline">24, 25, 37, 38, 39, 40, 41, 42</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Data Storage:</span>
                <Badge
                  variant="outline"
                  className="bg-yellow-50 border-yellow-300 text-yellow-700"
                >
                  In-Memory (SQLite Ready)
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Week Start:</span>
                <Badge variant="outline">Sunday</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
