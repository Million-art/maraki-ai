# Broadcast Session Fix

## Issue
When admin sends broadcast message but there's no broadcast session, it assumes unknown text instead of handling broadcast properly.

## Root Cause
In `handleAdminCallback` function, when 'broadcast' is selected, the session mode is not set to 'broadcast', so subsequent messages fall through to unknown text handler.

## Tasks
- [x] Fix handleAdminCallback to set session mode to 'broadcast' when broadcast is initiated
- [x] Test the broadcast functionality to ensure it works properly
- [x] Consider adding session cleanup after broadcast completion

## Files to Edit
- src/commands/admin.command.ts
