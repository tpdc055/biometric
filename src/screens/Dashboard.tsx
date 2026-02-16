import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MPGFooter } from "@/components/MPGFooter";
import { LanguageSelector } from "@/components/LanguageSelector";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Building2,
  Clock,
  FileDown,
  Home,
  MapPin,
  Search,
  Settings,
  UserPlus,
  Users,
  BarChart3,
  Shield,
  HelpCircle,
} from "lucide-react";
import { EncryptionSettings } from "@/components/EncryptionSettings";
import { SyncButton } from "@/components/SupabaseSync";
import { useState } from "react";

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [showEncryption, setShowEncryption] = useState(false);

  const stats = useLiveQuery(async () => {
    try {
      const [
        wardCount,
        villageCount,
        householdCount,
        citizenCount,
        recentCitizens,
      ] = await Promise.all([
        db.wards.count().catch(() => 0),
        db.villages.count().catch(() => 0),
        db.households.count().catch(() => 0),
        db.citizens.count().catch(() => 0),
        db.citizens.orderBy("createdAt").reverse().limit(5).toArray().catch(() => []),
      ]);

      return {
        wardCount,
        villageCount,
        householdCount,
        citizenCount,
        recentCitizens,
      };
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return {
        wardCount: 0,
        villageCount: 0,
        householdCount: 0,
        citizenCount: 0,
        recentCitizens: [],
      };
    }
  }, []);

  const statCards = [
    {
      label: "Wards",
      value: stats?.wardCount ?? 0,
      icon: Building2,
      color: "from-purple-400 to-purple-500",
    },
    {
      label: "Villages",
      value: stats?.villageCount ?? 0,
      icon: MapPin,
      color: "from-blue-400 to-blue-500",
    },
    {
      label: "Households",
      value: stats?.householdCount ?? 0,
      icon: Home,
      color: "from-amber-400 to-amber-500",
    },
    {
      label: "Citizens",
      value: stats?.citizenCount ?? 0,
      icon: Users,
      color: "from-emerald-400 to-emerald-500",
    },
  ];

  const quickActions = [
    {
      label: "Register Household",
      icon: Home,
      screen: "household",
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Register Citizen",
      icon: UserPlus,
      screen: "citizen",
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Search Records",
      icon: Search,
      screen: "search",
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      screen: "analytics",
      color: "bg-teal-100 text-teal-700",
    },
    {
      label: "Export & Sync",
      icon: FileDown,
      screen: "export",
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: "Encryption",
      icon: Shield,
      screen: "encryption",
      color: "bg-slate-100 text-slate-700",
    },
    {
      label: "Help",
      icon: HelpCircle,
      screen: "help",
      color: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 py-2">
          <img
            src="/mpg-logo.png"
            alt="Madang Provincial Government"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-600">Madang Provincial Government</p>
            <h1 className="text-xl font-bold text-slate-800">
              Citizen Registry
            </h1>
            <p className="text-xs text-slate-500">
              Offline Registration System
            </p>
          </div>
          <div className="flex gap-2">
            <LanguageSelector />
            <SyncButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("setup")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat) => (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.screen}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:border-emerald-300"
                  onClick={() => {
                    if (action.screen === "encryption") {
                      setShowEncryption(true);
                    } else {
                      onNavigate(action.screen);
                    }
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Registrations</CardTitle>
                <CardDescription>Last 5 citizens registered</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("search")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentCitizens && stats.recentCitizens.length > 0 ? (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {stats.recentCitizens.map((citizen) => (
                    <div
                      key={citizen.id}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 hover:border-slate-200 transition-all"
                    >
                      {citizen.photoData ? (
                        <img
                          src={citizen.photoData}
                          alt={`${citizen.firstName} ${citizen.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {citizen.firstName} {citizen.lastName}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {citizen.uniqueId}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {format(citizen.createdAt, "MMM d")}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No registrations yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => onNavigate("citizen")}
                >
                  Register first citizen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Status */}
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Offline Mode - All data stored locally</span>
        </div>
      </div>

      {/* MPG Footer */}
      <MPGFooter />

      {/* Encryption Settings Dialog */}
      <EncryptionSettings
        open={showEncryption}
        onClose={() => setShowEncryption(false)}
      />
    </div>
  );
}
