# Testing Guide - Supabase Cloud Sync

## Prerequisites

Before testing, ensure:
- ✅ Internet connection is active
- ✅ Supabase project is configured and accessible
- ✅ App is running locally or deployed
- ✅ Browser console is open for debugging (F12)

## Test 1: Initial Setup

**Objective**: Create a new PIN and load sample data

### Steps:
1. Open the app (clear browser data if needed)
2. Create a 4-6 digit PIN (e.g., 123456)
3. Confirm the PIN
4. Navigate to Setup screen (Settings icon)
5. Click "Load Sample Data"
6. Wait for success message
7. Return to Dashboard

### Expected Results:
- ✅ PIN creation succeeds
- ✅ Sample data loads (wards, villages, households, citizens)
- ✅ Dashboard shows statistics:
  - 3 Wards
  - 9 Villages
  - 15 Households
  - 25-30 Citizens
- ✅ Recent registrations appear with photos

### Troubleshooting:
- If PIN creation fails → Check browser storage isn't full
- If sample data fails → Check console for database errors

---

## Test 2: Upload to Supabase (Initial Sync)

**Objective**: Upload all local data to Supabase cloud

### Steps:
1. From Dashboard, click "Cloud Sync" button (top-right)
2. Verify connection status shows "Connected to Supabase"
3. Review local data summary (should show all loaded data)
4. Click "Upload" button
5. Watch progress bar (0% → 100%)
6. Review sync results

### Expected Results:
- ✅ Connection status: Green "Connected to Supabase"
- ✅ Progress bar animates smoothly
- ✅ Success message: "Successfully synced X records to Supabase"
- ✅ Sync results show:
  - Uploaded: 3 wards
  - Uploaded: 9 villages
  - Uploaded: 15 households
  - Uploaded: 25-30 citizens
- ✅ No errors listed
- ✅ Last sync timestamp updates

### Verify in Supabase Dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to Table Editor
4. Check tables:
   - `wards` → Should have 3 rows
   - `villages` → Should have 9 rows
   - `households` → Should have 15 rows
   - `citizens` → Should have 25-30 rows
5. Check Storage → Buckets:
   - `citizen-photos` → Should have ~15-20 photos
   - `citizen-fingerprints` → Should have ~10-15 fingerprints

### Troubleshooting:
- If "Supabase Unreachable" → Check internet, try refreshing
- If upload fails → Check browser console for API errors
- If partial upload → Review error messages, retry

---

## Test 3: Photo & Fingerprint Upload

**Objective**: Verify media files are uploaded to Supabase Storage

### Steps:
1. From Dashboard, navigate to "Register Citizen"
2. Select Ward, Village, and Household
3. Capture a photo (tap photo box, allow camera, take photo)
4. Capture a fingerprint (tap fingerprint box, allow camera, take photo)
5. Fill in citizen details (name, sex, age)
6. Check consent checkbox
7. Save citizen
8. Go to Export & Sync screen
9. Open Supabase Sync
10. Click "Upload"
11. Wait for completion

### Expected Results:
- ✅ Photo and fingerprint captured successfully
- ✅ Citizen saved with images
- ✅ Upload shows 1 new citizen synced
- ✅ In Supabase Storage:
  - New photo file appears in `citizen-photos` bucket
  - New fingerprint file appears in `citizen-fingerprints` bucket
- ✅ In Supabase Table Editor:
  - New citizen record has `photo_url` and `fingerprint_url` populated
  - URLs are valid (click to preview)

### Verify Media Files:
1. Supabase Dashboard → Storage
2. Click `citizen-photos` bucket
3. Find file named `[CITIZEN-ID]-[TIMESTAMP].jpg`
4. Click "Preview" → Should show the captured photo
5. Repeat for `citizen-fingerprints` bucket

### Troubleshooting:
- If photos don't upload → Check browser console for storage errors
- If URLs are null → Check storage bucket permissions (RLS policies)
- If upload slow → Large photos, consider compression

---

## Test 4: Download from Supabase (Restore)

**Objective**: Download cloud data to a fresh local database

### Steps:
1. **Clear local data** (simulate new device):
   - Option A: Use different browser profile
   - Option B: Clear browser data for the site
   - Option C: Use incognito/private mode
