import { Mail, Phone, MapPin, Globe } from "lucide-react";

export function MPGFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-mpg-black text-white/80 border-t border-mpg-gold/20 mt-8">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/mpg-logo.png"
            alt="Madang Provincial Government"
            className="w-10 h-10 object-contain"
          />
          <div>
            <p className="font-semibold text-mpg-gold">
              Madang Provincial Government
            </p>
            <p className="text-xs text-white/60">Citizen Registry System</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-semibold text-mpg-gold-light mb-2">Contact Us</h3>
            <div className="flex items-center gap-2 text-white/70">
              <Phone className="w-4 h-4" />
              <span>+675 422 2500</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Mail className="w-4 h-4" />
              <span>info@madangprovince.gov.pg</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-mpg-gold-light mb-2">Location</h3>
            <div className="flex items-start gap-2 text-white/70">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span>Madang Provincial Administration<br />Madang, Papua New Guinea</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Globe className="w-4 h-4" />
              <span>www.madangprovince.gov.pg</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-mpg-gold/10 my-4" />

        {/* Copyright and Legal */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/50">
          <p>
            © {currentYear} Madang Provincial Government. All rights reserved.
          </p>
          <p>
            Built with <span className="text-mpg-gold">♥</span> for the people of Madang Province
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="mt-3 p-3 rounded-lg bg-white/5 text-xs text-white/60">
          <p className="font-semibold text-mpg-gold-light mb-1">Privacy Notice</p>
          <p>
            All citizen data is stored securely on your local device. This application
            operates offline and no data is transmitted without your explicit consent.
          </p>
        </div>
      </div>
    </footer>
  );
}
