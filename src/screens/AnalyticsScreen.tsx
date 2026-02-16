import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Users,
  Home,
  MapPin,
  Building2,
  TrendingUp,
  PieChart,
  BarChart3,
  Activity,
  Calendar,
  UserCheck,
  Baby,
  PersonStanding,
  Accessibility,
  Phone,
  Briefcase,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { format, subDays, startOfDay, isWithinInterval } from "date-fns";

interface AnalyticsScreenProps {
  onBack: () => void;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

const AGE_GROUPS = [
  { min: 0, max: 4, label: "0-4" },
  { min: 5, max: 14, label: "5-14" },
  { min: 15, max: 24, label: "15-24" },
  { min: 25, max: 34, label: "25-34" },
  { min: 35, max: 44, label: "35-44" },
  { min: 45, max: 54, label: "45-54" },
  { min: 55, max: 64, label: "55-64" },
  { min: 65, max: 150, label: "65+" },
];

export function AnalyticsScreen({ onBack }: AnalyticsScreenProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [selectedWardId, setSelectedWardId] = useState<string>("all");

  // Data queries
  const wards = useLiveQuery(() => db.wards.toArray());
  const villages = useLiveQuery(() => db.villages.toArray());
  const households = useLiveQuery(() => db.households.toArray());
  const citizens = useLiveQuery(() => db.citizens.toArray());

  // Filter citizens by time range
  const filteredCitizens = useMemo(() => {
    if (!citizens) return [];

    let filtered = citizens;

    // Filter by ward
    if (selectedWardId !== "all") {
      filtered = filtered.filter(c => c.wardId === Number(selectedWardId));
    }

    // Filter by time range
    if (timeRange !== "all") {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = startOfDay(subDays(new Date(), days));
      filtered = filtered.filter(c =>
        isWithinInterval(new Date(c.createdAt), { start: startDate, end: new Date() })
      );
    }

    return filtered;
  }, [citizens, timeRange, selectedWardId]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = filteredCitizens.length;
    const male = filteredCitizens.filter(c => c.sex === "male").length;
    const female = filteredCitizens.filter(c => c.sex === "female").length;
    const withPhone = filteredCitizens.filter(c => c.phoneNumber).length;
    const withPhoto = filteredCitizens.filter(c => c.photoData).length;
    const withDisability = filteredCitizens.filter(c => c.disabilityStatus !== "none").length;
    const withConsent = filteredCitizens.filter(c => c.consentGiven).length;

    return {
      total,
      male,
      female,
      malePercent: total > 0 ? Math.round((male / total) * 100) : 0,
      femalePercent: total > 0 ? Math.round((female / total) * 100) : 0,
      withPhone,
      withPhonePercent: total > 0 ? Math.round((withPhone / total) * 100) : 0,
      withPhoto,
      withPhotoPercent: total > 0 ? Math.round((withPhoto / total) * 100) : 0,
      withDisability,
      withDisabilityPercent: total > 0 ? Math.round((withDisability / total) * 100) : 0,
      withConsent,
      withConsentPercent: total > 0 ? Math.round((withConsent / total) * 100) : 0,
      households: households?.length ?? 0,
      villages: villages?.length ?? 0,
      wards: wards?.length ?? 0,
    };
  }, [filteredCitizens, households, villages, wards]);

  // Gender distribution data
  const genderData = useMemo(() => [
    { name: "Male", value: stats.male, color: "#3b82f6" },
    { name: "Female", value: stats.female, color: "#ec4899" },
  ], [stats]);

  // Age distribution data
  const ageData = useMemo(() => {
    return AGE_GROUPS.map(group => {
      const count = filteredCitizens.filter(c => {
        const age = c.age || (c.dateOfBirth
          ? Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null);
        return age !== null && age >= group.min && age <= group.max;
      }).length;

      return {
        age: group.label,
        count,
        male: filteredCitizens.filter(c => {
          const age = c.age || (c.dateOfBirth
            ? Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null);
          return c.sex === "male" && age !== null && age >= group.min && age <= group.max;
        }).length,
        female: filteredCitizens.filter(c => {
          const age = c.age || (c.dateOfBirth
            ? Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null);
          return c.sex === "female" && age !== null && age >= group.min && age <= group.max;
        }).length,
      };
    });
  }, [filteredCitizens]);

