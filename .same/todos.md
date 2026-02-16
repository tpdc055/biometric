# Citizen Registry PWA - Development Todos

## In Progress
- [ ] Manual testing of complete sync workflow
- [ ] Verifying photo/fingerprint uploads work correctly

## Completed
- [x] **Photo & Fingerprint Upload to Supabase Storage** - Media files now uploaded to cloud
- [x] **Cloud-to-Local Restore Function** - Download and merge data from Supabase
- [x] **Enhanced Sync UI** - Separate Upload and Download buttons with progress tracking
- [x] **Media Download during Restore** - Photos and fingerprints automatically downloaded
- [x] **Madang Provincial Government Branding** - Add MPG logo throughout the application
- [x] **MPG Color Scheme** - Apply gold (#D4AF37) and black theme from logo throughout the app
- [x] **Custom Splash Screen** - Create MPG-branded splash screen for PWA launch
- [x] **MPG Footer** - Add footer with contact information and copyright
- [x] **Multi-language Support** - Implement i18n with Tok Pisin translation
- [x] **Help/Documentation Screen** - Add MPG support and help documentation
- [x] PIN lock screen with 4-6 digit PIN support
- [x] Device biometric authentication support
- [x] Ward/Village setup configuration screen
- [x] Household registration with location tracking
- [x] Citizen registration with all required fields
- [x] Photo capture using phone camera
- [x] Fingerprint capture using phone camera with improved guides
- [x] Search and filter citizens by name, ID, ward, village
- [x] View, edit, and delete citizen records
- [x] CSV export with filtering options
- [x] PWA configuration for offline-first operation
- [x] IndexedDB local storage with Dexie
- [x] Consent recording with timestamp and recorder name
- [x] Sample data loading - Quick start with pre-configured test data
- [x] Enhanced fingerprint capture - Animated guides, tips panel, corner markers
- [x] QR code generation - Generate, download, and share citizen ID cards
- [x] **Bulk CSV Import** - Import citizens from CSV files with validation and column mapping
- [x] **Data Validation & Deduplication** - Real-time duplicate detection during citizen registration
- [x] **Cloud Sync** - Sync data across devices using sync codes or file sharing
- [x] **Offline Map Integration** - Interactive map view for household locations with Leaflet
- [x] **Real-time Multi-device Sync** - BroadcastChannel for tabs + WebSocket infrastructure
- [x] **Data Encryption** - Web Crypto API encryption for sensitive data at rest
- [x] **Analytics Dashboard** - Advanced reporting with interactive charts and statistics
- [x] **Digital Signature** - Canvas-based signature capture for consent forms
- [x] **Supabase Cloud Sync Integration** - Professional cloud backup to Supabase database with Progress UI

## Phase 1 Extensions (Future)
- [ ] Swahili language support (i18n)
- [ ] Multi-device real-time sync server (WebSocket backend)
- [ ] Proper consent form module with legal templates
- [ ] Offline map tile caching
- [ ] PDF export for reports

## Known Issues
- Linter warnings for non-null assertions (expected with Dexie auto-generated IDs)
- Biometric authentication simplified for demo (full WebAuthn flow would be production)
- Array index keys used in some preview lists (acceptable for static preview data)