2. Open app and create new PIN
3. Skip setup (or create minimal setup)
4. Navigate to Export & Sync
5. Open Supabase Sync
6. Click "Download" button
7. Confirm the action (dialog appears)
8. Watch progress bar
9. Review results

### Expected Results:
- ✅ Confirmation dialog: "This will download all data from Supabase..."
- ✅ Progress bar shows download progress
- ✅ Success message: "Successfully restored X records from Supabase"
- ✅ Sync results show:
  - Downloaded: 3 wards
  - Downloaded: 9 villages
  - Downloaded: 15 households
  - Downloaded: 25-30 citizens
- ✅ Dashboard now shows all statistics updated
- ✅ Recent registrations appear with restored photos
- ✅ Search screen shows all citizens with photos

### Verify Downloaded Data:
1. Dashboard → Should show same stats as original
2. Search Records → Find a citizen
3. View citizen details → Photo should display
4. Verify fingerprint is also present
5. Navigate to Households → All households restored
6. Check Setup → Wards and villages restored

### Troubleshooting:
- If download fails → Check internet connection
- If photos missing → Check storage permissions
- If data partially restored → Check error messages, retry

---

## Test 5: Bi-Directional Sync

**Objective**: Test data merging between local and cloud

### Setup:
You'll need TWO browsers or devices (Device A and Device B)