  // Disability distribution
  const disabilityData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    for (const citizen of filteredCitizens) {
      const status = citizen.disabilityStatus || "none";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    return Object.entries(statusCounts)
      .filter(([status]) => status !== "none")
      .map(([status, count], index) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: COLORS[index % COLORS.length],
      }));
  }, [filteredCitizens]);

  // Occupation distribution
  const occupationData = useMemo(() => {
    const occCounts: Record<string, number> = {};
    for (const citizen of filteredCitizens) {
      const occ = citizen.occupation || "Not specified";
      occCounts[occ] = (occCounts[occ] || 0) + 1;
    }

    return Object.entries(occCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredCitizens]);

  // Registration trend (last 30 days)
  const trendData = useMemo(() => {
    const days = 30;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const count = citizens?.filter(c =>
        isWithinInterval(new Date(c.createdAt), { start: dayStart, end: dayEnd })
      ).length || 0;

      data.push({
        date: format(date, "MMM d"),
        registrations: count,
      });
    }

    return data;
  }, [citizens]);

  // Village distribution
  const villageData = useMemo(() => {
    if (!villages || !filteredCitizens) return [];

    return villages.map(village => ({
      name: village.name,
      citizens: filteredCitizens.filter(c => c.villageId === village.id).length,
    })).sort((a, b) => b.citizens - a.citizens).slice(0, 10);
  }, [villages, filteredCitizens]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src="/mpg-logo.png"
            alt="MPG"
            className="w-8 h-8 object-contain"
          />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800">Analytics Dashboard</h1>
            <p className="text-xs text-slate-500">
              Registration statistics and insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedWardId} onValueChange={setSelectedWardId}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards?.map(ward => (
                  <SelectItem key={ward.id} value={String(ward.id)}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(v: "7d" | "30d" | "90d" | "all") => setTimeRange(v)}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-emerald-100">Total Citizens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.households}</p>
                  <p className="text-xs text-blue-100">Households</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.villages}</p>
                  <p className="text-xs text-amber-100">Villages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.wards}</p>
                  <p className="text-xs text-purple-100">Wards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Registration Trend
            </CardTitle>
            <CardDescription>Daily registrations over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Gender Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={150}>
                  <RechartsPieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-600">Male</span>
                    <span className="ml-auto font-bold text-slate-800">{stats.male}</span>
                    <Badge variant="secondary">{stats.malePercent}%</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm text-slate-600">Female</span>
                    <span className="ml-auto font-bold text-slate-800">{stats.female}</span>
                    <Badge variant="secondary">{stats.femalePercent}%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Age Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Age Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={ageData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="male" stackId="a" fill="#3b82f6" name="Male" />
                  <Bar dataKey="female" stackId="a" fill="#ec4899" name="Female" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* More Stats Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <UserCheck className="w-4 h-4" />
                  With Photo
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${stats.withPhotoPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-10 text-right">
                    {stats.withPhotoPercent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  With Phone
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${stats.withPhonePercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-10 text-right">
                    {stats.withPhonePercent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Accessibility className="w-4 h-4" />
                  With Disability
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats.withDisabilityPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-10 text-right">
                    {stats.withDisabilityPercent}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Occupation Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                Top Occupations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {occupationData.map((occ, i) => (
                    <div key={occ.name} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                      <span className="flex-1 text-sm text-slate-700 truncate">{occ.name}</span>
                      <Badge variant="secondary" className="text-xs">{occ.value}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Village Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Top Villages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {villageData.map((village, i) => (
                    <div key={village.name} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                      <span className="flex-1 text-sm text-slate-700 truncate">{village.name}</span>
                      <Badge variant="secondary" className="text-xs">{village.citizens}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Disability Breakdown (if any) */}
        {disabilityData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-amber-600" />
                Disability Types
              </CardTitle>
              <CardDescription>
                {stats.withDisability} citizens ({stats.withDisabilityPercent}%) have reported disabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={200} height={150}>
                  <RechartsPieChart>
                    <Pie
                      data={disabilityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {disabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {disabilityData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-slate-600">{item.name}</span>
                      <span className="text-sm font-medium text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
