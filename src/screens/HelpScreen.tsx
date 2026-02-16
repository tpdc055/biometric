import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  FileText,
  Shield,
  Database,
  Users,
  Home,
  Search,
  Download,
  Settings,
  BarChart3,
} from "lucide-react";

interface HelpScreenProps {
  onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src="/mpg-logo.png"
            alt="MPG"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-800">Help & Documentation</h1>
            <p className="text-xs text-slate-500">
              User guide and support information
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Quick Links */}
        <Card className="border-mpg-gold/30 bg-gradient-to-br from-mpg-gold/5 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-mpg-black">
              <HelpCircle className="w-5 h-5 text-mpg-gold" />
              Need Help?
            </CardTitle>
            <CardDescription>Choose a topic or contact MPG support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a href="#getting-started" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 transition-colors">
                <BookOpen className="w-6 h-6 text-emerald-600" />
                <span className="text-xs text-center font-medium">Getting Started</span>
              </a>
              <a href="#features" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 transition-colors">
                <Settings className="w-6 h-6 text-blue-600" />
                <span className="text-xs text-center font-medium">Features</span>
              </a>
              <a href="#troubleshooting" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 transition-colors">
                <Shield className="w-6 h-6 text-amber-600" />
                <span className="text-xs text-center font-medium">Troubleshooting</span>
              </a>
              <a href="#support" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 transition-colors">
                <Phone className="w-6 h-6 text-purple-600" />
                <span className="text-xs text-center font-medium">Contact Support</span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card id="getting-started">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Getting Started
            </CardTitle>
            <CardDescription>Learn the basics of the Citizen Registry System</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Setting up your PIN
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 space-y-2">
                  <p>When you first open the app, you'll need to create a 4-6 digit PIN to protect your data:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Enter your desired PIN (4-6 digits)</li>
                    <li>Confirm your PIN by entering it again</li>
                    <li>Enable biometric authentication if available (optional)</li>
                  </ol>
                  <p className="text-amber-600 font-medium mt-2">⚠️ Remember your PIN - it cannot be recovered if forgotten!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-600" />
                    Configuring Wards and Villages
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 space-y-2">
                  <p>Before registering citizens, set up your administrative areas:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Go to Settings (gear icon on Dashboard)</li>
                    <li>Add your ward(s) with code and name</li>
                    <li>For each ward, add villages with codes and names</li>
                    <li>Or use "Load Sample Data" for quick testing</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-600" />
                    Registering Households
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 space-y-2">
                  <p>Create household records before adding citizens:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Tap "Register Household" on Dashboard</li>
                    <li>Select ward and village</li>
                    <li>Enter household code and head of household name</li>
                    <li>Optionally capture GPS location</li>
                    <li>Save the household</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Registering Citizens
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 space-y-2">
                  <p>Add individual citizen records:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Tap "Register Citizen" on Dashboard</li>
                    <li>Select ward, village, and household</li>
                    <li>Capture photo and fingerprint (optional)</li>
                    <li>Enter personal details (name, sex, age/DOB)</li>
                    <li>Add occupation and disability information</li>
                    <li>Record consent with digital signature</li>
                    <li>Save the citizen record</li>
                  </ol>
                  <p className="bg-emerald-50 p-2 rounded-lg mt-2">
                    💡 <strong>Tip:</strong> The app checks for duplicate records automatically!
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Features Guide */}
        <Card id="features">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Features & Capabilities
            </CardTitle>
            <CardDescription>What you can do with the Citizen Registry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-sm">Search & Filter</h3>
                </div>
                <p className="text-xs text-slate-600">Find citizens by name, ID, ward, or village. Advanced filtering options available.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-sm">Export Data</h3>
                </div>
                <p className="text-xs text-slate-600">Export to CSV for use in Excel or Google Sheets. Filter before exporting.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-sm">Analytics</h3>
                </div>
                <p className="text-xs text-slate-600">View statistics, charts, and demographic insights about registered citizens.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-sm">Offline First</h3>
                </div>
                <p className="text-xs text-slate-600">Works completely offline. All data stored securely on your device.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-sm">Data Security</h3>
                </div>
                <p className="text-xs text-slate-600">PIN protection, biometric auth, and optional encryption for sensitive data.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-sm">Digital Signatures</h3>
                </div>
                <p className="text-xs text-slate-600">Capture consent signatures digitally for legal record-keeping.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card id="troubleshooting">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              Troubleshooting
            </CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <h3 className="font-semibold text-sm text-amber-800 mb-1">Forgot PIN?</h3>
                <p className="text-xs text-amber-700">
                  Unfortunately, PINs cannot be recovered for security reasons. You'll need to reinstall the app, which will erase all data. Always backup your data regularly!
                </p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-sm text-blue-800 mb-1">Camera not working?</h3>
                <p className="text-xs text-blue-700">
                  Make sure you've granted camera permissions to the app in your device settings. Try reloading the page if permissions were just granted.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <h3 className="font-semibold text-sm text-purple-800 mb-1">App running slow?</h3>
                <p className="text-xs text-purple-700">
                  Large databases (10,000+ records) may slow down. Export data regularly and consider splitting data by ward or time period.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <h3 className="font-semibold text-sm text-emerald-800 mb-1">Need to transfer data?</h3>
                <p className="text-xs text-emerald-700">
                  Use the Cloud Sync feature (Export & Sync screen) to generate a sync code or share a backup file with another device.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MPG Support */}
        <Card id="support" className="border-mpg-gold/50 bg-gradient-to-br from-mpg-black/5 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-mpg-black">
              <Phone className="w-5 h-5 text-mpg-gold" />
              Madang Provincial Government Support
            </CardTitle>
            <CardDescription>Get help from MPG IT Department</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact Methods */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-white border-2 border-mpg-gold/20 hover:border-mpg-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-mpg-gold/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-mpg-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Call Us</h3>
                    <p className="text-xs text-slate-500">Mon-Fri, 8am-4pm</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-mpg-black">+675 422 2500</p>
              </div>

              <div className="p-4 rounded-lg bg-white border-2 border-mpg-gold/20 hover:border-mpg-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-mpg-gold/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-mpg-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Email Support</h3>
                    <p className="text-xs text-slate-500">Response within 24hrs</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-mpg-black">ict@madangprovince.gov.pg</p>
              </div>

              <div className="p-4 rounded-lg bg-white border-2 border-mpg-gold/20 hover:border-mpg-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-mpg-gold/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-mpg-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Visit Office</h3>
                    <p className="text-xs text-slate-500">IT Department</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600">Madang Provincial Administration<br/>Madang, Papua New Guinea</p>
              </div>

              <div className="p-4 rounded-lg bg-white border-2 border-mpg-gold/20 hover:border-mpg-gold/40 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-mpg-gold/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-mpg-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Live Chat</h3>
                    <p className="text-xs text-slate-500">Coming soon</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">In Development</Badge>
              </div>
            </div>

            {/* Support Hours */}
            <div className="p-3 rounded-lg bg-mpg-gold/5 border border-mpg-gold/20">
              <h3 className="font-semibold text-sm text-mpg-black mb-2">Support Hours</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-600">Monday - Friday</p>
                  <p className="font-semibold text-mpg-black">8:00 AM - 4:00 PM</p>
                </div>
                <div>
                  <p className="text-slate-600">Weekend</p>
                  <p className="font-semibold text-slate-500">Closed</p>
                </div>
              </div>
            </div>

            {/* Training */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-mpg-gold/10 to-mpg-gold/5 border border-mpg-gold/30">
              <div className="flex items-start gap-3">
                <BookOpen className="w-6 h-6 text-mpg-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-sm text-mpg-black mb-1">Training Available</h3>
                  <p className="text-xs text-slate-600 mb-3">
                    MPG IT Department offers free training sessions for ward officials and data collectors. Contact us to schedule a training session for your team.
                  </p>
                  <Button size="sm" className="bg-mpg-gold hover:bg-mpg-gold-dark text-mpg-black">
                    Request Training
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Version Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="text-center text-sm text-slate-500">
              <p className="font-semibold text-mpg-black mb-1">Citizen Registry System</p>
              <p>Version 1.0</p>
              <p className="text-xs mt-2">
                © {new Date().getFullYear()} Madang Provincial Government
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