### Device A - Initial Upload:
1. Load sample data
2. Upload to Supabase
3. Add 2 new citizens locally (don't sync yet)

### Device B - Initial Download:
1. Create PIN
2. Download from Supabase
3. Verify it has the sample data
4. Add 2 different new citizens locally
5. Upload to Supabase

### Device A - Sync Again:
1. Upload local changes (2 new citizens)
2. Then Download from cloud
3. Verify you now have:
   - Original sample data
   - Your 2 citizens
   - Device B's 2 citizens
   - Total: 29-34 citizens

### Expected Results:
- ✅ No duplicate wards/villages/households
- ✅ All citizens from both devices present
- ✅ Upload counts: New records created
- ✅ Download counts: Merged successfully
- ✅ No data loss
- ✅ Photos from both devices intact

### Troubleshooting:
- If duplicates appear → Check unique ID generation
- If data overwritten → Check update logic
- If conflicts → Review error messages

---

## Test 6: Offline Behavior

**Objective**: Verify app handles offline state gracefully

### Steps:
1. With data loaded, go to Supabase Sync
2. Verify connection shows "Connected"
3. Disconnect internet (airplane mode or disable network)
4. Refresh the Supabase Sync dialog
5. Attempt to upload
6. Reconnect internet
7. Retry upload

### Expected Results:
- ✅ Status changes to "Offline"
- ✅ Connection indicator shows gray/offline
- ✅ Upload button disabled
- ✅ Error toast: "No internet connection"
- ✅ After reconnecting: Status becomes "Connected to Supabase"
- ✅ Upload succeeds after reconnection
- ✅ Local data remains intact throughout

### Troubleshooting:
- If status doesn't update → Refresh page
- If uploads attempted offline → Check network detection logic

---

## Test 7: Error Handling

**Objective**: Verify graceful handling of errors

### Test Cases:

#### A. Invalid Data:
1. Manually edit database (browser dev tools → Application → IndexedDB)
2. Corrupt a ward code (make it null or invalid)
3. Try to upload
4. **Expected**: Error message lists the problematic ward

#### B. Storage Full:
1. Try uploading very large photos (>1MB each)
2. Upload many citizens with photos
3. **Expected**: May fail if exceeding free tier limits
4. Error should indicate storage issue

#### C. Network Interruption:
1. Start upload
2. Immediately disconnect internet mid-sync
3. **Expected**: Some records uploaded, errors for failures
4. Can retry to complete

### Expected Results for All:
- ✅ Clear error messages
- ✅ Partial success is reported (not all-or-nothing)
- ✅ Can retry failed operations
- ✅ No data corruption
- ✅ App remains functional

---

## Test 8: Large Dataset Performance

**Objective**: Test with realistic data volumes

### Steps:
1. Use sample data as base
2. Navigate to Export → CSV Import
3. Create a CSV with 100+ citizens
4. Import the CSV
5. Upload to Supabase
6. Measure time and check for issues

### Expected Results:
- ✅ Upload completes within reasonable time
  - 100 citizens: <30 seconds
  - 500 citizens: <2 minutes
  - 1000 citizens: <5 minutes
- ✅ Progress bar updates consistently
- ✅ No browser freeze or crash
- ✅ All records uploaded successfully
- ✅ Memory usage reasonable

### Performance Benchmarks:
| Records | Expected Time | Status |
|---------|--------------|--------|
| 50      | <15s         | Fast   |
| 100     | <30s         | Good   |
| 500     | <2min        | OK     |
| 1000    | <5min        | Slow   |

### Troubleshooting:
- If very slow → May need batching for large datasets
- If browser freezes → Reduce batch size
- If timeouts → Check Supabase rate limits

---

## Test 9: Data Integrity

**Objective**: Ensure no data loss or corruption

### Steps:
1. Before upload, export local data as CSV
2. Upload to Supabase
3. Clear local database
4. Download from Supabase
5. Export restored data as CSV
6. Compare both CSV files

### Expected Results:
- ✅ All citizens present in both CSVs
- ✅ Names, ages, dates match
- ✅ Photos present and viewable
- ✅ Household assignments correct
- ✅ Ward/Village relationships preserved
- ✅ Consent and metadata intact

### Verification Checklist:
- [ ] Same number of records
- [ ] No duplicate citizens
- [ ] All photos downloadable
- [ ] All fingerprints downloadable
- [ ] Dates formatted correctly
- [ ] Foreign keys intact
- [ ] Notes and custom fields preserved

---

## Test 10: Quick Sync Button (Dashboard)

**Objective**: Test the quick access sync button

### Steps:
1. From Dashboard, locate sync button (top-right)
2. Button should show cloud icon with status color
3. Click the button
4. Supabase Sync dialog should open
5. Perform upload or download
6. Close dialog
7. Verify button status updates

### Expected Results:
- ✅ Button shows online/offline status
- ✅ Green icon when connected
- ✅ Gray icon when offline
- ✅ Clicking opens Supabase Sync dialog
- ✅ Same functionality as from Export screen
- ✅ Last sync time updates in dialog

---

## Common Issues & Solutions

### Issue: "Cannot connect to Supabase"
**Solutions:**
1. Check internet connection
2. Verify Supabase project is active
3. Check browser console for CORS errors
4. Refresh the page
5. Try different browser

### Issue: Photos not uploading
**Solutions:**
1. Check storage bucket exists: `citizen-photos`
2. Verify RLS policies allow public insert
3. Check file size (<5MB recommended)
4. Verify Supabase storage quota not exceeded
5. Check browser console for errors

### Issue: Download shows 0 records
**Solutions:**
1. Verify data exists in Supabase (check Table Editor)
2. Check if upload was successful
3. Look for error messages
4. Try uploading first, then downloading

### Issue: Sync very slow
**Solutions:**
1. Check internet speed
2. Reduce photo sizes (compress before upload)
3. Sync in smaller batches (by ward)
4. Check Supabase dashboard for performance issues

### Issue: Duplicates after sync
**Solutions:**
1. Review unique ID generation logic
2. Check code matching logic
3. May need to clear data and re-sync
4. Check for timing issues (multiple syncs overlapping)

---

## Success Criteria

All tests should achieve:
- ✅ 100% data integrity (no loss, no corruption)
- ✅ Clear user feedback (progress, errors, success)
- ✅ Performance acceptable for daily use
- ✅ Graceful offline handling
- ✅ Proper error recovery
- ✅ Photos and fingerprints working correctly
- ✅ Bi-directional sync without conflicts

---

## Reporting Issues

When reporting bugs, include:
1. **Test number** and step where it failed
2. **Browser** and version
3. **Error messages** from sync dialog
4. **Console errors** (F12 → Console)
5. **Network tab** (F12 → Network) - any failed requests
6. **Data state** - how many records before sync
7. **Screenshots** of error states

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Document any edge cases discovered
2. ✅ Create user training materials
3. ✅ Deploy to production environment
4. ✅ Set up monitoring and alerts
5. ✅ Plan for scale (if needed)
6. ✅ Consider adding authentication
7. ✅ Implement role-based access control

---

**Testing Completed By**: _________________
**Date**: _________________
**Overall Status**: ⬜ Pass ⬜ Pass with Issues ⬜ Fail
**Notes**:





---

**Document Version**: 1.0
**Last Updated**: February 16, 2026
