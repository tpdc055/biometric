# Supabase Cloud Sync Setup Guide

## Overview

The Madang Provincial Government Citizen Registry includes professional cloud backup functionality using Supabase. This allows you to:

- **Backup data to the cloud** - Secure cloud storage for all registration data
- **Sync across devices** - Keep data synchronized across multiple devices
- **Disaster recovery** - Restore data in case of device loss or failure
- **Professional infrastructure** - Enterprise-grade PostgreSQL database

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:
- PostgreSQL database (industry-standard relational database)
- Real-time subscriptions
- Row-level security (RLS)
- Storage for files
- Free tier with generous limits

## Current Setup

### Database Configuration

The application is already connected to a Supabase instance:

- **URL:** `https://agreoumeyvjebhpzxpjf.supabase.co`
- **Project:** Citizen Registry Cloud Backup
- **Region:** Auto-selected by Supabase

### Database Schema

The following tables are set up in Supabase:

1. **wards** - Administrative wards
2. **villages** - Villages within wards
3. **households** - Household units with GPS coordinates
4. **citizens** - Individual citizen records

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Row-level security policies
- Proper foreign key relationships

### Storage Buckets

Two storage buckets for media files:
- **citizen-photos** - Citizen photographs
- **citizen-fingerprints** - Fingerprint images

## How to Use Cloud Sync

### From the Dashboard

1. Look for the "Cloud Sync" button in the top-right corner
2. Click to see sync status and initiate backup
3. The button shows:
   - 🟢 Green = Online and connected
   - 🔴 Gray = Offline or disconnected

### From the Export Screen

1. Navigate to **Dashboard** → **Export & Sync**
2. Scroll to find **"Supabase Cloud Backup"** card (purple)
3. Click **"Open Supabase Sync"**
4. Review your local data summary
5. Click **"Sync to Supabase"** to upload

### Sync Process

The sync process:
1. Checks internet connection
2. Verifies Supabase connectivity
3. Uploads wards (with conflict resolution)
4. Uploads villages
5. Uploads households
6. Uploads citizens
7. Shows progress bar and results

### Data Flow

```
Local IndexedDB → Sync Service → Supabase PostgreSQL
```

- **Create**: New records are inserted
- **Update**: Existing records (matched by code) are updated
- **Merge**: Local and cloud data are intelligently merged

## Security Features

### Data Protection

1. **Row-Level Security (RLS)** - Enabled on all tables
2. **Public Access** - Currently allowed for MVP (can be restricted)
3. **HTTPS** - All communication encrypted in transit
4. **Device ID Tracking** - Each sync records which device uploaded the data

### Authentication

Current setup:
- ✅ Anonymous access (for MVP)
- 🔄 Authentication can be added later for production

### Future Enhancements

For production deployment, consider:
- User authentication (email/password or OAuth)
- Ward-specific access control
- Audit logging
- Data encryption at rest

## Troubleshooting

### "Cannot connect to Supabase"

**Possible causes:**
1. No internet connection
2. Supabase service is down
3. Firewall blocking connection

**Solutions:**
- Check internet connection
- Try again in a few minutes
- Check Supabase status at status.supabase.com

### "Sync completed with errors"

**Common issues:**
1. Duplicate codes (ward/village/household codes must be unique)
2. Missing parent records (e.g., village without ward)
3. Data validation errors

**Solutions:**
- Review error messages in sync results
- Fix data issues locally
- Retry sync

### Slow sync performance

**Reasons:**
- Slow internet connection
- Large number of records
- Large photo/fingerprint files

**Tips:**
- Sync during off-peak hours
- Export photos separately if needed
- Sync in smaller batches by ward

## Best Practices

### Regular Backups

- ✅ **Daily backups** recommended for active data collection
- ✅ **After major events** (e.g., bulk registration)
- ✅ **Before device maintenance** or software updates

### Data Management

1. **Clean data before syncing** - Fix duplicates and errors
2. **Test with small datasets** first
3. **Keep local backup** - Use Export feature as well
4. **Monitor sync results** - Check for errors

### Team Coordination

For multi-device teams:
1. **Designate a primary device** for initial setup (wards/villages)
2. **Regular sync schedule** (e.g., end of each day)
3. **Communicate changes** to ward/village structures
4. **Resolve conflicts** manually if needed

## Data Privacy & Compliance

### Data Storage

- **Location**: Supabase servers (cloud-hosted PostgreSQL)
- **Jurisdiction**: Depends on region selected
- **Retention**: Data persists until manually deleted
- **Backup**: Supabase provides automated backups

### Sensitive Data

⚠️ **Important Considerations:**
- Citizen photos and fingerprints contain biometric data
- Personal information (names, dates of birth, phone numbers)
- Disability and health information

**Recommendations:**
1. **Legal compliance** - Ensure compliance with PNG data protection laws
2. **Consent required** - Always obtain citizen consent before upload
3. **Access control** - Limit who can access Supabase dashboard
4. **Encryption** - Enable encryption settings in the app

### GDPR & Data Rights

While PNG may not be subject to GDPR, good data practices include:
- **Right to access** - Citizens can request their data
- **Right to deletion** - Ability to remove citizen records
- **Data minimization** - Only collect necessary information
- **Purpose limitation** - Use data only for stated purposes

## Technical Details

### API Configuration

Located in `src/lib/supabase.ts`:
```typescript
const supabaseUrl = 'https://agreoumeyvjebhpzxpjf.supabase.co';
const supabaseAnonKey = '[PUBLIC KEY - Safe to expose]';
```

### Sync Implementation

Located in `src/lib/supabaseSync.ts`:
- Converts local Dexie records to Supabase format
- Handles UUID generation and mapping
- Manages foreign key relationships
- Provides progress tracking

### Database Migrations

SQL schema in `supabase/migrations/001_initial_schema.sql`:
- Creates all tables with proper types
- Sets up indexes for performance
- Configures RLS policies
- Creates storage buckets

## Support & Resources

### Documentation

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **API Reference**: Available in Supabase dashboard

### MPG Support

For help with cloud sync:
- **Email**: ict@madangprovince.gov.pg
- **Phone**: +675 422 2500
- **Office**: Madang Provincial Administration

### Community

- **Report Issues**: Contact MPG IT Department
- **Feature Requests**: Submit to MPG for consideration
- **Training**: Available from MPG IT team

## Cost Considerations

### Supabase Free Tier

Includes:
- ✅ 500MB database storage
- ✅ 1GB file storage
- ✅ 50,000 monthly active users
- ✅ 2GB bandwidth
- ✅ Social OAuth providers

### Estimated Usage

For Madang Province:
- **Citizens**: ~500KB per 10,000 records (without photos)
- **Photos**: ~500KB each (at recommended 800x800px)
- **Total**: Likely within free tier for several wards

### Paid Plans

If needed:
- **Pro**: $25/month (8GB database, 100GB storage)
- **Team**: $599/month (larger projects)
- **Enterprise**: Custom pricing

## Conclusion

The Supabase cloud sync feature provides:
- ✅ Professional-grade cloud backup
- ✅ Multi-device synchronization
- ✅ Disaster recovery capability
- ✅ Scalable infrastructure
- ✅ Free for small to medium deployments

It's an excellent complement to the offline-first architecture, providing the best of both worlds: local speed and reliability with cloud backup and sharing.

---

**Last Updated**: February 16, 2026
**Version**: 1.0
**Contact**: Madang Provincial Government IT Department
